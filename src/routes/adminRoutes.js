const express = require("express");

const {
  getDashboardStats,
  getFamilies,
  getFamilyDetails,
  createFamily,
  updateFamily,
  deleteFamily,
  restoreFamily,
  updateFamilyEditingStatus,
  updateFamilyFormStatus,
  exportFamiliesExcel,
} = require("../controllers/adminController");

const { authenticate } = require("../middlewares/authMiddleware");

const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/dashboard/stats", getDashboardStats);
router.get("/families", getFamilies);
router.post("/families", createFamily);
router.patch("/families/:familyId/restore", restoreFamily);
router.get("/families/:familyId", getFamilyDetails);
router.patch("/families/:familyId", updateFamily);
router.delete("/families/:familyId", deleteFamily);
router.patch("/families/:familyId/editing", updateFamilyEditingStatus);
router.patch("/families/:familyId/status", updateFamilyFormStatus);
router.get("/export/families", exportFamiliesExcel);

module.exports = router;
