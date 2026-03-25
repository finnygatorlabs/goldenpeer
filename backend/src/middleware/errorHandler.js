const { pool } = require("../config/database");

async function logError(userId, errorMessage, errorStack, endpoint, statusCode) {
  try {
    await pool.query(
      `INSERT INTO ss_error_logs (log_id, user_id, error_message, error_stack, endpoint, status_code) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
      [userId || null, errorMessage, errorStack || null, endpoint || null, statusCode || 500]
    );
  } catch (err) {
    console.error("Failed to log error:", err.message);
  }
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const userId = req.user?.userId || null;

  logError(userId, err.message, err.stack, req.originalUrl, statusCode);

  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: statusCode >= 500 ? "An internal server error occurred" : err.message,
      details: err.details || undefined,
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

module.exports = { errorHandler, notFoundHandler, logError };
