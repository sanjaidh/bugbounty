import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { buildLeaderboard } from "../routes/leaderboard";
import { logger } from "../utils/logger";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    logger.debug("Socket connected", { id: socket.id });

    socket.on("disconnect", () => {
      logger.debug("Socket disconnected", { id: socket.id });
    });
  });

  return io;
}

/** Called whenever a challenge is solved — pushes updated leaderboard to all clients */
export async function broadcastLeaderboard(io: Server): Promise<void> {
  try {
    const leaderboard = await buildLeaderboard();
    io.emit("leaderboard:update", { leaderboard, builtAt: new Date() });
    logger.debug("Leaderboard broadcast sent", { entries: leaderboard.length });
  } catch (err) {
    logger.error("Failed to broadcast leaderboard", { error: (err as Error).message });
  }
}

/** Broadcasts competition status updates & time expiration events to all connected players */
export function broadcastCompetitionStatus(io: Server, status: any): void {
  try {
    io.emit("competition:status", status);
    logger.info("Competition status broadcast sent", status);
  } catch (err) {
    logger.error("Failed to broadcast competition status", { error: (err as Error).message });
  }
}
