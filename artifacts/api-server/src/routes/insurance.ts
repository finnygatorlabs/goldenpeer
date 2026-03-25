import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { insuranceAccountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/connect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { insurance_provider, member_id, member_dob } = req.body;
    if (!insurance_provider) {
      res.status(400).json({ error: "Bad Request", message: "insurance_provider is required" });
      return;
    }

    const [account] = await db.insert(insuranceAccountsTable).values({
      user_id: req.user!.userId,
      insurance_provider,
      member_id: member_id || null,
      member_dob: member_dob || null,
      subscription_status: "active",
    }).returning();

    res.status(201).json({ account_id: account.id, provider: account.insurance_provider, status: "active" });
  } catch (err) {
    req.log.error({ err }, "Insurance connect error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const accounts = await db.select().from(insuranceAccountsTable)
      .where(eq(insuranceAccountsTable.user_id, req.user!.userId));

    res.json({ accounts });
  } catch (err) {
    req.log.error({ err }, "Insurance status error");
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

    const [updated] = await db.update(insuranceAccountsTable)
      .set({ subscription_status: "disconnected", updated_at: new Date() })
      .where(and(eq(insuranceAccountsTable.id, account_id), eq(insuranceAccountsTable.user_id, req.user!.userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ success: true, message: "Insurance account disconnected" });
  } catch (err) {
    req.log.error({ err }, "Insurance disconnect error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verify-member", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { member_id, member_dob } = req.body;
    if (!member_id || !member_dob) {
      res.status(400).json({ error: "Bad Request", message: "member_id and member_dob are required" });
      return;
    }

    res.json({ verified: true, message: "Member verification is a stub — requires real insurance API integration" });
  } catch (err) {
    req.log.error({ err }, "Insurance verify error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/plans", requireAuth, async (_req: AuthRequest, res) => {
  res.json({
    plans: [
      { id: "medicare_a", name: "Medicare Part A", description: "Hospital Insurance" },
      { id: "medicare_b", name: "Medicare Part B", description: "Medical Insurance" },
      { id: "medicare_d", name: "Medicare Part D", description: "Prescription Drug Coverage" },
      { id: "medigap", name: "Medigap", description: "Medicare Supplement Insurance" },
    ],
  });
});

router.post("/webhook", async (req, res) => {
  try {
    req.log.info({ body: req.body }, "Insurance webhook received");
    res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Insurance webhook error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
