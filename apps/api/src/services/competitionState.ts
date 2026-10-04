export interface CompetitionConfig {
  forceState: "AUTO" | "ACTIVE" | "PAUSED" | "STOPPED";
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationHours: number;
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

let currentConfig: CompetitionConfig = {
  forceState: "AUTO",
  startTime: process.env.COMPETITION_START || "2026-10-08T04:30:00.000Z",
  endTime: process.env.COMPETITION_END || "2026-10-08T08:30:00.000Z",
  durationHours: 4,
};

export function getCompetitionConfig(): CompetitionConfig {
  return currentConfig;
}

export function updateCompetitionConfig(update: Partial<CompetitionConfig>): CompetitionConfig {
  if (update.forceState === "ACTIVE") {
    const now = new Date();
    // If startTime is not explicitly provided, start right now
    if (!update.startTime) {
      update.startTime = now.toISOString();
    }
    // Set 4-hour duration from startTime if endTime not explicitly set
    if (!update.endTime) {
      const startMs = new Date(update.startTime).getTime();
      const durationMs = (update.durationHours || currentConfig.durationHours || 4) * 60 * 60 * 1000;
      update.endTime = new Date(startMs + durationMs).toISOString();
    }
  }

  currentConfig = { ...currentConfig, ...update };
  return currentConfig;
}

export function isCompetitionActiveRuntime(): boolean {
  const now = new Date();
  const end = new Date(currentConfig.endTime);

  // Auto-stop when countdown timer reaches zero
  if (now >= end) {
    if (currentConfig.forceState === "ACTIVE" || currentConfig.forceState === "AUTO") {
      currentConfig.forceState = "STOPPED";
    }
    return false;
  }

  if (currentConfig.forceState === "STOPPED" || currentConfig.forceState === "PAUSED") {
    return false;
  }

  if (currentConfig.forceState === "ACTIVE") {
    return true;
  }

  const start = new Date(currentConfig.startTime);
  return now >= start && now <= end;
}
