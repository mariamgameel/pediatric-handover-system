const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logAudit = require("../utils/auditLogger");
const { DEFAULT_ROLE_PERMISSIONS } = require("../config/permissions");

// Admin creates a user account
const createUser = catchAsync(async (req, res, next) => {
    const { userId, name, email, password, role, status, permissions, shiftExempt } = req.body;

    const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { userId: userId.toUpperCase() }],
    });

    if (existingUser) {
        if (existingUser.userId === userId.toUpperCase()) {
            return next(new AppError(`User ID '${userId}' is already assigned to another staff member`, 400));
        }
        return next(new AppError(`Email '${email}' is already registered`, 400));
    }

    const assignedPermissions = permissions && permissions.length > 0 
        ? permissions 
        : DEFAULT_ROLE_PERMISSIONS[role || "Resident"] || [];

    const newUser = await User.create({
        userId: userId.toUpperCase(),
        name,
        email,
        password,
        role: role || "Resident",
        status: status || "Active",
        permissions: assignedPermissions,
        shiftExempt: role === "Admin" ? true : (shiftExempt || false),
    });

    newUser.password = undefined;

    await logAudit({
        req,
        action: "CREATE_USER",
        entity: "User",
        entityId: newUser._id,
        newValue: {
            userId: newUser.userId,
            name: newUser.name,
            role: newUser.role,
            status: newUser.status,
            permissions: newUser.permissions,
        },
    });

    res.status(201).json({
        success: true,
        message: "Staff account created successfully",
        data: { user: newUser },
    });
});

// Admin lists all users
const getAllUsers = catchAsync(async (req, res, next) => {
    const { role, status, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { userId: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    const users = await User.find(filter).sort({ role: 1, name: 1 });

    res.status(200).json({
        success: true,
        count: users.length,
        data: { users },
    });
});

// Admin gets user by ID
const getUserById = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    res.status(200).json({
        success: true,
        data: { user },
    });
});

// Admin updates user role
const updateUserRole = catchAsync(async (req, res, next) => {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    const previousValue = { role: user.role, permissions: user.permissions };

    user.role = role;
    // Set default permissions for the new role
    user.permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (role === "Admin") {
        user.shiftExempt = true;
    }

    await user.save();

    await logAudit({
        req,
        action: "UPDATE_USER_ROLE",
        entity: "User",
        entityId: user._id,
        previousValue,
        newValue: { role: user.role, permissions: user.permissions },
    });

    res.status(200).json({
        success: true,
        message: `User role updated to ${role}`,
        data: { user },
    });
});

// Admin dynamically updates individual permissions
const updateUserPermissions = catchAsync(async (req, res, next) => {
    const { permissions } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    const previousValue = { permissions: user.permissions };
    user.permissions = permissions;
    await user.save();

    await logAudit({
        req,
        action: "UPDATE_USER_PERMISSIONS",
        entity: "User",
        entityId: user._id,
        previousValue,
        newValue: { permissions: user.permissions },
    });

    res.status(200).json({
        success: true,
        message: "User permissions updated successfully",
        data: { user },
    });
});

// Admin activates / deactivates user
const updateUserStatus = catchAsync(async (req, res, next) => {
    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString() && status === "Inactive") {
        return next(new AppError("You cannot deactivate your own admin account", 400));
    }

    const previousValue = { status: user.status };
    user.status = status;
    await user.save();

    await logAudit({
        req,
        action: "UPDATE_USER_STATUS",
        entity: "User",
        entityId: user._id,
        previousValue,
        newValue: { status: user.status },
    });

    res.status(200).json({
        success: true,
        message: `User status updated to ${status}`,
        data: { user },
    });
});

// Admin resets user password
const resetUserPassword = catchAsync(async (req, res, next) => {
    const { password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    user.password = password;
    await user.save();

    await logAudit({
        req,
        action: "RESET_USER_PASSWORD",
        entity: "User",
        entityId: user._id,
        newValue: { passwordResetAt: new Date() },
    });

    res.status(200).json({
        success: true,
        message: `Password for ${user.name} (${user.userId}) has been reset successfully`,
    });
});

module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUserRole,
    updateUserPermissions,
    updateUserStatus,
    resetUserPassword,
};
