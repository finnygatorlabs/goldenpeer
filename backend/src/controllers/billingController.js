const { pool } = require("../config/database");

exports.checkout = async (req, res) => {
  try {
    const { subscription_type, billing_cycle } = req.body;

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(503).json({
        error: { code: "SERVICE_UNAVAILABLE", message: "Billing service not configured" },
      });
    }

    const stripe = require("stripe")(stripeKey);

    const priceIds = {
      PREMIUM_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly",
      PREMIUM_annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || "price_premium_annual",
      FAMILY_monthly: process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID || "price_family_monthly",
      FAMILY_annual: process.env.STRIPE_FAMILY_ANNUAL_PRICE_ID || "price_family_annual",
    };

    const priceKey = `${subscription_type || "PREMIUM"}_${billing_cycle || "monthly"}`;
    const priceId = priceIds[priceKey] || priceIds.PREMIUM_monthly;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.APP_URL || "https://seniorshield.app"}/billing/success`,
      cancel_url: `${process.env.APP_URL || "https://seniorshield.app"}/billing/cancel`,
      client_reference_id: req.user.userId,
    });

    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not create checkout session" },
    });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT subscription_id, subscription_type, subscription_source, external_subscription_id,
              status, current_period_start, current_period_end, cancel_at_period_end
       FROM ss_subscriptions WHERE user_id = $1 AND status != 'CANCELLED'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      const userResult = await pool.query(
        "SELECT subscription_type FROM ss_users WHERE user_id = $1",
        [req.user.userId]
      );
      return res.json({
        subscription_type: userResult.rows[0]?.subscription_type || "FREE",
        status: "ACTIVE",
        subscription_source: null,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve subscription" },
    });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { subscription_type } = req.body;

    if (!subscription_type || !["FREE", "PREMIUM", "FAMILY"].includes(subscription_type)) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "subscription_type must be FREE, PREMIUM, or FAMILY" },
      });
    }

    await pool.query(
      "UPDATE ss_users SET subscription_type = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
      [req.user.userId, subscription_type]
    );

    const result = await pool.query(
      `UPDATE ss_subscriptions SET subscription_type = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'ACTIVE' RETURNING *`,
      [req.user.userId, subscription_type]
    );

    res.json({ success: true, subscription: result.rows[0] || { subscription_type } });
  } catch (err) {
    console.error("Update subscription error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update subscription" },
    });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    await pool.query(
      `UPDATE ss_subscriptions SET status = 'CANCELLED', cancel_at_period_end = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'ACTIVE'`,
      [req.user.userId]
    );

    await pool.query(
      "UPDATE ss_users SET subscription_type = 'FREE', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
      [req.user.userId]
    );

    res.json({ success: true, message: "Subscription cancelled" });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not cancel subscription" },
    });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    res.json({ invoices: [], total_count: 0 });
  } catch (err) {
    console.error("Get invoices error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve invoices" },
    });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const { payment_method_id } = req.body;

    if (!payment_method_id) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "payment_method_id is required" },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Update payment method error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not update payment method" },
    });
  }
};

exports.webhook = async (req, res) => {
  try {
    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({
        error: { code: "INVALID_INPUT", message: "Invalid webhook payload" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data?.object;
        if (session?.client_reference_id) {
          await pool.query(
            "UPDATE ss_users SET subscription_type = 'PREMIUM', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
            [session.client_reference_id]
          );

          await pool.query(
            `INSERT INTO ss_subscriptions (user_id, subscription_type, subscription_source, external_subscription_id, status)
             VALUES ($1, 'PREMIUM', 'STRIPE', $2, 'ACTIVE')
             ON CONFLICT DO NOTHING`,
            [session.client_reference_id, session.subscription || null]
          );
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data?.object;
        if (sub?.id) {
          await pool.query(
            "UPDATE ss_subscriptions SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE external_subscription_id = $1",
            [sub.id]
          );
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Webhook processing failed" },
    });
  }
};

exports.getTrialStatus = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT subscription_type, created_at FROM ss_users WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ trial_active: false, trial_days_remaining: 0 });
    }

    const user = result.rows[0];
    if (user.subscription_type !== "FREE") {
      return res.json({ trial_active: false, trial_days_remaining: 0 });
    }

    const createdAt = new Date(user.created_at);
    const trialEnd = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000)));

    res.json({
      trial_active: daysRemaining > 0,
      trial_days_remaining: daysRemaining,
    });
  } catch (err) {
    console.error("Trial status error:", err);
    res.status(500).json({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Could not retrieve trial status" },
    });
  }
};
