const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "seniorshield-secret-key-change-in-production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "24h";
const REFRESH_EXPIRATION = "30d";

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

function generateRefreshToken(payload) {
  return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_EXPIRATION });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "No token provided", details: "Include Authorization: Bearer {token} header" },
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token", details: "Please login again" },
    });
  }

  if (decoded.type === "refresh") {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Cannot use refresh token for API calls", details: "Use access token instead" },
    });
  }

  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "No admin token provided" },
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded || !decoded.isAdmin) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Admin access required" },
    });
  }

  req.admin = decoded;
  next();
}

module.exports = { generateToken, generateRefreshToken, verifyToken, requireAuth, requireAdmin, JWT_SECRET };
