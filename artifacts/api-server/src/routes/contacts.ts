import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { contactsTable } from "@workspace/db";
import { eq, and, desc, ilike } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/add", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { contact_name, phone_number, email, category, favorite_task } = req.body;
    if (!contact_name) {
      res.status(400).json({ error: "Bad Request", message: "contact_name is required" });
      return;
    }

    const [contact] = await db.insert(contactsTable).values({
      user_id: req.user!.userId,
      contact_name,
      phone_number: phone_number || null,
      email: email || null,
      category: category || "other",
      favorite_task: favorite_task || null,
    }).returning();

    res.status(201).json({ contact_id: contact.id, created_at: contact.created_at });
  } catch (err) {
    req.log.error({ err }, "Add contact error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/list", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { category } = req.query;
    let query = db.select().from(contactsTable)
      .where(eq(contactsTable.user_id, req.user!.userId))
      .orderBy(desc(contactsTable.usage_count))
      .$dynamic();

    const contacts = await query;

    const filtered = category
      ? contacts.filter(c => c.category === category)
      : contacts;

    res.json({ contacts: filtered, total_count: filtered.length });
  } catch (err) {
    req.log.error({ err }, "List contacts error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/suggestions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const contacts = await db.select().from(contactsTable)
      .where(eq(contactsTable.user_id, req.user!.userId))
      .orderBy(desc(contactsTable.usage_count))
      .limit(5);

    res.json({ suggestions: contacts.map(c => ({ contact_id: c.id, contact_name: c.contact_name, category: c.category, usage_count: c.usage_count })) });
  } catch (err) {
    req.log.error({ err }, "Contact suggestions error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [contact] = await db.select().from(contactsTable)
      .where(and(eq(contactsTable.id, req.params.id), eq(contactsTable.user_id, req.user!.userId)))
      .limit(1);

    if (!contact) {
      res.status(404).json({ error: "Not Found", message: "Contact not found" });
      return;
    }

    res.json(contact);
  } catch (err) {
    req.log.error({ err }, "Get contact error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { contact_name, phone_number, email, category, favorite_task } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (email !== undefined) updates.email = email;
    if (category !== undefined) updates.category = category;
    if (favorite_task !== undefined) updates.favorite_task = favorite_task;

    const [updated] = await db.update(contactsTable)
      .set(updates as any)
      .where(and(eq(contactsTable.id, req.params.id), eq(contactsTable.user_id, req.user!.userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found", message: "Contact not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Update contact error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [deleted] = await db.delete(contactsTable)
      .where(and(eq(contactsTable.id, req.params.id), eq(contactsTable.user_id, req.user!.userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Not Found", message: "Contact not found" });
      return;
    }

    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete contact error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
