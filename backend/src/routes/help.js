const express = require("express");
const router = express.Router();
const helpController = require("../controllers/helpController");
const { requireAuth } = require("../middleware/auth");

router.get("/faq", helpController.getFaq);
router.get("/tutorials", helpController.getTutorials);
router.post("/ticket", requireAuth, helpController.createTicket);
router.get("/ticket/:ticket_id", requireAuth, helpController.getTicket);

module.exports = router;
