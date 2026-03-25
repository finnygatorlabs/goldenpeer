const express = require("express");
const router = express.Router();
const emergencyController = require("../controllers/emergencyController");
const { requireAuth } = require("../middleware/auth");

router.post("/sos", requireAuth, emergencyController.sos);
router.post("/notify-family", requireAuth, emergencyController.notifyFamily);

module.exports = router;
