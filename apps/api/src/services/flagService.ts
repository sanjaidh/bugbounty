/**
 * Flag Service — Core anti-cheat engine
 *
 * Stage 1-7: Answer-based validation (correct answer stored as SHA256 in DB)
 * Stage 8:   HMAC-SHA256 per-participant unique flag
 *
 * Architecture:
 * - Intermediate stages: participant submits plaintext answer → backend hashes and compares
 * - Final stage: backend generates unique HMAC flag per user, displays it, verifies submission
 */

import crypto from "crypto";

const FLAG_SECRET = process.env.FLAG_SECRET || "cybercarnival-secret-flag-hmac-key-2026";

// ─── Intermediate Stage Answer Validation (Stages 1-7) ───────────────────────

/**
 * Hash a plaintext answer for storage / comparison.
 * Answers are normalized: trimmed and lowercased before hashing.
 */
export function hashAnswer(plaintext: string): string {
  return crypto
    .createHash("sha256")
    .update(plaintext.trim().toLowerCase())
    .digest("hex");
}

/**
 * Verify a participant's submitted answer against the stored hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyAnswer(submitted: string, storedHash: string): boolean {
  const submittedHash = hashAnswer(submitted);
  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Final Stage HMAC Flag (Stage 8) ─────────────────────────────────────────

/**
 * Generate a unique, per-participant flag for the final stage.
 * Formula: HMAC-SHA256(FLAG_SECRET, userId + ":" + challengeId + ":" + baseCode)
 *
 * This flag is displayed to the participant on the platform and must be submitted verbatim.
 * Sharing it is useless — each participant's flag is mathematically unique.
 */
export function generateFinalFlag(
  userId: string,
  challengeId: string,
  baseCode: string
): string {
  const hmac = crypto.createHmac("sha256", FLAG_SECRET!);
  hmac.update(`${userId}:${challengeId}:${baseCode}`);
  return `CC{${hmac.digest("hex")}}`;
}

/**
 * Verify a submitted final-stage flag for a specific participant.
 * Re-derives the expected flag and compares using constant-time equality.
 */
export function verifyFinalFlag(
  submitted: string,
  userId: string,
  challengeId: string,
  baseCode: string
): boolean {
  const expected = generateFinalFlag(userId, challengeId, baseCode);
  if (submitted.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
  } catch {
    return false;
  }
}
