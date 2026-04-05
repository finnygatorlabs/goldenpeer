const { pool } = require("../config/database");

const URGENCY_KEYWORDS = [
  "urgent", "act now", "immediate action", "immediately", "today", "right now",
  "hurry", "deadline", "time-sensitive", "expiring", "limited time", "last chance",
  "verify now", "confirm now", "respond immediately", "within 24 hours", "action required",
];

const FINANCIAL_KEYWORDS = [
  "payment", "transfer", "wire transfer", "credit card", "gift card", "bitcoin",
  "send money", "refund", "invoice", "billing", "account number", "western union",
  "cash app", "venmo", "zelle", "money order",
];

const THREAT_KEYWORDS = [
  "suspended", "locked", "compromised", "fraud", "unauthorized", "hacked",
  "security breach", "virus", "malware", "legal action", "arrest", "warrant", "penalty",
];

const REQUEST_KEYWORDS = [
  "password", "pin", "social security number", "ssn", "account number",
  "credit card number", "verification code", "click here", "download",
  "call this number", "verify your account", "confirm your identity",
];

function analyzeText(text) {
  const lower = text.toLowerCase();
  let score = 0;
  const detected_patterns = [];

  const urgencyHits = URGENCY_KEYWORDS.filter((k) => lower.includes(k));
  if (urgencyHits.length > 0) {
    score += Math.min(urgencyHits.length * 5, 20);
    detected_patterns.push("urgency_language");
  }

  const financialHits = FINANCIAL_KEYWORDS.filter((k) => lower.includes(k));
  if (financialHits.length > 0) {
    score += Math.min(financialHits.length * 5, 20);
    detected_patterns.push("financial_request");
  }

  const threatHits = THREAT_KEYWORDS.filter((k) => lower.includes(k));
  if (threatHits.length > 0) {
    score += Math.min(threatHits.length * 5, 25);
    detected_patterns.push("threat_language");
  }

  const requestHits = REQUEST_KEYWORDS.filter((k) => lower.includes(k));
  if (requestHits.length > 0) {
    score += Math.min(requestHits.length * 8, 25);
    detected_patterns.push("sensitive_info_request");
  }

  const urlMatch = text.match(/https?:\/\/[^\s]+/g);
  if (urlMatch && urlMatch.length > 0) {
    score += 5;
    detected_patterns.push("contains_links");
  }

  if (urgencyHits.length > 0 && financialHits.length > 0) {
    score += 10;
    detected_patterns.push("urgency_plus_financial");
  }

  score = Math.min(score, 100);

  let risk_level;
  if (score <= 20) risk_level = "SAFE";
  else if (score <= 40) risk_level = "LOW";
  else if (score <= 60) risk_level = "MEDIUM";
  else if (score <= 80) risk_level = "HIGH";
  else risk_level = "CRITICAL";

  let explanation, recommended_action;
  if (risk_level === "SAFE") {
    explanation = "This message appears safe. No significant scam indicators were detected.";
    recommended_action = "No action needed, but always stay cautious.";
  } else if (risk_level === "LOW") {
    explanation = "This message has minor warning signs. It might be legitimate but proceed with caution.";
    recommended_action = "Verify the sender before responding.";
  } else if (risk_level === "MEDIUM") {
    explanation = "This message has several suspicious characteristics. Do not click any links or provide personal information.";
    recommended_action = "Do not respond. Verify with the company directly using a known phone number.";
  } else if (risk_level === "HIGH") {
    explanation = "WARNING: This message shows multiple high-risk scam indicators. Do NOT interact with it.";
    recommended_action = "Do NOT respond, click links, or share any information. Consider reporting this.";
  } else {
    explanation = "CRITICAL WARNING: This message is almost certainly a scam. Delete it immediately.";
    recommended_action = "Delete immediately. Do not interact. Your family has been notified.";
  }

  return { risk_score: score, risk_level, detected_patterns, explanation, recommended_action };
}

exports.analyze = async (req, res) => {
  try {
    const { input_text } = req.body;
    if (!input_text) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "input_text is required" },
      });
    }

    const analysis = analyzeText(input_text);

    const result = await pool.query(
      `INSERT INTO scam_analyses (user_id, input_text, risk_score, risk_level, detected_patterns, explanation, recommended_action)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING analysis_id, created_at`,
      [req.user.userId, input_text, analysis.risk_score, analysis.risk_level,
       JSON.stringify(analysis.detected_patterns), analysis.explanation, analysis.recommended_action]
    );

    await pool.query(
      `INSERT INTO ss_analytics_events (user_id, event_type, event_data) VALUES ($1, 'SCAM_ANALYSIS', $2)`,
      [req.user.userId, JSON.stringify({ analysis_id: result.rows[0].analysis_id, risk_level: analysis.risk_level })]
    );

    res.json({
      analysis_id: result.rows[0].analysis_id,
      ...analysis,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    console.error("Scam analyze error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not analyze message" },
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      `SELECT analysis_id, input_text, risk_score, risk_level, detected_patterns, 
              explanation, recommended_action, user_reported_scam, family_notified, created_at
       FROM scam_analyses WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM scam_analyses WHERE user_id = $1",
      [req.user.userId]
    );

    res.json({ analyses: result.rows, total_count: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error("Scam history error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve history" },
    });
  }
};

exports.getHistoryDetail = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM scam_analyses WHERE analysis_id = $1 AND user_id = $2`,
      [req.params.analysis_id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Analysis not found" },
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Scam detail error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve analysis" },
    });
  }
};

exports.report = async (req, res) => {
  try {
    const { analysis_id, report_to_family } = req.body;

    if (analysis_id) {
      await pool.query(
        `UPDATE scam_analyses SET user_reported_scam = true, family_notified = $2 WHERE analysis_id = $1 AND user_id = $3`,
        [analysis_id, report_to_family || false, req.user.userId]
      );
    }

    res.json({ success: true, family_notified: report_to_family || false });
  } catch (err) {
    console.error("Scam report error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not submit report" },
    });
  }
};

exports.getLibrary = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM scam_library ORDER BY pattern_name"
    );

    res.json({ patterns: result.rows, total_patterns: result.rows.length });
  } catch (err) {
    console.error("Scam library error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve scam library" },
    });
  }
};

exports.updateLibrary = async (req, res) => {
  try {
    const { pattern_name, keywords, description, accuracy } = req.body;

    if (!pattern_name) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "pattern_name is required" },
      });
    }

    const result = await pool.query(
      `INSERT INTO scam_library (pattern_name, keywords, description, accuracy)
       VALUES ($1, $2, $3, $4)
       RETURNING pattern_id`,
      [pattern_name, JSON.stringify(keywords || []), description || null, accuracy || 0]
    );

    res.json({ success: true, pattern_id: result.rows[0].pattern_id });
  } catch (err) {
    console.error("Update scam library error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update library" },
    });
  }
};
