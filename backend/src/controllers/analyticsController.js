const { pool } = require("../config/database");

exports.getEvents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const eventType = req.query.event_type || null;

    let query, params;
    if (eventType) {
      query = `SELECT event_id, user_id, event_type, event_data, created_at
               FROM ss_analytics_events WHERE event_type = $1
               ORDER BY created_at DESC LIMIT $2`;
      params = [eventType, limit];
    } else {
      query = `SELECT event_id, user_id, event_type, event_data, created_at
               FROM ss_analytics_events ORDER BY created_at DESC LIMIT $1`;
      params = [limit];
    }

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      eventType
        ? "SELECT COUNT(*) FROM ss_analytics_events WHERE event_type = $1"
        : "SELECT COUNT(*) FROM ss_analytics_events",
      eventType ? [eventType] : []
    );

    res.json({ events: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Analytics events error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve events" },
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM ss_users");
    const today = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE created_at > CURRENT_DATE"
    );
    const thisMonth = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE created_at > DATE_TRUNC('month', CURRENT_DATE)"
    );

    res.json({
      total_users: parseInt(total.rows[0].count),
      new_users_today: parseInt(today.rows[0].count),
      new_users_this_month: parseInt(thisMonth.rows[0].count),
    });
  } catch (err) {
    console.error("Analytics users error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve user analytics" },
    });
  }
};

exports.getEngagement = async (req, res) => {
  try {
    const dau = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '1 day'"
    );
    const mau = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '30 days'"
    );
    const totalVoice = await pool.query("SELECT COUNT(*) FROM voice_requests");
    const totalUsers = await pool.query("SELECT COUNT(*) FROM ss_users");

    const usersCount = parseInt(totalUsers.rows[0].count) || 1;

    res.json({
      dau: parseInt(dau.rows[0].count),
      mau: parseInt(mau.rows[0].count),
      avg_session_duration: 0,
      voice_requests_per_user: Math.round(parseInt(totalVoice.rows[0].count) / usersCount * 10) / 10,
    });
  } catch (err) {
    console.error("Analytics engagement error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve engagement data" },
    });
  }
};

exports.getErrors = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT log_id, user_id, error_message, endpoint, status_code, created_at
       FROM ss_error_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM ss_error_logs");

    res.json({ errors: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Analytics errors:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve errors" },
    });
  }
};
