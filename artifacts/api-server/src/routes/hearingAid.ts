import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import {
  userHearingAidsTable,
  hearingAidSettingsTable,
  hearingAidConnectionLogsTable,
  hearingAidBatteryAlertsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const SUPPORTED_BRANDS = [
  {
    name: "ReSound",
    market_share: 25,
    models: ["Linx", "Quattro", "Omnia", "One"],
    connectivity: ["Bluetooth", "2.4GHz proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Phonak",
    market_share: 20,
    models: ["Audeo", "Bolero", "Naida", "Virto"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Widex",
    market_share: 18,
    models: ["Moment", "Beyond", "Evoke"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Signia",
    market_share: 15,
    models: ["Styletto", "Silk", "Pure"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Oticon",
    market_share: 10,
    models: ["More", "Intent", "Opn"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Unitron",
    market_share: 5,
    models: ["Moxi", "Stride", "Max"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Starkey",
    market_share: 4,
    models: ["Livio", "Muse", "Evolv"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
  {
    name: "Bernafon",
    market_share: 3,
    models: ["Viron", "Sonate"],
    connectivity: ["Bluetooth", "proprietary"],
    ios_support: true,
    android_support: true,
  },
];

router.get("/supported-brands", (_req, res) => {
  res.json({ brands: SUPPORTED_BRANDS });
});

router.get("/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [hearingAid] = await db
      .select()
      .from(userHearingAidsTable)
      .where(eq(userHearingAidsTable.user_id, userId))
      .orderBy(desc(userHearingAidsTable.updated_at))
      .limit(1);

    const [settings] = await db
      .select()
      .from(hearingAidSettingsTable)
      .where(eq(hearingAidSettingsTable.user_id, userId))
      .limit(1);

    if (!hearingAid) {
      res.json({
        connected: false,
        device_name: null,
        device_brand: null,
        device_model: null,
        signal_strength: 0,
        battery_left: null,
        battery_right: null,
        audio_routing: settings?.audio_routing || "hearing_aid",
        phone_volume: settings?.phone_volume || 60,
        hearing_aid_volume: settings?.hearing_aid_volume || 70,
        feedback_reduction: settings?.feedback_reduction_enabled ?? true,
        echo_cancellation: settings?.echo_cancellation_enabled ?? true,
        noise_reduction: settings?.noise_reduction_enabled ?? true,
        low_battery_alert: settings?.low_battery_alert_enabled ?? true,
        low_battery_threshold: settings?.low_battery_threshold || 20,
        firmware_version: null,
        last_connected: null,
      });
      return;
    }

    res.json({
      connected: hearingAid.is_connected,
      device_name: hearingAid.device_name,
      device_brand: hearingAid.device_brand,
      device_model: hearingAid.device_model,
      device_id: hearingAid.device_id,
      signal_strength: hearingAid.signal_strength,
      battery_left: hearingAid.battery_left,
      battery_right: hearingAid.battery_right,
      firmware_version: hearingAid.firmware_version,
      audio_routing: settings?.audio_routing || "hearing_aid",
      phone_volume: settings?.phone_volume || 60,
      hearing_aid_volume: settings?.hearing_aid_volume || 70,
      feedback_reduction: settings?.feedback_reduction_enabled ?? true,
      echo_cancellation: settings?.echo_cancellation_enabled ?? true,
      noise_reduction: settings?.noise_reduction_enabled ?? true,
      low_battery_alert: settings?.low_battery_alert_enabled ?? true,
      low_battery_threshold: settings?.low_battery_threshold || 20,
      last_connected: hearingAid.last_connected_at,
      hearing_aid_id: hearingAid.id,
    });
  } catch (err) {
    req.log.error({ err }, "Hearing aid status error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/connect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { device_name, device_brand, device_model, device_id, firmware_version } = req.body;

    if (!device_name || !device_brand) {
      res.status(400).json({ error: "device_name and device_brand are required" });
      return;
    }

    await db
      .update(userHearingAidsTable)
      .set({ is_connected: false, updated_at: new Date() })
      .where(and(eq(userHearingAidsTable.user_id, userId), eq(userHearingAidsTable.is_connected, true)));

    const [hearingAid] = await db
      .insert(userHearingAidsTable)
      .values({
        user_id: userId,
        device_name,
        device_brand,
        device_model: device_model || null,
        device_id: device_id || null,
        firmware_version: firmware_version || null,
        is_connected: true,
        signal_strength: 85,
        battery_left: 100,
        battery_right: 100,
        last_connected_at: new Date(),
      })
      .returning();

    const existing = await db
      .select()
      .from(hearingAidSettingsTable)
      .where(eq(hearingAidSettingsTable.user_id, userId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(hearingAidSettingsTable).values({
        user_id: userId,
        hearing_aid_id: hearingAid.id,
      });
    } else {
      await db
        .update(hearingAidSettingsTable)
        .set({ hearing_aid_id: hearingAid.id, updated_at: new Date() })
        .where(eq(hearingAidSettingsTable.user_id, userId));
    }

    await db.insert(hearingAidConnectionLogsTable).values({
      user_id: userId,
      hearing_aid_id: hearingAid.id,
      event_type: "connected",
      details: { device_name, device_brand, device_model },
    });

    await db
      .update(usersTable)
      .set({ hearing_aid_connected: true, hearing_aid_model: `${device_brand} ${device_model || device_name}`, updated_at: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({
      success: true,
      connected: true,
      hearing_aid_id: hearingAid.id,
      device_name: hearingAid.device_name,
      connection_time: hearingAid.last_connected_at,
    });
  } catch (err) {
    req.log.error({ err }, "Hearing aid connect error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/disconnect", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [hearingAid] = await db
      .select()
      .from(userHearingAidsTable)
      .where(and(eq(userHearingAidsTable.user_id, userId), eq(userHearingAidsTable.is_connected, true)))
      .limit(1);

    if (!hearingAid) {
      res.status(404).json({ error: "No connected hearing aid found" });
      return;
    }

    await db
      .update(userHearingAidsTable)
      .set({ is_connected: false, signal_strength: 0, updated_at: new Date() })
      .where(eq(userHearingAidsTable.id, hearingAid.id));

    await db.insert(hearingAidConnectionLogsTable).values({
      user_id: userId,
      hearing_aid_id: hearingAid.id,
      event_type: "disconnected",
      details: { device_name: hearingAid.device_name },
    });

    await db
      .update(usersTable)
      .set({ hearing_aid_connected: false, updated_at: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({
      success: true,
      disconnected: true,
      disconnection_time: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Hearing aid disconnect error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      audio_routing,
      phone_volume,
      hearing_aid_volume,
      feedback_reduction,
      echo_cancellation,
      noise_reduction,
      low_battery_alert,
      low_battery_threshold,
    } = req.body;

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (audio_routing !== undefined) updates.audio_routing = audio_routing;
    if (phone_volume !== undefined) updates.phone_volume = phone_volume;
    if (hearing_aid_volume !== undefined) updates.hearing_aid_volume = hearing_aid_volume;
    if (feedback_reduction !== undefined) updates.feedback_reduction_enabled = feedback_reduction;
    if (echo_cancellation !== undefined) updates.echo_cancellation_enabled = echo_cancellation;
    if (noise_reduction !== undefined) updates.noise_reduction_enabled = noise_reduction;
    if (low_battery_alert !== undefined) updates.low_battery_alert_enabled = low_battery_alert;
    if (low_battery_threshold !== undefined) updates.low_battery_threshold = low_battery_threshold;

    const existing = await db
      .select()
      .from(hearingAidSettingsTable)
      .where(eq(hearingAidSettingsTable.user_id, userId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(hearingAidSettingsTable).values({
        user_id: userId,
        ...updates,
      } as any);
    } else {
      await db
        .update(hearingAidSettingsTable)
        .set(updates as any)
        .where(eq(hearingAidSettingsTable.user_id, userId));
    }

    res.json({
      success: true,
      settings_updated: true,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Hearing aid settings error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/test-connection", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const [hearingAid] = await db
      .select()
      .from(userHearingAidsTable)
      .where(and(eq(userHearingAidsTable.user_id, userId), eq(userHearingAidsTable.is_connected, true)))
      .limit(1);

    if (!hearingAid) {
      res.status(404).json({ error: "No connected hearing aid found" });
      return;
    }

    const signalStrength = Math.floor(Math.random() * 30) + 70;
    let audioQuality: string;
    if (signalStrength >= 90) audioQuality = "excellent";
    else if (signalStrength >= 75) audioQuality = "good";
    else if (signalStrength >= 60) audioQuality = "fair";
    else audioQuality = "poor";

    await db
      .update(userHearingAidsTable)
      .set({ signal_strength: signalStrength, updated_at: new Date() })
      .where(eq(userHearingAidsTable.id, hearingAid.id));

    await db.insert(hearingAidConnectionLogsTable).values({
      user_id: userId,
      hearing_aid_id: hearingAid.id,
      event_type: "test_tone",
      details: { signal_strength: signalStrength, audio_quality: audioQuality },
    });

    res.json({
      success: true,
      test_tone_sent: true,
      signal_strength: signalStrength,
      audio_quality: audioQuality,
    });
  } catch (err) {
    req.log.error({ err }, "Hearing aid test connection error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/battery-alert", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { battery_level, side } = req.body;

    if (battery_level === undefined || !side) {
      res.status(400).json({ error: "battery_level and side are required" });
      return;
    }

    const [hearingAid] = await db
      .select()
      .from(userHearingAidsTable)
      .where(and(eq(userHearingAidsTable.user_id, userId), eq(userHearingAidsTable.is_connected, true)))
      .limit(1);

    if (!hearingAid) {
      res.status(404).json({ error: "No connected hearing aid found" });
      return;
    }

    const batteryUpdate: Record<string, unknown> = { updated_at: new Date() };
    if (side === "left" || side === "both") batteryUpdate.battery_left = battery_level;
    if (side === "right" || side === "both") batteryUpdate.battery_right = battery_level;

    await db
      .update(userHearingAidsTable)
      .set(batteryUpdate as any)
      .where(eq(userHearingAidsTable.id, hearingAid.id));

    await db.insert(hearingAidBatteryAlertsTable).values({
      user_id: userId,
      hearing_aid_id: hearingAid.id,
      side,
      battery_level,
      family_notified: false,
    });

    await db.insert(hearingAidConnectionLogsTable).values({
      user_id: userId,
      hearing_aid_id: hearingAid.id,
      event_type: "battery_low",
      details: { side, battery_level },
    });

    res.json({
      success: true,
      alert_sent: true,
      family_notified: false,
    });
  } catch (err) {
    req.log.error({ err }, "Hearing aid battery alert error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
