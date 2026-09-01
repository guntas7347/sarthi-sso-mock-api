const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Expose endpoints
router.get("/users", authController.getAllUsers);
router.get("/all-users", authController.getAllUsers);
router.post("/all-users", authController.getAllUsers);

router.post("/users", authController.createUser);
router.post("/create-user", authController.createUser);
router.post("/user/create", authController.createUser);

router.post("/edit-user", authController.editUser);
router.post("/user/edit", authController.editUser);
router.put("/user", authController.editUser);

router.post("/user", authController.getUser);
router.post("/reset-password", authController.resetPassword);
router.post("/generate-reset-code", authController.generateResetCode);

module.exports = router;
