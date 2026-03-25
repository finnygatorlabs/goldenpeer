const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { generateToken, generateRefreshToken, verifyToken } = require("../middleware/auth");

const BCRYPT_ROUNDS = 12;

exports.signup = async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Email and password are required" },
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters" },
      });
    }

    const existing = await pool.query("SELECT user_id FROM ss_users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" },
      });
    }

    const password_hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO ss_users (email, password_hash, account_type, subscription_type)
       VALUES ($1, $2, 'B2C', 'FREE') RETURNING user_id, email, account_type, subscription_type, created_at`,
      [email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];

    await pool.query(
      `INSERT INTO user_profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)`,
      [user.user_id, first_name || null, last_name || null]
    );

    await pool.query(
      `INSERT INTO user_settings (user_id) VALUES ($1)`,
      [user.user_id]
    );

    const token = generateToken({ userId: user.user_id, email: user.email });
    const refresh_token = generateRefreshToken({ userId: user.user_id, email: user.email });

    res.status(201).json({
      user_id: user.user_id,
      token,
      refresh_token,
      subscription_type: user.subscription_type,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not create account" },
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Email and password are required" },
      });
    }

    const result = await pool.query(
      "SELECT user_id, email, password_hash, account_type, subscription_type FROM ss_users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
    }

    const user = result.rows[0];
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      });
    }

    await pool.query("UPDATE ss_users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1", [user.user_id]);

    const token = generateToken({ userId: user.user_id, email: user.email });
    const refresh_token = generateRefreshToken({ userId: user.user_id, email: user.email });

    res.json({
      user_id: user.user_id,
      token,
      refresh_token,
      subscription_type: user.subscription_type,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Login failed" },
    });
  }
};

exports.logout = async (req, res) => {
  res.json({ success: true });
};

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "refresh_token is required" },
      });
    }

    const decoded = verifyToken(refresh_token);
    if (!decoded || decoded.type !== "refresh") {
      return res.status(401).json({
        error: { code: "INVALID_TOKEN", message: "Invalid or expired refresh token" },
      });
    }

    const result = await pool.query("SELECT user_id, email FROM ss_users WHERE user_id = $1", [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: { code: "USER_NOT_FOUND", message: "User no longer exists" },
      });
    }

    const user = result.rows[0];
    const token = generateToken({ userId: user.user_id, email: user.email });
    const new_refresh_token = generateRefreshToken({ userId: user.user_id, email: user.email });

    res.json({ token, refresh_token: new_refresh_token });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not refresh token" },
    });
  }
};

exports.passwordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Email is required" },
      });
    }

    res.json({ success: true, message: "If an account exists with this email, a reset link has been sent" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.json({ success: true, message: "If an account exists with this email, a reset link has been sent" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, verification_code } = req.body;
    if (!email || !verification_code) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Email and verification_code are required" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Verification failed" },
    });
  }
};
