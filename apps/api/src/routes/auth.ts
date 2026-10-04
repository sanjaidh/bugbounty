/**
 * Auth Routes
 * POST /api/auth/login          — Login with username + password
 * GET  /api/auth/me             — Get current user from JWT
 * POST /api/auth/logout         — Clear auth cookie
 * POST /api/admin/bootstrap     — One-time admin account creation
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";
import { isCompetitionActiveRuntime, getCompetitionConfig } from "../services/competitionState";

export const authRouter = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "cybercarnival-secret-jwt-key-2026";
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || "cybercarnival-admin-setup-key-2026";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: "/",
};

// ─── Public Competition Status ───────────────────────────────────────────────

authRouter.get("/competition-status", (_req: Request, res: Response): void => {
  const config = getCompetitionConfig();
  const active = isCompetitionActiveRuntime();
  res.json({
    isActive: active,
    forceState: config.forceState,
    startTime: config.startTime,
    endTime: config.endTime,
    serverTime: new Date().toISOString(),
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid credentials format" });
    return;
  }

  const { username, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { team: true },
    });

    if (!user || !user.isActive) {
      // Timing-safe: still run bcrypt even if user not found
      await bcrypt.compare(password, "$2b$12$invalidhashtopreventtimingattacks000000000000000000000");
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    // Block non-admin players if competition has not started or is inactive
    if (user.role !== "ADMIN" && !isCompetitionActiveRuntime()) {
      res.status(403).json({
        error: "COMPETITION NOT STARTED: Player login is locked until the competition officially begins!",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        teamId: user.teamId,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("cc_token", token, COOKIE_OPTIONS);
    logger.info("User logged in", { userId: user.id, username: user.username });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        team: user.team ? { id: user.team.id, name: user.team.name } : null,
      },
    });
  } catch (err) {
    logger.error("Login error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Get Current User ─────────────────────────────────────────────────────────

authRouter.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { team: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Account not found or disabled" });
      return;
    }

    if (user.role !== "ADMIN" && !isCompetitionActiveRuntime()) {
      res.status(403).json({ error: "Competition has not started yet or is currently inactive." });
      return;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        team: user.team ? { id: user.team.id, name: user.team.name } : null,
      },
    });
  } catch (err) {
    logger.error("Me error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Logout ──────────────────────────────────────────────────────────────────

authRouter.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("cc_token", { path: "/" });
  res.json({ message: "Logged out" });
});

// ─── Bootstrap Admin (one-time use) ──────────────────────────────────────────

const bootstrapSchema = z.object({
  setupKey: z.string(),
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(12),
});

authRouter.post("/bootstrap", async (req: Request, res: Response): Promise<void> => {
  if (!ADMIN_SETUP_KEY) {
    res.status(403).json({ error: "Bootstrap not configured" });
    return;
  }

  const parsed = bootstrapSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { setupKey, username, email, password } = parsed.data;

  if (setupKey !== ADMIN_SETUP_KEY) {
    res.status(403).json({ error: "Invalid setup key" });
    return;
  }

  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) {
      res.status(409).json({ error: "Admin already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: { username, email, passwordHash, role: "ADMIN" },
    });

    logger.info("Admin account bootstrapped", { userId: admin.id, username: admin.username });
    res.status(201).json({ message: "Admin created", username: admin.username });
  } catch (err) {
    logger.error("Bootstrap error", { error: (err as Error).message });
    res.status(500).json({ error: "Internal server error" });
  }
});
