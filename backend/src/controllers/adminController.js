const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { generateToken } = require("../middleware/auth");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Email and password are required" },
      });
    }

    const result = await pool.query(
      "SELECT admin_id, email, password_hash, role, permissions FROM ss_admin_users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password_hash)) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
    }

    const admin = result.rows[0];
    await pool.query(
      "UPDATE ss_admin_users SET last_login = CURRENT_TIMESTAMP WHERE admin_id = $1",
      [admin.admin_id]
    );

    const token = generateToken({ userId: admin.admin_id, email: admin.email, isAdmin: true, role: admin.role });

    res.json({ admin_id: admin.admin_id, token, role: admin.role });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Login failed" },
    });
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM ss_users");
    const mau = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '30 days'"
    );
    const dau = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '1 day'"
    );
    const scamsDetected = await pool.query("SELECT COUNT(*) FROM scam_analyses");
    const premiumUsers = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE subscription_type != 'FREE'"
    );

    res.json({
      total_users: parseInt(totalUsers.rows[0].count),
      mau: parseInt(mau.rows[0].count),
      dau: parseInt(dau.rows[0].count),
      mrr: parseInt(premiumUsers.rows[0].count) * 9.99,
      arr: parseInt(premiumUsers.rows[0].count) * 9.99 * 12,
      churn_rate: 0,
      scams_detected: parseInt(scamsDetected.rows[0].count),
    });
  } catch (err) {
    console.error("Dashboard metrics error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve metrics" },
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || "";
    const sortBy = req.query.sort_by || "created_at";

    const validSorts = ["created_at", "email", "last_login", "subscription_type"];
    const sortCol = validSorts.includes(sortBy) ? sortBy : "created_at";

    let query, countQuery, params;
    if (search) {
      query = `SELECT user_id, email, account_type, subscription_type, created_at, last_login
               FROM ss_users WHERE email ILIKE $1
               ORDER BY ${sortCol} DESC LIMIT $2 OFFSET $3`;
      countQuery = "SELECT COUNT(*) FROM ss_users WHERE email ILIKE $1";
      params = [`%${search}%`, limit, offset];
    } else {
      query = `SELECT user_id, email, account_type, subscription_type, created_at, last_login
               FROM ss_users ORDER BY ${sortCol} DESC LIMIT $1 OFFSET $2`;
      countQuery = "SELECT COUNT(*) FROM ss_users";
      params = [limit, offset];
    }

    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);

    res.json({ users: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Admin get users error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve users" },
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.account_type, u.subscription_type, u.created_at, u.last_login,
              p.first_name, p.last_name, p.phone_number
       FROM ss_users u LEFT JOIN user_profiles p ON u.user_id = p.user_id
       WHERE u.user_id = $1`,
      [req.params.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    const voiceCount = await pool.query(
      "SELECT COUNT(*) FROM voice_requests WHERE user_id = $1",
      [req.params.user_id]
    );
    const scamCount = await pool.query(
      "SELECT COUNT(*) FROM scam_analyses WHERE user_id = $1",
      [req.params.user_id]
    );

    res.json({
      ...result.rows[0],
      voice_requests_count: parseInt(voiceCount.rows[0].count),
      scam_analyses_count: parseInt(scamCount.rows[0].count),
    });
  } catch (err) {
    console.error("Admin get user error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve user" },
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { subscription_type, status } = req.body;

    const updates = [];
    const values = [req.params.user_id];
    let idx = 2;

    if (subscription_type) {
      updates.push(`subscription_type = $${idx++}`);
      values.push(subscription_type);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "No fields to update" },
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    const result = await pool.query(
      `UPDATE ss_users SET ${updates.join(", ")} WHERE user_id = $1 RETURNING user_id, email, subscription_type`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    await pool.query(
      `INSERT INTO ss_admin_activity_log (admin_id, action, resource_type, resource_id, changes)
       VALUES ($1, 'UPDATE', 'USER', $2, $3)`,
      [req.admin.userId, req.params.user_id, JSON.stringify(req.body)]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Admin update user error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update user" },
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM ss_users WHERE user_id = $1 RETURNING user_id",
      [req.params.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    await pool.query(
      `INSERT INTO ss_admin_activity_log (admin_id, action, resource_type, resource_id)
       VALUES ($1, 'DELETE', 'USER', $2)`,
      [req.admin.userId, req.params.user_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not delete user" },
    });
  }
};

exports.getFacilities = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT facility_id, facility_name, facility_type, city, state, subscription_status, created_at
       FROM ss_facility_accounts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM ss_facility_accounts");

    res.json({ facilities: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Admin get facilities error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve facilities" },
    });
  }
};

exports.getTelecomPartners = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT carrier, COUNT(*) as users, COUNT(*) * 10 as mrr
       FROM ss_telecom_accounts WHERE subscription_status = 'ACTIVE'
       GROUP BY carrier`
    );

    res.json({ partners: result.rows });
  } catch (err) {
    console.error("Admin telecom partners error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve partners" },
    });
  }
};

exports.getInsurancePartners = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT insurance_provider as provider, COUNT(*) as users, COUNT(*) * 10 as mrr
       FROM ss_insurance_accounts WHERE subscription_status = 'ACTIVE'
       GROUP BY insurance_provider`
    );

    res.json({ partners: result.rows });
  } catch (err) {
    console.error("Admin insurance partners error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve partners" },
    });
  }
};

exports.getRevenue = async (req, res) => {
  try {
    const premiumCount = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE subscription_type != 'FREE'"
    );

    res.json({
      total_revenue: parseInt(premiumCount.rows[0].count) * 9.99,
      by_channel: { stripe: parseInt(premiumCount.rows[0].count) * 9.99, telecom: 0, insurance: 0 },
      by_month: [],
    });
  } catch (err) {
    console.error("Admin revenue error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve revenue data" },
    });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    res.json({ invoices: [], total_count: 0 });
  } catch (err) {
    console.error("Admin invoices error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve invoices" },
    });
  }
};

exports.getTickets = async (req, res) => {
  try {
    res.json({ tickets: [], total_count: 0 });
  } catch (err) {
    console.error("Admin tickets error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve tickets" },
    });
  }
};

exports.getAnalyticsUsers = async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM ss_users");
    const byType = await pool.query(
      "SELECT subscription_type, COUNT(*) FROM ss_users GROUP BY subscription_type"
    );

    res.json({
      total_users: parseInt(total.rows[0].count),
      by_subscription_type: byType.rows,
      growth_rate: 0,
    });
  } catch (err) {
    console.error("Admin analytics users error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve analytics" },
    });
  }
};

exports.getAnalyticsEngagement = async (req, res) => {
  try {
    const dau = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '1 day'"
    );
    const mau = await pool.query(
      "SELECT COUNT(*) FROM ss_users WHERE last_login > CURRENT_TIMESTAMP - INTERVAL '30 days'"
    );

    res.json({
      dau: parseInt(dau.rows[0].count),
      mau: parseInt(mau.rows[0].count),
      avg_session_duration: 0,
      voice_requests_per_user: 0,
    });
  } catch (err) {
    console.error("Admin analytics engagement error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve engagement data" },
    });
  }
};

exports.getAnalyticsScams = async (req, res) => {
  try {
    const total = await pool.query("SELECT COUNT(*) FROM scam_analyses");
    const reported = await pool.query("SELECT COUNT(*) FROM scam_analyses WHERE user_reported_scam = true");

    res.json({
      total_scams_detected: parseInt(total.rows[0].count),
      scams_reported: parseInt(reported.rows[0].count),
      scams_prevented_value: 0,
      detection_accuracy: 95,
    });
  } catch (err) {
    console.error("Admin analytics scams error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve scam analytics" },
    });
  }
};

exports.getAnalyticsChurn = async (req, res) => {
  try {
    res.json({
      monthly_churn_rate: 0,
      churn_by_channel: {},
      churn_reasons: [],
    });
  } catch (err) {
    console.error("Admin analytics churn error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve churn data" },
    });
  }
};

exports.getSettings = async (req, res) => {
  try {
    res.json({
      company_settings: { name: "SeniorShield", support_email: "admin@finnygator.com" },
      integrations: { stripe: !!process.env.STRIPE_SECRET_KEY, openai: !!process.env.OPENAI_API_KEY },
      feature_flags: { voice_assistance: true, scam_detection: true, family_alerts: true },
    });
  } catch (err) {
    console.error("Admin settings error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve settings" },
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    res.json({ success: true });
  } catch (err) {
    console.error("Admin update settings error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update settings" },
    });
  }
};

exports.addStaff = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "email is required" },
      });
    }

    const tempPassword = require("crypto").randomBytes(16).toString("hex");
    const password_hash = bcrypt.hashSync(tempPassword, 12);

    const result = await pool.query(
      `INSERT INTO ss_admin_users (email, password_hash, role)
       VALUES ($1, $2, $3) RETURNING admin_id, created_at`,
      [email.toLowerCase(), password_hash, role || "SUPPORT"]
    );

    res.status(201).json({
      admin_id: result.rows[0].admin_id,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Admin with this email already exists" },
      });
    }
    console.error("Add staff error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not add staff member" },
    });
  }
};

exports.getStaff = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT admin_id, email, role, last_login, created_at FROM ss_admin_users ORDER BY created_at DESC"
    );

    res.json({ staff: result.rows, total_count: result.rows.length });
  } catch (err) {
    console.error("Get staff error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve staff" },
    });
  }
};
