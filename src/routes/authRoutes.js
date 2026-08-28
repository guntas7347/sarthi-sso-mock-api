const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Expose POST endpoints
router.post("/user", authController.getUser);
router.post("/reset-password", authController.resetPassword);
router.post("/generate-reset-code", authController.generateResetCode);

module.exports = router;
