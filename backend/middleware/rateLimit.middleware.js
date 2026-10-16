import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (process.env.NODE_ENV === "production" ? 10 : 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes" },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: () => (process.env.NODE_ENV === "production" ? 300 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests" },
});