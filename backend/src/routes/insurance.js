const express = require("express");
const router = express.Router();
const insuranceController = require("../controllers/insuranceController");
const { requireAuth } = require("../middleware/auth");

router.post("/medicare/oauth/callback", insuranceController.medicareCallback);
router.get("/status", requireAuth, insuranceController.getStatus);
router.post("/disconnect", requireAuth, insuranceController.disconnect);
router.post("/billing/webhook", insuranceController.billingWebhook);
router.get("/plans", insuranceController.getPlans);
router.post("/verify-member", insuranceController.verifyMember);

module.exports = router;
