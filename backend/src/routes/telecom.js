const express = require("express");
const router = express.Router();
const telecomController = require("../controllers/telecomController");
const { requireAuth } = require("../middleware/auth");

router.post("/verizon/oauth/callback", telecomController.verizonCallback);
router.post("/att/oauth/callback", telecomController.attCallback);
router.post("/tmobile/oauth/callback", telecomController.tmobileCallback);
router.get("/status", requireAuth, telecomController.getStatus);
router.post("/disconnect", requireAuth, telecomController.disconnect);
router.post("/billing/webhook", telecomController.billingWebhook);

module.exports = router;
