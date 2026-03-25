const express = require("express");
const router = express.Router();
const familyController = require("../controllers/familyController");
const { requireAuth } = require("../middleware/auth");

router.post("/add", requireAuth, familyController.addMember);
router.get("/members", requireAuth, familyController.getMembers);
router.get("/members/:family_id", requireAuth, familyController.getMember);
router.put("/members/:family_id", requireAuth, familyController.updateMember);
router.delete("/members/:family_id", requireAuth, familyController.deleteMember);
router.post("/alert", requireAuth, familyController.sendAlert);
router.get("/alerts", requireAuth, familyController.getAlerts);
router.post("/message", requireAuth, familyController.sendMessage);

module.exports = router;
