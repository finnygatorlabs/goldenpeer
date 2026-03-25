const express = require("express");
const router = express.Router();
const facilitiesController = require("../controllers/facilitiesController");
const { requireAuth } = require("../middleware/auth");

router.post("/register", facilitiesController.register);
router.get("/:facility_id", requireAuth, facilitiesController.getFacility);
router.put("/:facility_id", requireAuth, facilitiesController.updateFacility);
router.delete("/:facility_id", requireAuth, facilitiesController.deleteFacility);
router.post("/:facility_id/residents/add", requireAuth, facilitiesController.addResident);
router.get("/:facility_id/residents", requireAuth, facilitiesController.getResidents);
router.get("/:facility_id/dashboard", requireAuth, facilitiesController.getDashboard);
router.get("/:facility_id/alerts", requireAuth, facilitiesController.getAlerts);
router.post("/billing/webhook", facilitiesController.billingWebhook);
router.get("/:facility_id/analytics", requireAuth, facilitiesController.getAnalytics);

module.exports = router;
