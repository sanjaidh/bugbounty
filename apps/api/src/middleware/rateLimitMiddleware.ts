import rateLimit from "express-rate-limit";

/** Global API rate limit: 100 requests per minute per IP */
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});

/** Flag submission rate limit: 10 per minute per IP (brute-force protection) */
export const submissionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many flag submissions. Wait a minute before trying again." },
  keyGenerator: (req) => {
    // Key by user ID if authenticated, otherwise by IP
    return req.user?.userId || req.ip || "unknown";
  },
});
