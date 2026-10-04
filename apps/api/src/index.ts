/**
 * CyberCarnival API — Entry Point
 * Express + Socket.io server
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import compression from "compression";
import path from "path";

import { authRouter } from "./routes/auth";
import { challengeRouter } from "./routes/challenges";
import { leaderboardRouter } from "./routes/leaderboard";
import { adminRouter } from "./routes/admin";
import { assetsRouter } from "./routes/assets";
import { initSocket } from "./socket/leaderboardSocket";
import { logger } from "./utils/logger";

const app = express();
const httpServer = http.createServer(app);

// Trust Nginx reverse proxy for real IP forwarding & security headers
app.set("trust proxy", 1);

// ─── Socket.io ───────────────────────────────────────────────────────────────
export const io = initSocket(httpServer);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from any origin (Nginx proxy, localhost, custom IP/domain)
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── Static Assets ────────────────────────────────────────────────────────────
// Challenge files (SSTV wav, meme jpg) served from /assets
app.use("/assets", assetsRouter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/challenges", challengeRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    competition: {
      start: process.env.COMPETITION_START,
      end: process.env.COMPETITION_END,
    },
  });
});

// ─── 404 + Error Handler ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err.message, { stack: err.stack });
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── Start ───────────────────────────────────────────────────────────────────
import { isCompetitionActiveRuntime, getCompetitionConfig } from "./services/competitionState";
import { broadcastCompetitionStatus } from "./socket/leaderboardSocket";

let lastKnownActiveState = isCompetitionActiveRuntime();
setInterval(() => {
  const currentActiveState = isCompetitionActiveRuntime();
  const config = getCompetitionConfig();
  if (lastKnownActiveState !== currentActiveState) {
    lastKnownActiveState = currentActiveState;
    broadcastCompetitionStatus(io, {
      isActive: currentActiveState,
      forceState: config.forceState,
      startTime: config.startTime,
      endTime: config.endTime,
      serverTime: new Date().toISOString(),
      expired: !currentActiveState && new Date() >= new Date(config.endTime),
    });
  }
}, 3000);

const PORT = parseInt(process.env.PORT || "3001", 10);
httpServer.listen(PORT, () => {
  logger.info(`🚀  CyberCarnival API running on port ${PORT}`);
  logger.info(`🔌  Socket.io ready`);
  logger.info(`🏁  Competition status ticker active`);
});

export default app;
