const { pool } = require("../config/database");
const crypto = require("crypto");

exports.register = async (req, res) => {
  try {
    const { facility_name, facility_type, address, city, state, zip, phone, email, admin_email, admin_password } = req.body;

    if (!facility_name || !admin_email || !admin_password) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "facility_name, admin_email, and admin_password are required" },
      });
    }

    const bcrypt = require("bcryptjs");
    const password_hash = bcrypt.hashSync(admin_password, 12);

    const userResult = await pool.query(
      `INSERT INTO ss_users (email, password_hash, account_type, subscription_type)
       VALUES ($1, $2, 'B2B_FACILITY', 'PREMIUM')
       ON CONFLICT (email) DO UPDATE SET account_type = 'B2B_FACILITY'
       RETURNING user_id`,
      [admin_email.toLowerCase(), password_hash]
    );

    const adminUserId = userResult.rows[0].user_id;
    const facilityCode = `FAC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const apiKey = crypto.randomBytes(32).toString("hex");

    const result = await pool.query(
      `INSERT INTO ss_facility_accounts (facility_name, facility_type, address, city, state, zip, phone, email, admin_user_id, facility_code, api_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING facility_id, facility_code`,
      [facility_name, facility_type || null, address || null, city || null, state || null,
       zip || null, phone || null, email || null, adminUserId, facilityCode, apiKey]
    );

    res.status(201).json({
      facility_id: result.rows[0].facility_id,
      facility_code: result.rows[0].facility_code,
      api_key: apiKey,
    });
  } catch (err) {
    console.error("Register facility error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not register facility" },
    });
  }
};

exports.getFacility = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT facility_id, facility_name, facility_type, address, city, state, zip, phone, email,
              admin_user_id, facility_code, subscription_status, created_at
       FROM ss_facility_accounts WHERE facility_id = $1`,
      [req.params.facility_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Facility not found" },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get facility error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve facility" },
    });
  }
};

exports.updateFacility = async (req, res) => {
  try {
    const { facility_name, address, city, state, zip, phone, email } = req.body;

    const result = await pool.query(
      `UPDATE ss_facility_accounts
       SET facility_name = COALESCE($2, facility_name), address = COALESCE($3, address),
           city = COALESCE($4, city), state = COALESCE($5, state), zip = COALESCE($6, zip),
           phone = COALESCE($7, phone), email = COALESCE($8, email), updated_at = CURRENT_TIMESTAMP
       WHERE facility_id = $1 RETURNING *`,
      [req.params.facility_id, facility_name, address, city, state, zip, phone, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Facility not found" },
      });
    }

    res.json({ success: true, facility: result.rows[0] });
  } catch (err) {
    console.error("Update facility error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update facility" },
    });
  }
};

exports.deleteFacility = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM ss_facility_accounts WHERE facility_id = $1 RETURNING facility_id",
      [req.params.facility_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Facility not found" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete facility error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not delete facility" },
    });
  }
};

exports.addResident = async (req, res) => {
  try {
    const { resident_email, resident_name } = req.body;

    if (!resident_email) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "resident_email is required" },
      });
    }

    let userResult = await pool.query("SELECT user_id FROM ss_users WHERE email = $1", [resident_email.toLowerCase()]);

    let userId;
    if (userResult.rows.length === 0) {
      const bcrypt = require("bcryptjs");
      const tempHash = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 12);
      const newUser = await pool.query(
        "INSERT INTO ss_users (email, password_hash, account_type) VALUES ($1, $2, 'B2B_FACILITY') RETURNING user_id",
        [resident_email.toLowerCase(), tempHash]
      );
      userId = newUser.rows[0].user_id;
    } else {
      userId = userResult.rows[0].user_id;
    }

    const result = await pool.query(
      `INSERT INTO ss_facility_residents (facility_id, user_id, resident_name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING resident_id, status`,
      [req.params.facility_id, userId, resident_name || null]
    );

    res.status(201).json({
      resident_id: result.rows[0].resident_id,
      status: "ACTIVE",
    });
  } catch (err) {
    console.error("Add resident error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not add resident" },
    });
  }
};

exports.getResidents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT r.resident_id, r.resident_name, r.status, r.joined_at, u.email
       FROM ss_facility_residents r JOIN users u ON r.user_id = u.user_id
       WHERE r.facility_id = $1
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.facility_id, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM ss_facility_residents WHERE facility_id = $1",
      [req.params.facility_id]
    );

    res.json({ residents: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Get residents error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve residents" },
    });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const facilityId = req.params.facility_id;

    const totalResult = await pool.query(
      "SELECT COUNT(*) FROM ss_facility_residents WHERE facility_id = $1",
      [facilityId]
    );
    const activeResult = await pool.query(
      "SELECT COUNT(*) FROM ss_facility_residents WHERE facility_id = $1 AND status = 'ACTIVE'",
      [facilityId]
    );

    res.json({
      total_residents: parseInt(totalResult.rows[0].count),
      active_residents: parseInt(activeResult.rows[0].count),
      scams_detected: 0,
      alerts_sent: 0,
    });
  } catch (err) {
    console.error("Facility dashboard error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve dashboard" },
    });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    res.json({ alerts: [], total_count: 0 });
  } catch (err) {
    console.error("Facility alerts error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve alerts" },
    });
  }
};

exports.billingWebhook = async (req, res) => {
  try {
    res.json({ received: true });
  } catch (err) {
    console.error("Facility webhook error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Webhook processing failed" },
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    res.json({
      engagement_stats: { avg_daily_active: 0, avg_session_minutes: 0 },
      scam_stats: { total_detected: 0, total_prevented: 0 },
      usage_trends: [],
    });
  } catch (err) {
    console.error("Facility analytics error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve analytics" },
    });
  }
};
