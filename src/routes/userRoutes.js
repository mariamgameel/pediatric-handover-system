const express = require("express");
const userController = require("../controllers/userController");
const { protect, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
    createUserSchema,
    updateUserRoleSchema,
    updateUserPermissionsSchema,
    updateUserStatusSchema,
    resetPasswordSchema,
} = require("../validations/userValidation");

const router = express.Router();

// All routes here require authentication and Admin role
router.use(protect);
router.use(authorize("Admin"));

router.route("/")
    .post(validate(createUserSchema), userController.createUser)
    .get(userController.getAllUsers);

router.route("/:id")
    .get(userController.getUserById);

router.patch("/:id/role", validate(updateUserRoleSchema), userController.updateUserRole);
router.patch("/:id/permissions", validate(updateUserPermissionsSchema), userController.updateUserPermissions);
router.patch("/:id/status", validate(updateUserStatusSchema), userController.updateUserStatus);
router.post("/:id/reset-password", validate(resetPasswordSchema), userController.resetUserPassword);

module.exports = router;
