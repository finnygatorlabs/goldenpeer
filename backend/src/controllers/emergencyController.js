const { pool } = require("../config/database");

exports.sos = async (req, res) => {
  try {
    const { location } = req.body;

    const members = await pool.query(
      "SELECT family_id, family_email, family_name FROM family_members WHERE user_id = $1 AND status = 'ACTIVE'",
      [req.user.userId]
    );

    for (const member of members.rows) {
      await pool.query(
        `INSERT INTO family_alerts (user_id, family_id, alert_type, alert_message)
         VALUES ($1, $2, 'EMERGENCY_SOS', $3)`,
        [req.user.userId, member.family_id,
         `EMERGENCY SOS triggered${location ? ` at location: ${JSON.stringify(location)}` : ""}. Please check on your family member immediately.`]
      );
    }

    await pool.query(
      `INSERT INTO ss_analytics_events (user_id, event_type, event_data) VALUES ($1, 'EMERGENCY_SOS', $2)`,
      [req.user.userId, JSON.stringify({ location: location || null, family_notified: members.rows.length })]
    );

    res.json({
      success: true,
      family_notified: members.rows.length > 0,
      emergency_id: require("uuid").v4(),
      notifications_sent: members.rows.length,
    });
  } catch (err) {
    console.error("Emergency SOS error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not process emergency request" },
    });
  }
};

exports.notifyFamily = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "message is required" },
      });
    }

    const members = await pool.query(
      "SELECT family_id, family_email FROM family_members WHERE user_id = $1 AND status = 'ACTIVE'",
      [req.user.userId]
    );

    for (const member of members.rows) {
      await pool.query(
        `INSERT INTO family_alerts (user_id, family_id, alert_type, alert_message)
         VALUES ($1, $2, 'HELP_NEEDED', $3)`,
        [req.user.userId, member.family_id, message]
      );
    }

    res.json({
      success: true,
      notifications_sent: members.rows.length,
    });
  } catch (err) {
    console.error("Notify family error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not notify family" },
    });
  }
};
