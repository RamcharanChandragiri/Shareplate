import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication endpoints (login, register)
 * Prevents brute force and denial of service
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP, please try again after 15 minutes."
  }
});
