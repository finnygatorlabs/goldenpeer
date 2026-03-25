const express = require("express");
const router = express.Router();
const contactsController = require("../controllers/contactsController");
const { requireAuth } = require("../middleware/auth");

router.post("/add", requireAuth, contactsController.addContact);
router.get("/list", requireAuth, contactsController.listContacts);
router.get("/suggestions", requireAuth, contactsController.getSuggestions);
router.get("/:contact_id", requireAuth, contactsController.getContact);
router.put("/:contact_id", requireAuth, contactsController.updateContact);
router.delete("/:contact_id", requireAuth, contactsController.deleteContact);

module.exports = router;
