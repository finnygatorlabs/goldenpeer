import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { userTiersTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [tier] = await db
      .select()
      .from(userTiersTable)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .limit(1);

    if (!tier) {
      res.json({
        tier: "free",
        status: "active",
        billing_cycle: null,
        trial_end_date: null,
        premium_end_date: null,
      });
      return;
    }

    res.json({
      tier: tier.tier,
      status: tier.status,
      billing_cycle: tier.billing_cycle,
      trial_end_date: tier.trial_end_date,
      premium_end_date: tier.premium_end_date,
      stripe_subscription_id: tier.stripe_subscription_id,
    });
  } catch (err) {
    req.log.error({ err }, "Get subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billing_cycle } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (billing_cycle !== undefined) updates.billing_cycle = billing_cycle;

    const [updated] = await db.update(userTiersTable)
      .set(updates as any)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ success: true, tier: updated.tier, billing_cycle: updated.billing_cycle });
  } catch (err) {
    req.log.error({ err }, "Update subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/subscription", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [updated] = await db.update(userTiersTable)
      .set({ tier: "free", status: "cancelled", billing_cycle: null, stripe_subscription_id: null, updated_at: new Date() } as any)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ success: true, message: "Subscription cancelled. You will retain access until the end of your billing period." });
  } catch (err) {
    req.log.error({ err }, "Cancel subscription error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/trial-status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [tier] = await db.select().from(userTiersTable)
      .where(eq(userTiersTable.user_id, req.user!.userId))
      .limit(1);

    if (!tier || !tier.trial_end_date) {
      res.json({ trial_active: false, trial_days_remaining: 0 });
      return;
    }

    const trialEnd = new Date(tier.trial_end_date);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      trial_active: daysRemaining > 0,
      trial_days_remaining: daysRemaining,
      trial_end_date: tier.trial_end_date,
    });
  } catch (err) {
    req.log.error({ err }, "Trial status error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/invoices", requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ invoices: [], message: "Invoice history requires Stripe integration" });
  } catch (err) {
    req.log.error({ err }, "Get invoices error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create-checkout", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { billing_cycle } = req.body;

    const stripeKey = process.env.STRIPE_API_KEY;
    if (!stripeKey) {
      res.status(503).json({ error: "Billing not configured", message: "Stripe integration is not set up yet." });
      return;
    }

    const priceIds: Record<string, string> = {
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID || "price_monthly",
      annual: process.env.STRIPE_ANNUAL_PRICE_ID || "price_annual",
    };

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost";
    const baseUrl = `https://${domains}`;

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price]": priceIds[billing_cycle] || priceIds.monthly,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        success_url: `${baseUrl}/billing/success`,
        cancel_url: `${baseUrl}/billing/cancel`,
        client_reference_id: req.user!.userId,
      }),
    });

    const session = await response.json() as any;
    res.json({ checkout_url: session.url });
  } catch (err) {
    req.log.error({ err }, "Create checkout error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    req.log.info({ type: req.body?.type }, "Stripe webhook received");
    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Billing webhook error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
