const { pool } = require("../config/database");

exports.medicareCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "code and state are required" },
      });
    }

    res.json({
      success: true,
      subscription_upgraded: true,
      message: "Medicare account linked successfully (stub — requires real partner credentials)",
    });
  } catch (err) {
    console.error("Medicare OAuth error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not link Medicare account" },
    });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT insurance_id, insurance_provider, member_id, subscription_status, created_at FROM ss_insurance_accounts WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ insurance_provider: null, status: null, member_id: null });
    }

    const account = result.rows[0];
    res.json({
      insurance_provider: account.insurance_provider,
      status: account.subscription_status,
      member_id: account.member_id,
    });
  } catch (err) {
    console.error("Insurance status error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve insurance status" },
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const { insurance_provider } = req.body;

    if (!insurance_provider) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "insurance_provider is required" },
      });
    }

    await pool.query(
      "UPDATE ss_insurance_accounts SET subscription_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND insurance_provider = $2",
      [req.user.userId, insurance_provider.toUpperCase()]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Insurance disconnect error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not disconnect insurance" },
    });
  }
};

exports.billingWebhook = async (req, res) => {
  try {
    res.json({ received: true });
  } catch (err) {
    console.error("Insurance webhook error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Webhook processing failed" },
    });
  }
};

exports.getPlans = async (req, res) => {
  try {
    res.json({
      plans: [
        { name: "Medicare Advantage Basic", provider: "UNITEDHEALTHCARE", includes_seniorshield: true, monthly_cost: 0 },
        { name: "Medicare Advantage Plus", provider: "HUMANA", includes_seniorshield: true, monthly_cost: 0 },
        { name: "Medicare Advantage Premium", provider: "ANTHEM", includes_seniorshield: true, monthly_cost: 0 },
      ],
    });
  } catch (err) {
    console.error("Insurance plans error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve plans" },
    });
  }
};

exports.verifyMember = async (req, res) => {
  try {
    const { member_id, dob } = req.body;

    if (!member_id || !dob) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "member_id and dob are required" },
      });
    }

    res.json({ valid: true, message: "Member verification stub — requires real insurance API" });
  } catch (err) {
    console.error("Verify member error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not verify member" },
    });
  }
};
