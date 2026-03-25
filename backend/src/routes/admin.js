const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin, requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");

router.post("/login", authLimiter, adminController.login);
router.get("/dashboard/metrics", requireAdmin, adminController.getDashboardMetrics);
router.get("/users", requireAdmin, adminController.getUsers);
router.get("/users/:user_id", requireAdmin, adminController.getUser);
router.put("/users/:user_id", requireAdmin, adminController.updateUser);
router.delete("/users/:user_id", requireAdmin, adminController.deleteUser);
router.get("/facilities", requireAdmin, adminController.getFacilities);
router.get("/telecom/partners", requireAdmin, adminController.getTelecomPartners);
router.get("/insurance/partners", requireAdmin, adminController.getInsurancePartners);
router.get("/financial/revenue", requireAdmin, adminController.getRevenue);
router.get("/financial/invoices", requireAdmin, adminController.getInvoices);
router.get("/support/tickets", requireAdmin, adminController.getTickets);
router.get("/analytics/users", requireAdmin, adminController.getAnalyticsUsers);
router.get("/analytics/engagement", requireAdmin, adminController.getAnalyticsEngagement);
router.get("/analytics/scams", requireAdmin, adminController.getAnalyticsScams);
router.get("/analytics/churn", requireAdmin, adminController.getAnalyticsChurn);
router.get("/settings", requireAdmin, adminController.getSettings);
router.put("/settings", requireAdmin, adminController.updateSettings);
router.post("/staff/add", requireAdmin, adminController.addStaff);
router.get("/staff", requireAdmin, adminController.getStaff);

module.exports = router;
