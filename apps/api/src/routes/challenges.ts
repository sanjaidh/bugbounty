/**
 * Challenge Routes
 * GET  /api/challenges           — List all challenges with participant's progress
 * GET  /api/challenges/:id       — Get challenge detail + content (if unlocked)
 * GET  /api/challenges/:id/flag  — Get personal HMAC flag (stage 8 only, if unlocked)
 * POST /api/challenges/:id/submit — Submit a flag/answer
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const ChallengeStatus = {
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  SOLVED: "SOLVED",
} as const;
import { authenticate } from "../middleware/auth";
import { submissionRateLimit } from "../middleware/rateLimitMiddleware";
import { isCompetitionActiveRuntime } from "../services/competitionState";
import { verifyAnswer, verifyFinalFlag, generateFinalFlag } from "../services/flagService";
import { io } from "../index";
import { logger } from "../utils/logger";
import { broadcastLeaderboard } from "../socket/leaderboardSocket";

export const challengeRouter = Router();
const prisma = new PrismaClient();

function isCompetitionActive(): boolean {
  return isCompetitionActiveRuntime();
}

// ─── List Challenges ──────────────────────────────────────────────────────────

challengeRouter.get("/", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [challenges, participantProgress] = await Promise.all([
      prisma.challenge.findMany({
        where: { isActive: true },
        orderBy: { stageNumber: "asc" },
        select: {
          id: true,
          stageNumber: true,
          title: true,
          type: true,
          description: true,
          points: true,
          hintText: true,
          // Don't expose answerHash or finalBaseCode to frontend
        },
      }),
      prisma.participantChallenge.findMany({
        where: { userId },
        select: {
          challengeId: true,
          status: true,
          attempts: true,
          solvedAt: true,
          lockedUntil: true,
        },
      }),
    ]);

    const progressMap = new Map(participantProgress.map((p) => [p.challengeId, p]));

    const result = challenges.map((c) => {
      const progress = progressMap.get(c.id);
      return {
        ...c,
        status: progress?.status ?? ChallengeStatus.LOCKED,
        attempts: progress?.attempts ?? 0,
        solvedAt: progress?.solvedAt ?? null,
        lockedUntil: progress?.lockedUntil ?? null,
      };
    });

    res.json({ challenges: result, competitionActive: isCompetitionActive() });
  } catch (err) {
    logger.error("List challenges error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Challenge Detail ─────────────────────────────────────────────────────

challengeRouter.get("/:id", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const challengeId = req.params.id;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        stageNumber: true,
        title: true,
        type: true,
        description: true,
        hintText: true,
        contentUrl: true,
        contentHtml: true,
        points: true,
        maxAttempts: true,
        cooldownMins: true,
      },
    });

    if (!challenge || !challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    const progress = await prisma.participantChallenge.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });

    const status = progress?.status ?? ChallengeStatus.LOCKED;

    // Only return content if unlocked or solved
    const content =
      status !== ChallengeStatus.LOCKED
        ? {
            contentUrl: challenge.contentUrl,
            contentHtml: challenge.contentHtml,
          }
        : { contentUrl: null, contentHtml: null };

    res.json({
      challenge: {
        ...challenge,
        ...content,
        status,
        attempts: progress?.attempts ?? 0,
        solvedAt: progress?.solvedAt ?? null,
        lockedUntil: progress?.lockedUntil ?? null,
      },
    });
  } catch (err) {
    logger.error("Get challenge error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Personal Flag (Stage 8 only) ────────────────────────────────────────

challengeRouter.get(
  "/:id/flag",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const challengeId = req.params.id;

      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        select: { stageNumber: true, finalBaseCode: true },
      });

      if (!challenge) {
        res.status(404).json({ error: "Challenge not found" });
        return;
      }

      if (challenge.stageNumber !== 8) {
        res.status(400).json({ error: "Personal flag only available for the final stage" });
        return;
      }

      const progress = await prisma.participantChallenge.findUnique({
        where: { userId_challengeId: { userId, challengeId } },
      });

      if (!progress || progress.status === ChallengeStatus.LOCKED) {
        res.status(403).json({ error: "Complete previous stages to unlock this challenge" });
        return;
      }

      if (!challenge.finalBaseCode || challenge.finalBaseCode.startsWith("REPLACE_WITH")) {
        res.status(503).json({
          error: "Final stage not yet configured by admin. Check back soon.",
        });
        return;
      }

      const flag = generateFinalFlag(userId, challengeId, challenge.finalBaseCode);
      res.json({ flag });
    } catch (err) {
      logger.error("Get flag error", { error: (err as Error).message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Submit Flag ──────────────────────────────────────────────────────────────

const submitSchema = z.object({
  answer: z.string().min(1).max(512).trim(),
});

challengeRouter.post(
  "/:id/submit",
  authenticate,
  submissionRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const challengeId = req.params.id;
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip;
    const userAgent = req.headers["user-agent"] || null;

    if (!isCompetitionActive()) {
      res.status(403).json({ error: "Competition is not currently active" });
      return;
    }

    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid submission" });
      return;
    }

    const { answer } = parsed.data;

    try {
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId, isActive: true },
      });

      if (!challenge) {
        res.status(404).json({ error: "Challenge not found" });
        return;
      }

      // Get or create progress record
      let progress = await prisma.participantChallenge.findUnique({
        where: { userId_challengeId: { userId, challengeId } },
      });

      if (!progress || progress.status === ChallengeStatus.LOCKED) {
        res.status(403).json({ error: "This stage is locked. Complete previous stages first." });
        return;
      }

      if (progress.status === ChallengeStatus.SOLVED) {
        res.status(409).json({ error: "You already solved this challenge", alreadySolved: true });
        return;
      }

      // Check cooldown
      if (progress.lockedUntil && progress.lockedUntil > new Date()) {
        const remainingSecs = Math.ceil(
          (progress.lockedUntil.getTime() - Date.now()) / 1000
        );
        res.status(429).json({
          error: `Too many wrong attempts. Try again in ${remainingSecs} seconds.`,
          lockedUntil: progress.lockedUntil,
        });
        return;
      }

      // ─── Verify flag ───────────────────────────────────────────────────────

      let isCorrect = false;

      if (challenge.answerHash) {
        // Standard answer hash comparison (works for all stages including stage 8)
        isCorrect = verifyAnswer(answer, challenge.answerHash);
      } else if (challenge.stageNumber === 8 && challenge.finalBaseCode) {
        // Fallback for HMAC if finalBaseCode is configured
        isCorrect = verifyFinalFlag(answer, userId, challengeId, challenge.finalBaseCode);
      } else {
        res.status(503).json({ error: "Challenge answer not configured yet" });
        return;
      }

      // ─── Record submission ─────────────────────────────────────────────────

      await prisma.submission.create({
        data: {
          userId,
          challengeId,
          submittedFlag: isCorrect ? "[CORRECT - REDACTED]" : answer.substring(0, 128),
          isCorrect,
          ipAddress: ip ?? null,
          userAgent,
        },
      });

      // ─── Update progress ───────────────────────────────────────────────────

      if (isCorrect) {
        await prisma.participantChallenge.update({
          where: { userId_challengeId: { userId, challengeId } },
          data: {
            status: ChallengeStatus.SOLVED,
            solvedAt: new Date(),
            lockedUntil: null,
          },
        });

        // Unlock next stage
        const nextChallenge = await prisma.challenge.findFirst({
          where: { stageNumber: challenge.stageNumber + 1, isActive: true },
        });

        if (nextChallenge) {
          await prisma.participantChallenge.upsert({
            where: { userId_challengeId: { userId, challengeId: nextChallenge.id } },
            update: { status: ChallengeStatus.UNLOCKED },
            create: {
              userId,
              challengeId: nextChallenge.id,
              status: ChallengeStatus.UNLOCKED,
            },
          });
        }

        // Broadcast leaderboard update & global solve alert
        await broadcastLeaderboard(io);
        
        const solvingUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { team: true },
        });

        io.emit("solve:event", {
          username: solvingUser?.username || "Player",
          teamName: solvingUser?.team?.name || solvingUser?.username || "Player",
          stageNumber: challenge.stageNumber,
          challengeTitle: challenge.title,
          points: challenge.points,
          solvedAt: new Date(),
        });

        logger.info("Challenge solved", {
          userId,
          challengeId,
          stage: challenge.stageNumber,
          points: challenge.points,
        });

        res.json({
          correct: true,
          points: challenge.points,
          message: `Correct! +${challenge.points} points`,
          nextStage: nextChallenge
            ? { id: nextChallenge.id, title: nextChallenge.title }
            : null,
          competitionComplete: !nextChallenge,
        });
      } else {
        const newAttempts = (progress.attempts || 0) + 1;
        const hitMaxAttempts = newAttempts >= challenge.maxAttempts;

        await prisma.participantChallenge.update({
          where: { userId_challengeId: { userId, challengeId } },
          data: {
            attempts: newAttempts,
            lockedUntil: hitMaxAttempts
              ? new Date(Date.now() + challenge.cooldownMins * 60 * 1000)
              : null,
          },
        });

        logger.warn("Wrong flag submitted", {
          userId,
          challengeId,
          stage: challenge.stageNumber,
          attempt: newAttempts,
        });

        res.json({
          correct: false,
          message: hitMaxAttempts
            ? `Wrong. Too many attempts — ${challenge.cooldownMins} minute cooldown active.`
            : `Incorrect answer. Attempt ${newAttempts}/${challenge.maxAttempts}.`,
          attempts: newAttempts,
          maxAttempts: challenge.maxAttempts,
        });
      }
    } catch (err) {
      logger.error("Submit flag error", { error: (err as Error).message });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Initialize challenges for a new participant (called on login) ─────────────

export async function initParticipantProgress(userId: string): Promise<void> {
  const stage1 = await prisma.challenge.findFirst({
    where: { stageNumber: 1, isActive: true },
  });

  if (!stage1) return;

  await prisma.participantChallenge.upsert({
    where: { userId_challengeId: { userId, challengeId: stage1.id } },
    update: {},
    create: { userId, challengeId: stage1.id, status: "UNLOCKED" },
  });
}
