const express = require("express");
const router = express.Router();
const voiceController = require("../controllers/voiceController");
const { requireAuth } = require("../middleware/auth");

router.post("/request", requireAuth, voiceController.request);
router.get("/history", requireAuth, voiceController.getHistory);
router.get("/history/:request_id", requireAuth, voiceController.getHistoryDetail);
router.post("/feedback", requireAuth, voiceController.feedback);
router.get("/preferences", requireAuth, voiceController.getPreferences);
router.put("/preferences", requireAuth, voiceController.updatePreferences);

module.exports = router;
