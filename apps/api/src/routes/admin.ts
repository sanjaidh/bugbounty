/**
 * Admin Routes (all require ADMIN role)
 * POST /api/admin/users                  — Create participant/team
 * GET  /api/admin/users                  — List all participants
 * PATCH /api/admin/users/:id             — Update user (activate/deactivate)
 * DELETE /api/admin/users/:id            — Delete user
 * POST /api/admin/users/:id/reset        — Reset participant's challenge progress
 * GET  /api/admin/teams                  — List all teams
 * POST /api/admin/teams                  — Create team
 * GET  /api/admin/challenges             — List all challenges (including inactive)
 * PATCH /api/admin/challenges/:id        — Update a challenge (answers, content, etc.)
 * GET  /api/admin/submissions            — All flag submissions (audit log)
 * GET  /api/admin/stats                  — Event statistics
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { hashAnswer } from "../services/flagService";
import { logger } from "../utils/logger";
import { getCompetitionConfig, updateCompetitionConfig, isCompetitionActiveRuntime } from "../services/competitionState";
import { broadcastCompetitionStatus } from "../socket/leaderboardSocket";

export const adminRouter = Router();
const prisma = new PrismaClient();

adminRouter.use(authenticate, adminOnly);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function auditLog(adminId: string, action: string, metadata?: object) {
  await prisma.auditLog.create({
    data: { adminId, action, metadata: metadata ? JSON.stringify(metadata) : undefined },
  });
}

// ─── Teams ────────────────────────────────────────────────────────────────────

adminRouter.get("/teams", async (_req: Request, res: Response): Promise<void> => {
  const teams = await prisma.team.findMany({
    include: { members: { select: { id: true, username: true, email: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ teams });
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(64),
});

adminRouter.post("/teams", async (req: Request, res: Response): Promise<void> => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid team data", details: parsed.error.issues });
    return;
  }
  try {
    const team = await prisma.team.create({ data: { name: parsed.data.name } });
    await auditLog(req.user!.userId, "CREATE_TEAM", { teamId: team.id, name: team.name });
    res.status(201).json({ team });
  } catch {
    res.status(409).json({ error: "Team name already exists" });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────

adminRouter.get("/users", async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    include: {
      team: { select: { id: true, name: true } },
      progress: {
        where: { status: "SOLVED" },
        select: { challengeId: true, solvedAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    team: u.team,
    isActive: u.isActive,
    solvedCount: u.progress.length,
    createdAt: u.createdAt,
  }));

  res.json({ users: result });
});

const createUserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  teamId: z.string().optional(),
});

adminRouter.post("/users", async (req: Request, res: Response): Promise<void> => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user data", details: parsed.error.issues });
    return;
  }

  const { username, email, password, teamId } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    // Find stage 1 to initialize progress
    const stage1 = await prisma.challenge.findFirst({ where: { stageNumber: 1 } });

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: "PARTICIPANT",
        teamId: teamId || null,
        progress: stage1
          ? {
              create: {
                challengeId: stage1.id,
                status: "UNLOCKED",
              },
            }
          : undefined,
      },
      include: { team: { select: { name: true } } },
    });

    await auditLog(req.user!.userId, "CREATE_USER", { userId: user.id, username });
    logger.info("Participant created", { username, adminId: req.user!.userId });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        team: user.team,
      },
    });
  } catch {
    res.status(409).json({ error: "Username or email already exists" });
  }
});

adminRouter.patch("/users/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive, teamId } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof isActive === "boolean" ? { isActive } : {}),
      ...(teamId !== undefined ? { teamId: teamId || null } : {}),
    },
  });

  await auditLog(req.user!.userId, "UPDATE_USER", { userId: id, isActive, teamId });
  res.json({ user: { id: user.id, username: user.username, isActive: user.isActive } });
});

adminRouter.post("/users/:id/reset", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const stage1 = await prisma.challenge.findFirst({ where: { stageNumber: 1 } });

  await prisma.participantChallenge.deleteMany({ where: { userId: id } });
  await prisma.submission.deleteMany({ where: { userId: id } });

  if (stage1) {
    await prisma.participantChallenge.create({
      data: { userId: id, challengeId: stage1.id, status: "UNLOCKED" },
    });
  }

  await auditLog(req.user!.userId, "RESET_USER_PROGRESS", { targetUserId: id });
  res.json({ message: "Progress reset" });
});

// ─── Challenges ───────────────────────────────────────────────────────────────

adminRouter.get("/challenges", async (_req: Request, res: Response): Promise<void> => {
  const challenges = await prisma.challenge.findMany({
    orderBy: { stageNumber: "asc" },
    select: {
      id: true,
      stageNumber: true,
      title: true,
      type: true,
      description: true,
      hintText: true,
      contentUrl: true,
      points: true,
      isActive: true,
      maxAttempts: true,
      cooldownMins: true,
      // Show whether answers are configured
      answerHash: true,
      finalBaseCode: true,
      _count: { select: { submissions: true, progress: true } },
    },
  });

  const result = challenges.map((c) => ({
    ...c,
    answerConfigured:
      c.answerHash !== null && !c.answerHash?.startsWith("REPLACE_WITH"),
    finalBaseConfigured:
      c.finalBaseCode !== null && !c.finalBaseCode?.startsWith("REPLACE_WITH"),
    // Don't send raw hashes to frontend
    answerHash: undefined,
    finalBaseCode: undefined,
  }));

  res.json({ challenges: result });
});


const createChallengeSchema = z.object({
  stageNumber: z.number().int().positive().optional(),
  title: z.string().min(1),
  type: z.string().default("WEB"),
  description: z.string().min(1),
  hintText: z.string().optional(),
  contentUrl: z.string().optional(),
  contentHtml: z.string().optional(),
  points: z.number().positive().default(100),
  maxAttempts: z.number().min(1).default(5),
  cooldownMins: z.number().min(1).default(5),
  plainAnswer: z.string().optional(),
  finalBaseCode: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateChallengeSchema = createChallengeSchema.partial();

adminRouter.post("/challenges", async (req: Request, res: Response): Promise<void> => {
  const parsed = createChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid challenge data", details: parsed.error.issues });
    return;
  }

  const data = parsed.data;

  // Determine stage number if not specified
  let stageNumber = data.stageNumber;
  if (!stageNumber) {
    const maxStage = await prisma.challenge.aggregate({ _max: { stageNumber: true } });
    stageNumber = (maxStage._max.stageNumber || 0) + 1;
  }

  const answerHash = data.plainAnswer ? hashAnswer(data.plainAnswer) : undefined;

  try {
    const challenge = await prisma.challenge.create({
      data: {
        stageNumber,
        title: data.title,
        type: data.type,
        description: data.description,
        hintText: data.hintText || null,
        contentUrl: data.contentUrl || null,
        contentHtml: data.contentHtml || null,
        points: data.points,
        maxAttempts: data.maxAttempts,
        cooldownMins: data.cooldownMins,
        isActive: data.isActive,
        answerHash,
        finalBaseCode: data.finalBaseCode || null,
      },
    });

    await auditLog(req.user!.userId, "CREATE_CHALLENGE", { challengeId: challenge.id, title: challenge.title, stageNumber });

    res.status(201).json({ challenge });
  } catch (err: any) {
    res.status(409).json({ error: `Stage number ${stageNumber} already exists or invalid data.` });
  }
});

adminRouter.patch("/challenges/:id", async (req: Request, res: Response): Promise<void> => {
  const parsed = updateChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    return;
  }

  const { plainAnswer, finalBaseCode, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest };
  if (plainAnswer) {
    updateData.answerHash = hashAnswer(plainAnswer);
  }
  if (finalBaseCode) {
    updateData.finalBaseCode = finalBaseCode;
  }

  const challenge = await prisma.challenge.update({
    where: { id: req.params.id },
    data: updateData,
  });

  await auditLog(req.user!.userId, "UPDATE_CHALLENGE", {
    challengeId: req.params.id,
    fields: Object.keys(updateData),
  });

  res.json({ challenge: { id: challenge.id, title: challenge.title } });
});

const reorderChallengesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

adminRouter.post("/challenges/reorder", async (req: Request, res: Response): Promise<void> => {
  const parsed = reorderChallengesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid reorder payload", details: parsed.error.issues });
    return;
  }

  const { orderedIds } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Step 1: Assign temporary negative stageNumbers to avoid unique constraint violations
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.challenge.update({
          where: { id: orderedIds[i] },
          data: { stageNumber: -(i + 1000) },
        });
      }
      // Step 2: Assign final positive stageNumbers 1..N
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.challenge.update({
          where: { id: orderedIds[i] },
          data: { stageNumber: i + 1 },
        });
      }
    });

    await auditLog(req.user!.userId, "REORDER_CHALLENGES", { orderedIds });
    res.json({ message: "Challenges reordered successfully" });
  } catch (err: any) {
    logger.error("Failed to reorder challenges", err);
    res.status(500).json({ error: err.message || "Failed to reorder challenges" });
  }
});

// ─── Competition Control & Countdown Config ───────────────────────────────────

adminRouter.get("/competition", async (_req: Request, res: Response): Promise<void> => {
  const config = getCompetitionConfig();
  res.json({
    config,
    isCurrentlyActive: isCompetitionActiveRuntime(),
  });
});


const competitionSchema = z.object({
  forceState: z.enum(["AUTO", "ACTIVE", "PAUSED", "STOPPED"]).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

adminRouter.post("/competition", async (req: Request, res: Response): Promise<void> => {
  const parsed = competitionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid competition data" });
    return;
  }

  const updatedConfig = updateCompetitionConfig(parsed.data);
  const isActive = isCompetitionActiveRuntime();
  await auditLog(req.user!.userId, "UPDATE_COMPETITION_CONFIG", parsed.data);

  // Broadcast to all connected socket clients
  const { io } = require("../index");
  if (io) {
    broadcastCompetitionStatus(io, {
      isActive,
      forceState: updatedConfig.forceState,
      startTime: updatedConfig.startTime,
      endTime: updatedConfig.endTime,
      serverTime: new Date().toISOString(),
    });
  }

  res.json({
    config: updatedConfig,
    isCurrentlyActive: isActive,
  });
});

// ─── Submissions Audit Log ────────────────────────────────────────────────────

adminRouter.get("/submissions", async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true, team: { select: { name: true } } } },
        challenge: { select: { stageNumber: true, title: true } },
      },
    }),
    prisma.submission.count(),
  ]);

  res.json({
    submissions: submissions.map((s) => ({
      id: s.id,
      participant: s.user.username,
      team: s.user.team?.name ?? null,
      stage: s.challenge.stageNumber,
      challengeTitle: s.challenge.title,
      isCorrect: s.isCorrect,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ─── Stats ────────────────────────────────────────────────────────────────────

adminRouter.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  const [
    totalParticipants,
    totalTeams,
    totalSubmissions,
    correctSubmissions,
    solvedByStage,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.team.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { isCorrect: true } }),
    prisma.participantChallenge.groupBy({
      by: ["challengeId"],
      where: { status: "SOLVED" },
      _count: true,
    }),
  ]);

  const challenges = await prisma.challenge.findMany({
    select: { id: true, stageNumber: true, title: true },
  });

  const challengeMap = new Map(challenges.map((c) => [c.id, c]));

  res.json({
    totalParticipants,
    totalTeams,
    totalSubmissions,
    correctSubmissions,
    accuracy:
      totalSubmissions > 0
        ? ((correctSubmissions / totalSubmissions) * 100).toFixed(1) + "%"
        : "N/A",
    solvedByStage: solvedByStage.map((s) => ({
      stage: challengeMap.get(s.challengeId)?.stageNumber,
      title: challengeMap.get(s.challengeId)?.title,
      solvedCount: s._count,
    })),
    competition: {
      start: process.env.COMPETITION_START,
      end: process.env.COMPETITION_END,
    },
  });
});
