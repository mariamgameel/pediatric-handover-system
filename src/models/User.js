const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { DEFAULT_ROLE_PERMISSIONS } = require("../config/permissions");

const userSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, "Unique User/Staff ID is required"],
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            enum: ["Resident", "Specialist", "Consultant", "Admin"],
            default: "Resident",
            required: true,
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
            required: true,
        },
        permissions: {
            type: [String],
            default: function () {
                return DEFAULT_ROLE_PERMISSIONS[this.role] || [];
            },
        },
        shiftExempt: {
            type: Boolean,
            default: function () {
                return this.role === "Admin";
            },
        },
        activeShiftOverrideUntil: {
            type: Date,
            default: null,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
