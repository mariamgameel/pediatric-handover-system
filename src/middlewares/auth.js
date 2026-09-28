const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

const protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new AppError("You are not logged in. Please log in to get access.", 401));
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return next(new AppError("Invalid or expired session token. Please log in again.", 401));
    }

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    if (currentUser.status === "Inactive") {
        return next(new AppError("Your account has been deactivated. Please contact the administrator.", 403));
    }

    req.user = currentUser;
    next();
});

// Admin always bypasses role restrictions
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError("Not authenticated", 401));
        }

        // Admin has complete super-user access to all features
        if (req.user.role === "Admin") {
            return next();
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError("You do not have permission to perform this clinical action.", 403));
        }

        next();
    };
};

// Check specific granular permission (Admin always bypasses)
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError("Not authenticated", 401));
        }

        // Admin has full super-user access to all permissions
        if (req.user.role === "Admin") {
            return next();
        }

        if (!req.user.permissions || !req.user.permissions.includes(permission)) {
            return next(new AppError(`Permission denied: Missing '${permission}' capability.`, 403));
        }

        next();
    };
};

module.exports = {
    protect,
    authorize,
    checkPermission,
};
