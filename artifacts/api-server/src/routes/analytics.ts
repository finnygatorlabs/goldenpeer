import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { analyticsEventsTable, usersTable, voiceAssistanceHistoryTable, scamAnalysisTable, errorLogsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/events", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { event_type, event_data } = req.body;
    if (!event_type) {
      res.status(400).json({ error: "Bad Request", message: "event_type is required" });
      return;
    }

    const [event] = await db.insert(analyticsEventsTable).values({
      user_id: req.user!.userId,
      event_type,
      event_data: event_data || {},
    }).returning();

    res.status(201).json({ event_id: event.id, created_at: event.created_at });
  } catch (err) {
    req.log.error({ err }, "Track event error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/user-stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [voiceCount] = await db.select({ count: count() }).from(voiceAssistanceHistoryTable)
      .where(eq(voiceAssistanceHistoryTable.user_id, req.user!.userId));
    const [scamCount] = await db.select({ count: count() }).from(scamAnalysisTable)
      .where(eq(scamAnalysisTable.user_id, req.user!.userId));

    res.json({
      voice_requests: voiceCount?.count || 0,
      scam_analyses: scamCount?.count || 0,
    });
  } catch (err) {
    req.log.error({ err }, "User stats error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/engagement", requireAuth, async (req: AuthRequest, res) => {
  try {
    const events = await db.select().from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.user_id, req.user!.userId))
      .orderBy(desc(analyticsEventsTable.created_at))
      .limit(100);

    const eventCounts: Record<string, number> = {};
    for (const e of events) {
      eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
    }

    res.json({ events: eventCounts, total_events: events.length });
  } catch (err) {
    req.log.error({ err }, "Engagement stats error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/errors", requireAuth, async (req: AuthRequest, res) => {
  try {
    const errors = await db.select().from(errorLogsTable)
      .where(eq(errorLogsTable.user_id, req.user!.userId))
      .orderBy(desc(errorLogsTable.created_at))
      .limit(20);

    res.json({ errors });
  } catch (err) {
    req.log.error({ err }, "Error logs error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
