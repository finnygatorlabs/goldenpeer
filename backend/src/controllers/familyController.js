const { pool } = require("../config/database");

exports.addMember = async (req, res) => {
  try {
    const { family_email, family_name, relationship } = req.body;

    if (!family_email) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "family_email is required" },
      });
    }

    const result = await pool.query(
      `INSERT INTO family_members (user_id, family_email, family_name, relationship, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING family_id, status, created_at`,
      [req.user.userId, family_email, family_name || null, relationship || null]
    );

    res.status(201).json({
      family_id: result.rows[0].family_id,
      status: "PENDING",
    });
  } catch (err) {
    console.error("Add family member error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not add family member" },
    });
  }
};

exports.getMembers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT family_id, family_email, family_name, relationship, status, created_at, updated_at
       FROM family_members WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json({ members: result.rows, total_count: result.rows.length });
  } catch (err) {
    console.error("Get family members error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve family members" },
    });
  }
};

exports.getMember = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT family_id, family_email, family_name, relationship, status, created_at, updated_at
       FROM family_members WHERE family_id = $1 AND user_id = $2`,
      [req.params.family_id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Family member not found" },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get family member error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve family member" },
    });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { family_name, relationship } = req.body;

    const result = await pool.query(
      `UPDATE family_members
       SET family_name = COALESCE($3, family_name),
           relationship = COALESCE($4, relationship),
           updated_at = CURRENT_TIMESTAMP
       WHERE family_id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.family_id, req.user.userId, family_name, relationship]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Family member not found" },
      });
    }

    res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    console.error("Update family member error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update family member" },
    });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM family_members WHERE family_id = $1 AND user_id = $2 RETURNING family_id",
      [req.params.family_id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Family member not found" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete family member error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not remove family member" },
    });
  }
};

exports.sendAlert = async (req, res) => {
  try {
    const { alert_type, alert_message } = req.body;

    if (!alert_type) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "alert_type is required" },
      });
    }

    const members = await pool.query(
      "SELECT family_id FROM family_members WHERE user_id = $1 AND status = 'ACTIVE'",
      [req.user.userId]
    );

    const alerts = [];
    for (const member of members.rows) {
      const result = await pool.query(
        `INSERT INTO family_alerts (user_id, family_id, alert_type, alert_message)
         VALUES ($1, $2, $3, $4) RETURNING alert_id, created_at`,
        [req.user.userId, member.family_id, alert_type, alert_message || null]
      );
      alerts.push(result.rows[0]);
    }

    res.json({
      alert_id: alerts[0]?.alert_id || null,
      created_at: alerts[0]?.created_at || new Date().toISOString(),
      notifications_sent: alerts.length,
    });
  } catch (err) {
    console.error("Send alert error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not send alert" },
    });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT a.alert_id, a.alert_type, a.alert_message, a.read, a.created_at,
              f.family_name, f.family_email
       FROM family_alerts a
       JOIN family_members f ON a.family_id = f.family_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM family_alerts WHERE user_id = $1",
      [req.user.userId]
    );

    res.json({ alerts: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Get alerts error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve alerts" },
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { family_id, message } = req.body;

    if (!family_id || !message) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "family_id and message are required" },
      });
    }

    const member = await pool.query(
      "SELECT family_id FROM family_members WHERE family_id = $1 AND user_id = $2",
      [family_id, req.user.userId]
    );

    if (member.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Family member not found" },
      });
    }

    res.json({ success: true, message_id: require("uuid").v4() });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not send message" },
    });
  }
};
