const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { loginSchema } = require("../validations/userValidation");

const router = express.Router();

router.post("/login", validate(loginSchema), authController.login);
router.get("/me", protect, authController.getMe);

module.exports = router;
