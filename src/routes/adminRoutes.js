const express = require("express");

const {
  // Admin Dashboard
  getDashboardStats,

  // Admin Families
  getFamilies,
  getFamilyDetails,
  createFamily,
  updateFamily,
  deleteFamily,
  restoreFamily,
  updateFamilyEditingStatus,
  updateFamilyFormStatus,

  // Export
  exportFamiliesExcel,

  //Settings
  getSystemSettings,
  updateSystemSettings,
} = require("../controllers/adminController");

const { authenticate } = require("../middlewares/authMiddleware");

const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

// Admin Dashboard
router.get("/dashboard/stats", getDashboardStats);

// Admin Families
router.get("/families", getFamilies);
router.post("/families", createFamily);
router.patch("/families/:familyId/restore", restoreFamily);
router.get("/families/:familyId", getFamilyDetails);
router.patch("/families/:familyId", updateFamily);
router.delete("/families/:familyId", deleteFamily);
router.patch("/families/:familyId/editing", updateFamilyEditingStatus);
router.patch("/families/:familyId/status", updateFamilyFormStatus);

// Export
router.get("/export/families", exportFamiliesExcel);

//Settings
router.get("/settings", getSystemSettings);
router.patch("/settings", updateSystemSettings);

module.exports = router;
