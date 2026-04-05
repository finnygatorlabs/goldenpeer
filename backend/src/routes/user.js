const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { requireAuth } = require("../middleware/auth");

router.get("/profile", requireAuth, userController.getProfile);
router.put("/profile", requireAuth, userController.updateProfile);
router.get("/settings", requireAuth, userController.getSettings);
router.put("/settings", requireAuth, userController.updateSettings);
router.post("/password/change", requireAuth, userController.changePassword);
router.post("/account/delete", requireAuth, userController.deleteAccount);

module.exports = router;
