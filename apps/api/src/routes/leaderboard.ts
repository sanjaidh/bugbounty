/**
 * Leaderboard Routes
 * GET /api/leaderboard          — Team leaderboard (combined scores)
 * GET /api/leaderboard/live     — Optimized for hall-screen polling (5s refresh)
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

export const leaderboardRouter = Router();
const prisma = new PrismaClient();

// Cache leaderboard data for 5 seconds to handle rapid polling from hall screen
let leaderboardCache: { data: object; builtAt: Date } | null = null;
const CACHE_TTL_MS = 5000;

export async function buildLeaderboard() {
  // Get all teams with their members and solved challenges
  const teams = await prisma.team.findMany({
    include: {
      members: {
        include: {
          progress: {
            where: { status: "SOLVED" },
            include: { challenge: { select: { points: true, stageNumber: true } } },
            orderBy: { solvedAt: "desc" },
          },
        },
      },
    },
  });

  // Also get solo participants (no team)
  const soloParticipants = await prisma.user.findMany({
    where: { teamId: null, role: "PARTICIPANT", isActive: true },
    include: {
      progress: {
        where: { status: "SOLVED" },
        include: { challenge: { select: { points: true, stageNumber: true } } },
        orderBy: { solvedAt: "desc" },
      },
    },
  });

  const entries: {
    id: string;
    name: string;
    type: "team" | "solo";
    members: string[];
    totalPoints: number;
    solvedCount: number;
    highestStage: number;
    lastSolvedAt: Date | null;
  }[] = [];

  // Team entries
  for (const team of teams) {
    const allProgress = team.members.flatMap((m) => m.progress);
    // Deduplicate by challengeId (in case both team members solved same challenge somehow)
    const uniqueSolved = new Map(allProgress.map((p) => [p.challengeId, p]));
    const totalPoints = [...uniqueSolved.values()].reduce(
      (sum, p) => sum + p.challenge.points,
      0
    );
    const highestStage = Math.max(
      0,
      ...[...uniqueSolved.values()].map((p) => p.challenge.stageNumber)
    );
    const lastSolvedAt =
      allProgress.length > 0
        ? allProgress.reduce((latest, p) =>
            (p.solvedAt ?? new Date(0)) > (latest.solvedAt ?? new Date(0)) ? p : latest
          ).solvedAt
        : null;

    entries.push({
      id: team.id,
      name: team.name,
      type: "team",
      members: team.members.map((m) => m.username),
      totalPoints,
      solvedCount: uniqueSolved.size,
      highestStage,
      lastSolvedAt: lastSolvedAt ?? null,
    });
  }

  // Solo entries
  for (const participant of soloParticipants) {
    const totalPoints = participant.progress.reduce(
      (sum, p) => sum + p.challenge.points,
      0
    );
    const highestStage = Math.max(
      0,
      ...participant.progress.map((p) => p.challenge.stageNumber)
    );
    const lastSolvedAt =
      participant.progress.length > 0 ? participant.progress[0].solvedAt : null;

    entries.push({
      id: participant.id,
      name: participant.username,
      type: "solo",
      members: [participant.username],
      totalPoints,
      solvedCount: participant.progress.length,
      highestStage,
      lastSolvedAt: lastSolvedAt ?? null,
    });
  }

  // Sort: by totalPoints desc, then by lastSolvedAt asc (faster solve wins tiebreaker)
  entries.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.lastSolvedAt && b.lastSolvedAt) {
      return a.lastSolvedAt.getTime() - b.lastSolvedAt.getTime();
    }
    return 0;
  });

  const ranked = entries.map((e, i) => ({ rank: i + 1, ...e }));
  return ranked;
}

leaderboardRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    if (leaderboardCache && now.getTime() - leaderboardCache.builtAt.getTime() < CACHE_TTL_MS) {
      res.json({ leaderboard: leaderboardCache.data, cached: true, builtAt: leaderboardCache.builtAt });
      return;
    }

    const leaderboard = await buildLeaderboard();
    leaderboardCache = { data: leaderboard, builtAt: now };
    res.json({ leaderboard, cached: false, builtAt: now });
  } catch (err) {
    logger.error("Leaderboard error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Live endpoint — same data, optimized for frequent polling
leaderboardRouter.get("/live", async (_req: Request, res: Response): Promise<void> => {
  try {
    const leaderboard = await buildLeaderboard();
    leaderboardCache = { data: leaderboard, builtAt: new Date() };
    res.json({
      leaderboard,
      builtAt: new Date(),
      competition: {
        start: process.env.COMPETITION_START,
        end: process.env.COMPETITION_END,
      },
    });
  } catch (err) {
    logger.error("Live leaderboard error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});
