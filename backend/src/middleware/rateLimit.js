const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded", details: "Maximum 1000 requests per hour" },
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Too many auth attempts", details: "Maximum 10 requests per minute" },
  },
});

const scamLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "Scam analysis rate limit exceeded", details: "Maximum 100 analyses per hour" },
  },
});

module.exports = { apiLimiter, authLimiter, scamLimiter };
