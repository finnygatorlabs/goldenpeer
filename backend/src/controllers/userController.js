const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.email, u.account_type, u.subscription_type, u.created_at,
              p.first_name, p.last_name, p.phone_number, p.date_of_birth, 
              p.hearing_loss_level, p.tech_comfort_level
       FROM ss_users u
       LEFT JOIN user_profiles p ON u.user_id = p.user_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    const user = result.rows[0];
    res.json({
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone_number,
      dob: user.date_of_birth,
      hearing_loss: user.hearing_loss_level,
      tech_comfort: user.tech_comfort_level,
      account_type: user.account_type,
      subscription_type: user.subscription_type,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve profile" },
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, dob, hearing_loss, tech_comfort } = req.body;

    const result = await pool.query(
      `UPDATE user_profiles 
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           phone_number = COALESCE($4, phone_number),
           date_of_birth = COALESCE($5, date_of_birth),
           hearing_loss_level = COALESCE($6, hearing_loss_level),
           tech_comfort_level = COALESCE($7, tech_comfort_level),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [req.user.userId, first_name, last_name, phone, dob, hearing_loss, tech_comfort]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, phone_number, date_of_birth, hearing_loss_level, tech_comfort_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.userId, first_name, last_name, phone, dob, hearing_loss, tech_comfort]
      );
    }

    res.json({ success: true, profile: result.rows[0] || { first_name, last_name } });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update profile" },
    });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_settings WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        color_scheme: "LIGHT", font_size: "NORMAL", font_family: "SANS_SERIF",
        line_height: "NORMAL", letter_spacing: "NORMAL", high_contrast_enabled: false,
        captions_enabled: true, voice_gender: "FEMALE", voice_speed: 1.0,
        voice_volume: 80, hearing_aid_connected: false, hearing_aid_model: null,
      });
    }

    const s = result.rows[0];
    res.json({
      color_scheme: s.color_scheme, font_size: s.font_size, font_family: s.font_family,
      line_height: s.line_height, letter_spacing: s.letter_spacing,
      high_contrast_enabled: s.high_contrast_enabled, captions_enabled: s.captions_enabled,
      voice_gender: s.voice_gender, voice_speed: s.voice_speed, voice_volume: s.voice_volume,
      hearing_aid_connected: s.hearing_aid_connected, hearing_aid_model: s.hearing_aid_model,
    });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve settings" },
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const fields = [
      "color_scheme", "font_size", "font_family", "line_height", "letter_spacing",
      "high_contrast_enabled", "captions_enabled", "voice_gender", "voice_speed",
      "voice_volume", "hearing_aid_connected", "hearing_aid_model",
    ];

    const updates = [];
    const values = [req.user.userId];
    let idx = 2;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "No settings to update" },
      });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    const result = await pool.query(
      `UPDATE user_settings SET ${updates.join(", ")} WHERE user_id = $1 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Settings not found" },
      });
    }

    res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update settings" },
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Current and new passwords are required" },
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: { code: "WEAK_PASSWORD", message: "New password must be at least 8 characters" },
      });
    }

    const result = await pool.query(
      "SELECT password_hash FROM ss_users WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0 || !bcrypt.compareSync(current_password, result.rows[0].password_hash)) {
      return res.status(401).json({
        error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" },
      });
    }

    const newHash = bcrypt.hashSync(new_password, 12);
    await pool.query(
      "UPDATE ss_users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
      [req.user.userId, newHash]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not change password" },
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const result = await pool.query(
      "SELECT password_hash FROM ss_users WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    if (password && !bcrypt.compareSync(password, result.rows[0].password_hash)) {
      return res.status(401).json({
        error: { code: "INVALID_PASSWORD", message: "Password is incorrect" },
      });
    }

    await pool.query("DELETE FROM ss_users WHERE user_id = $1", [req.user.userId]);

    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not delete account" },
    });
  }
};
