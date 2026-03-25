const { pool } = require("../config/database");

exports.request = async (req, res) => {
  try {
    const { request_text, voice_file_path } = req.body;

    if (!request_text) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "request_text is required" },
      });
    }

    const response_text = "I'd be happy to help you with that. Let me look into it for you.";
    const duration_seconds = Math.floor(Math.random() * 10) + 1;

    const result = await pool.query(
      `INSERT INTO voice_requests (user_id, request_text, response_text, voice_file_path, duration_seconds, success)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING request_id, request_text, response_text, voice_file_path, duration_seconds, created_at`,
      [req.user.userId, request_text, response_text, voice_file_path || null, duration_seconds]
    );

    await pool.query(
      `INSERT INTO ss_analytics_events (user_id, event_type, event_data) VALUES ($1, 'VOICE_REQUEST', $2)`,
      [req.user.userId, JSON.stringify({ request_id: result.rows[0].request_id })]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Voice request error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not process voice request" },
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT request_id, request_text, response_text, duration_seconds, success, user_rating, created_at
       FROM voice_requests WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM voice_requests WHERE user_id = $1",
      [req.user.userId]
    );

    res.json({ requests: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Voice history error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve history" },
    });
  }
};

exports.getHistoryDetail = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT request_id, request_text, response_text, voice_file_path, duration_seconds, 
              success, error_message, user_rating, created_at
       FROM voice_requests WHERE request_id = $1 AND user_id = $2`,
      [req.params.request_id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Voice request not found" },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Voice detail error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve request details" },
    });
  }
};

exports.feedback = async (req, res) => {
  try {
    const { request_id, rating, feedback_text } = req.body;

    if (!request_id || !rating) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "request_id and rating (1-5) are required" },
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Rating must be between 1 and 5" },
      });
    }

    const result = await pool.query(
      `UPDATE voice_requests SET user_rating = $3
       WHERE request_id = $1 AND user_id = $2 RETURNING request_id`,
      [request_id, req.user.userId, rating]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Voice request not found" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Voice feedback error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not record feedback" },
    });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT voice_gender, voice_speed, voice_volume, hearing_aid_connected
       FROM user_settings WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        voice_gender: "FEMALE", voice_speed: 1.0, voice_volume: 80, hearing_aid_connected: false,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Voice preferences error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve preferences" },
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { voice_gender, voice_speed, voice_volume } = req.body;

    const result = await pool.query(
      `UPDATE user_settings 
       SET voice_gender = COALESCE($2, voice_gender),
           voice_speed = COALESCE($3, voice_speed),
           voice_volume = COALESCE($4, voice_volume),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 RETURNING voice_gender, voice_speed, voice_volume`,
      [req.user.userId, voice_gender, voice_speed, voice_volume]
    );

    res.json({ success: true, preferences: result.rows[0] });
  } catch (err) {
    console.error("Update voice preferences error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update preferences" },
    });
  }
};
