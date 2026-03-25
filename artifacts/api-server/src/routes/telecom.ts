import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { telecomAccountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/connect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { carrier, carrier_user_id, carrier_phone } = req.body;
    if (!carrier) {
      res.status(400).json({ error: "Bad Request", message: "carrier is required (verizon, att, tmobile)" });
      return;
    }

    const [account] = await db.insert(telecomAccountsTable).values({
      user_id: req.user!.userId,
      carrier,
      carrier_user_id: carrier_user_id || null,
      carrier_phone: carrier_phone || null,
      subscription_status: "active",
    }).returning();

    res.status(201).json({ account_id: account.id, carrier: account.carrier, status: "active" });
  } catch (err) {
    req.log.error({ err }, "Telecom connect error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const accounts = await db.select().from(telecomAccountsTable)
      .where(eq(telecomAccountsTable.user_id, req.user!.userId));

    res.json({ accounts });
  } catch (err) {
    req.log.error({ err }, "Telecom status error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { account_id } = req.body;
    if (!account_id) {
      res.status(400).json({ error: "Bad Request", message: "account_id is required" });
      return;
    }

    const [updated] = await db.update(telecomAccountsTable)
      .set({ subscription_status: "disconnected", updated_at: new Date() })
      .where(and(eq(telecomAccountsTable.id, account_id), eq(telecomAccountsTable.user_id, req.user!.userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ success: true, message: "Telecom account disconnected" });
  } catch (err) {
    req.log.error({ err }, "Telecom disconnect error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    req.log.info({ body: req.body }, "Telecom webhook received");
    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Telecom webhook error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
