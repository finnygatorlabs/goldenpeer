const { pool } = require("../config/database");

exports.addContact = async (req, res) => {
  try {
    const { contact_name, phone_number, email, category, favorite_task } = req.body;

    if (!contact_name) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "contact_name is required" },
      });
    }

    const result = await pool.query(
      `INSERT INTO ss_contacts (user_id, contact_name, phone_number, email, category, favorite_task)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING contact_id, created_at`,
      [req.user.userId, contact_name, phone_number || null, email || null,
       category || "OTHER", favorite_task || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Add contact error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not add contact" },
    });
  }
};

exports.listContacts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT contact_id, contact_name, phone_number, email, category, favorite_task, usage_count, created_at
       FROM ss_contacts WHERE user_id = $1
       ORDER BY usage_count DESC, contact_name ASC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM ss_contacts WHERE user_id = $1",
      [req.user.userId]
    );

    res.json({ contacts: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("List contacts error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve contacts" },
    });
  }
};

exports.getContact = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT contact_id, contact_name, phone_number, email, category, favorite_task, usage_count, created_at, updated_at
       FROM ss_contacts WHERE contact_id = $1 AND user_id = $2`,
      [req.params.contact_id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Contact not found" },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get contact error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve contact" },
    });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const { contact_name, phone_number, email, category, favorite_task } = req.body;

    const result = await pool.query(
      `UPDATE ss_contacts
       SET contact_name = COALESCE($3, contact_name),
           phone_number = COALESCE($4, phone_number),
           email = COALESCE($5, email),
           category = COALESCE($6, category),
           favorite_task = COALESCE($7, favorite_task),
           updated_at = CURRENT_TIMESTAMP
       WHERE contact_id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.contact_id, req.user.userId, contact_name, phone_number, email, category, favorite_task]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Contact not found" },
      });
    }

    res.json({ success: true, contact: result.rows[0] });
  } catch (err) {
    console.error("Update contact error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update contact" },
    });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM ss_contacts WHERE contact_id = $1 AND user_id = $2 RETURNING contact_id",
      [req.params.contact_id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Contact not found" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete contact error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not delete contact" },
    });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT contact_id, contact_name, phone_number, category, favorite_task, usage_count
       FROM ss_contacts WHERE user_id = $1
       ORDER BY usage_count DESC LIMIT 5`,
      [req.user.userId]
    );

    res.json({ suggestions: result.rows });
  } catch (err) {
    console.error("Contact suggestions error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve suggestions" },
    });
  }
};
