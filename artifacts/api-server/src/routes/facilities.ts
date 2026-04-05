import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { facilityAccountsTable, facilityResidentsTable, usersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";
import crypto from "crypto";

const router: IRouter = Router();

router.post("/register", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { facility_name, facility_type, address, city, state, zip, phone, email } = req.body;
    if (!facility_name) {
      res.status(400).json({ error: "Bad Request", message: "facility_name is required" });
      return;
    }

    const facility_code = "FAC-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const [facility] = await db.insert(facilityAccountsTable).values({
      facility_name,
      facility_type: facility_type || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      phone: phone || null,
      email: email || null,
      admin_user_id: req.user!.userId,
      facility_code,
      subscription_status: "active",
    }).returning();

    res.status(201).json({ facility_id: facility.id, facility_code: facility.facility_code });
  } catch (err) {
    req.log.error({ err }, "Facility register error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function verifyFacilityAdmin(req: AuthRequest, res: any, facilityId: string): Promise<boolean> {
  const [facility] = await db.select().from(facilityAccountsTable)
    .where(eq(facilityAccountsTable.id, facilityId)).limit(1);

  if (!facility) {
    res.status(404).json({ error: "Not Found", message: "Facility not found" });
    return false;
  }

  if (facility.admin_user_id !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden", message: "You are not the admin of this facility" });
    return false;
  }

  return true;
}

router.get("/:facilityId", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await verifyFacilityAdmin(req, res, req.params.facilityId))) return;

    const [facility] = await db.select().from(facilityAccountsTable)
      .where(eq(facilityAccountsTable.id, req.params.facilityId)).limit(1);

    res.json(facility);
  } catch (err) {
    req.log.error({ err }, "Get facility error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:facilityId", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await verifyFacilityAdmin(req, res, req.params.facilityId))) return;

    const allowed = ["facility_name", "facility_type", "address", "city", "state", "zip", "phone", "email"];
    const updates: Record<string, unknown> = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [updated] = await db.update(facilityAccountsTable)
      .set(updates as any)
      .where(eq(facilityAccountsTable.id, req.params.facilityId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update facility error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:facilityId", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await verifyFacilityAdmin(req, res, req.params.facilityId))) return;

    await db.delete(facilityAccountsTable).where(eq(facilityAccountsTable.id, req.params.facilityId));

    res.json({ success: true, message: "Facility deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete facility error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:facilityId/residents", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await verifyFacilityAdmin(req, res, req.params.facilityId))) return;

    const { user_id, resident_name } = req.body;
    if (!user_id) {
      res.status(400).json({ error: "Bad Request", message: "user_id is required" });
      return;
    }

    const [resident] = await db.insert(facilityResidentsTable).values({
      facility_id: req.params.facilityId,
      user_id,
      resident_name: resident_name || null,
      status: "active",
    }).returning();

    res.status(201).json({ resident_id: resident.id });
  } catch (err) {
    req.log.error({ err }, "Add resident error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:facilityId/residents", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await verifyFacilityAdmin(req, res, req.params.facilityId))) return;

    const residents = await db.select().from(facilityResidentsTable)
      .where(eq(facilityResidentsTable.facility_id, req.params.facilityId))
      .orderBy(desc(facilityResidentsTable.created_at));

    res.json({ residents });
  } catch (err) {
    req.log.error({ err }, "List residents error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:facilityId/dashboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!(await verifyFacilityAdmin(req, res, req.params.facilityId))) return;

    const [residentCount] = await db.select({ count: count() }).from(facilityResidentsTable)
      .where(eq(facilityResidentsTable.facility_id, req.params.facilityId));

    res.json({
      total_residents: residentCount?.count || 0,
      facility_id: req.params.facilityId,
    });
  } catch (err) {
    req.log.error({ err }, "Facility dashboard error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
