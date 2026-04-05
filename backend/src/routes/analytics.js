const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { requireAdmin } = require("../middleware/auth");

router.get("/events", requireAdmin, analyticsController.getEvents);
router.get("/users", requireAdmin, analyticsController.getUsers);
router.get("/engagement", requireAdmin, analyticsController.getEngagement);
router.get("/errors", requireAdmin, analyticsController.getErrors);

module.exports = router;
