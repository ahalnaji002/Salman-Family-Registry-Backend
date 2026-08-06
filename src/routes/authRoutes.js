const express = require("express");

const {
  register,
  login,
  me,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} = require("../controllers/authController");

const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.patch("/change-password", authenticate, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

module.exports = router;
