const express = require("express");
const router = express.Router();
const scamController = require("../controllers/scamController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { scamLimiter } = require("../middleware/rateLimit");

router.post("/analyze", requireAuth, scamLimiter, scamController.analyze);
router.get("/history", requireAuth, scamController.getHistory);
router.get("/history/:analysis_id", requireAuth, scamController.getHistoryDetail);
router.post("/report", requireAuth, scamController.report);
router.get("/library", requireAuth, scamController.getLibrary);
router.post("/library/update", requireAdmin, scamController.updateLibrary);

module.exports = router;
