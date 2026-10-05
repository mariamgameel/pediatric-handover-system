const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        validUntil: {
            type: Date,
            required: true,
        },
        certificateNumber: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

const staffProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required for staff profile"],
            unique: true,
            index: true,
        },
        staffCode: {
            type: String,
            required: [true, "Staff code is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },
        clinicalGrade: {
            type: String,
            required: [true, "Clinical grade is required"],
            enum: [
                "Consultant",
                "Associate_Specialist",
                "Senior_Registrar",
                "Resident_PGY3",
                "Resident_PGY1_2",
                "Nurse_Supervisor",
                "Staff_Nurse",
                "Clinical_Pharmacist",
            ],
            index: true,
        },
        pediatricSubspecialty: {
            type: String,
            trim: true,
        },
        bleepNumber: {
            type: String,
            trim: true,
        },
        phoneExtension: {
            type: String,
            trim: true,
        },
        emergencyContact: {
            type: String,
            trim: true,
        },
        certifications: [certificationSchema],
        defaultWard: {
            type: String,
            default: "General Pediatric Ward",
            enum: [
                "General Pediatric Ward",
                "Pediatric HDU",
                "Isolation Unit",
                "Neonatal Nursery",
                "Emergency Peds",
            ],
        },
        maxConsecutiveNights: {
            type: Number,
            default: 3,
        },
        activeStatus: {
            type: String,
            enum: ["Active", "On_Leave", "Inactive"],
            default: "Active",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

staffProfileSchema.index({ clinicalGrade: 1, activeStatus: 1 });

const StaffProfile = mongoose.model("StaffProfile", staffProfileSchema);

module.exports = StaffProfile;
