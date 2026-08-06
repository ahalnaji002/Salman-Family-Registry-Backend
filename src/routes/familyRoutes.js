const express = require("express");

const {
  // FAMILY PROFILE
  getMyFamily,
  updateMyFamily,
  uploadMyPhoto,
  deleteMyPhoto,
  getMyEditingStatus,
  getMyFormCompletion,
  submitMyFamilyForm,
  deleteMyFamily,

  // HOUSING
  getMyHousing,
  upsertMyHousing,
  deleteMyHousing,

  // WIVES
  createMyWife,
  getMyWives,
  getMyWife,
  updateMyWife,
  deleteMyWife,

  // CHILDREN
  createMyChild,
  getMyChildren,
  getMyChild,
  updateMyChild,
  deleteMyChild,

  // MARRIED DAUGHTERS
  getMyMarriedDaughters,
  createMyMarriedDaughter,
  getMyMarriedDaughter,
  updateMyMarriedDaughter,
  deleteMyMarriedDaughter,

  // SPECIAL CASES
  getMySpecialCases,
  createMySpecialCase,
  getMySpecialCase,
  updateMySpecialCase,
  deleteMySpecialCase,
} = require("../controllers/familyController");

const { authenticate } = require("../middlewares/authMiddleware");

const { authorizeRoles } = require("../middlewares/roleMiddleware");
const { uploadFamilyPhoto } = require("../middlewares/photoUploadMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("family_head"));

// FAMILY PROFILE
router.get("/", getMyFamily);
router.patch("/", updateMyFamily);
router.delete("/", deleteMyFamily);
router.post("/photo", uploadFamilyPhoto.single("photo"), uploadMyPhoto);
router.delete("/photo", deleteMyPhoto);
router.get("/editing-status", getMyEditingStatus);
router.get("/completion", getMyFormCompletion);
router.post("/submit", submitMyFamilyForm);

// HOUSING
router.get("/housing", getMyHousing);
router.put("/housing", upsertMyHousing);
router.delete("/housing", deleteMyHousing);

// WIVES
router.get("/wives", getMyWives);
router.post("/wives", createMyWife);
router.get("/wives/:wifeId", getMyWife);
router.patch("/wives/:wifeId", updateMyWife);
router.delete("/wives/:wifeId", deleteMyWife);

// CHILDREN
router.get("/children", getMyChildren);
router.post("/children", createMyChild);
router.get("/children/:childId", getMyChild);
router.patch("/children/:childId", updateMyChild);
router.delete("/children/:childId", deleteMyChild);

// MARRIED DAUGHTERS
router.get("/married-daughters", getMyMarriedDaughters);
router.post("/married-daughters", createMyMarriedDaughter);
router.get("/married-daughters/:daughterId", getMyMarriedDaughter);
router.patch("/married-daughters/:daughterId", updateMyMarriedDaughter);
router.delete("/married-daughters/:daughterId", deleteMyMarriedDaughter);

// SPECIAL CASES
router.get("/special-cases", getMySpecialCases);
router.post("/special-cases", createMySpecialCase);
router.get("/special-cases/:caseId", getMySpecialCase);
router.patch("/special-cases/:caseId", updateMySpecialCase);
router.delete("/special-cases/:caseId", deleteMySpecialCase);

module.exports = router;
