import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { alertsTable, familyRelationshipsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/sos", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { location, message } = req.body;

    const relationships = await db.select().from(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.senior_id, req.user!.userId));

    let notificationsSent = 0;

    for (const rel of relationships) {
      if (rel.adult_child_id) {
        await db.insert(alertsTable).values({
          recipient_id: rel.adult_child_id,
          alert_type: "emergency_sos",
          message: message || "Emergency SOS activated! Your family member needs immediate assistance.",
          related_senior_id: req.user!.userId,
        });
        notificationsSent++;
      }
    }

    res.json({
      success: true,
      family_notified: notificationsSent > 0,
      notifications_sent: notificationsSent,
      message: notificationsSent > 0
        ? `Emergency SOS sent. ${notificationsSent} family member(s) have been notified.`
        : "Emergency SOS activated. No family members to notify — please call 911 directly.",
    });
  } catch (err) {
    req.log.error({ err }, "Emergency SOS error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/notify-family", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { alert_type, message } = req.body;

    if (!alert_type || !message) {
      res.status(400).json({ error: "Bad Request", message: "alert_type and message are required" });
      return;
    }

    const relationships = await db.select().from(familyRelationshipsTable)
      .where(eq(familyRelationshipsTable.senior_id, req.user!.userId));

    let notificationsSent = 0;

    for (const rel of relationships) {
      if (rel.adult_child_id) {
        await db.insert(alertsTable).values({
          recipient_id: rel.adult_child_id,
          alert_type,
          message,
          related_senior_id: req.user!.userId,
        });
        notificationsSent++;
      }
    }

    res.json({ success: true, notifications_sent: notificationsSent });
  } catch (err) {
    req.log.error({ err }, "Notify family error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
