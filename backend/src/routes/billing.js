const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");
const { requireAuth } = require("../middleware/auth");

router.post("/checkout", requireAuth, billingController.checkout);
router.get("/subscription", requireAuth, billingController.getSubscription);
router.put("/subscription", requireAuth, billingController.updateSubscription);
router.delete("/subscription", requireAuth, billingController.cancelSubscription);
router.get("/invoices", requireAuth, billingController.getInvoices);
router.put("/payment-method", requireAuth, billingController.updatePaymentMethod);
router.post("/webhook", billingController.webhook);
router.get("/trial-status", requireAuth, billingController.getTrialStatus);

module.exports = router;
