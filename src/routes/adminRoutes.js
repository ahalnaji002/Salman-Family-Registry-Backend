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
  getExportStats,

  // Settings
  getSystemSettings,
  updateSystemSettings,
  openRegistration,
  closeRegistration,
  openGlobalEditing,
  closeGlobalEditing,

  // Backups
  createBackup,
  getLatestBackup,

  // Supervisors
  assignSupervisor,
  getSupervisors,
  getSupervisor,
  updateSupervisor,
  toggleSupervisorStatus,
  deleteSupervisor,
  updateSupervisorPermissions,
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
router.get("/export/families/stats", getExportStats);

// Settings
router.get("/settings", getSystemSettings);
router.patch("/settings", updateSystemSettings);
router.patch("/settings/registration/open", openRegistration);
router.patch("/settings/registration/close", closeRegistration);
router.patch("/settings/editing/open", openGlobalEditing);
router.patch("/settings/editing/close", closeGlobalEditing);

// Backups
router.post("/backups", createBackup);
router.get("/backups/latest", getLatestBackup);

// Supervisors
router.post("/supervisors", assignSupervisor);
router.get("/supervisors", getSupervisors);
router.get("/supervisors/:supervisorId", getSupervisor);
router.patch("/supervisors/:supervisorId", updateSupervisor);
router.patch("/supervisors/:supervisorId/status", toggleSupervisorStatus);
router.delete("/supervisors/:supervisorId", deleteSupervisor);
router.put(
  "/supervisors/:supervisorId/permissions",
  updateSupervisorPermissions,
);

module.exports = router;
