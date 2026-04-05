const { pool } = require("../config/database");

function createOAuthCallback(carrier) {
  return async (req, res) => {
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
        message: `${carrier} account linked successfully (stub — requires real partner credentials)`,
      });
    } catch (err) {
      console.error(`${carrier} OAuth error:`, err);
      res.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: `Could not link ${carrier} account` },
      });
    }
  };
}

exports.verizonCallback = createOAuthCallback("Verizon");
exports.attCallback = createOAuthCallback("AT&T");
exports.tmobileCallback = createOAuthCallback("T-Mobile");

exports.getStatus = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT telecom_id, carrier, carrier_phone, subscription_status, created_at FROM ss_telecom_accounts WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ carrier: null, status: null, phone: null });
    }

    const account = result.rows[0];
    res.json({
      carrier: account.carrier,
      status: account.subscription_status,
      phone: account.carrier_phone,
    });
  } catch (err) {
    console.error("Telecom status error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve telecom status" },
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const { carrier } = req.body;

    if (!carrier) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "carrier is required" },
      });
    }

    await pool.query(
      "UPDATE ss_telecom_accounts SET subscription_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND carrier = $2",
      [req.user.userId, carrier.toUpperCase()]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Telecom disconnect error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not disconnect carrier" },
    });
  }
};

exports.billingWebhook = async (req, res) => {
  try {
    res.json({ received: true });
  } catch (err) {
    console.error("Telecom webhook error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Webhook processing failed" },
    });
  }
};
