require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./src/config/db");

const User = require("./src/models/User");
const ShiftSchedule = require("./src/models/ShiftSchedule");
const { Patient } = require("./src/models/Patient");
const VitalSign = require("./src/models/VitalSign");
const ActiveProblem = require("./src/models/ActiveProblem");
const ManagementPlan = require("./src/models/ManagementPlan");
const { ClinicalUpdate } = require("./src/models/ClinicalUpdate");
const Investigation = require("./src/models/Investigation");
const Task = require("./src/models/Task");
const { Alert } = require("./src/models/Alert");
const AuditLog = require("./src/models/AuditLog");
const PatientView = require("./src/models/PatientView");
const { HandoverRecord } = require("./src/models/HandoverRecord");

const seedDatabase = async () => {
    try {
        await connectDB();
        console.log("Connected to MongoDB for database seeding...");

        // Clean existing collections
        await Promise.all([
            User.deleteMany({}),
            ShiftSchedule.deleteMany({}),
            Patient.deleteMany({}),
            VitalSign.deleteMany({}),
            ActiveProblem.deleteMany({}),
            ManagementPlan.deleteMany({}),
            ClinicalUpdate.deleteMany({}),
            Investigation.deleteMany({}),
            Task.deleteMany({}),
            Alert.deleteMany({}),
            AuditLog.deleteMany({}),
            PatientView.deleteMany({}),
            HandoverRecord.deleteMany({}),
        ]);

        console.log("Cleaned previous collections.");

        // 1. Create Staff Accounts
        const adminUser = await User.create({
            userId: "ADM-001",
            name: "Amira Fouad",
            email: "admin@hospital.org",
            password: "Password123!",
            role: "Admin",
            status: "Active",
            shiftExempt: true,
        });

        const consultantUser = await User.create({
            userId: "CNS-301",
            name: "Dr. Mariam Al-Hashemi",
            email: "consultant@hospital.org",
            password: "Password123!",
            role: "Consultant",
            status: "Active",
            shiftExempt: true, // Senior consultant on hospital-wide call
        });

        const specialistUser = await User.create({
            userId: "SPC-201",
            name: "Dr. Tariq Ziyad",
            email: "specialist@hospital.org",
            password: "Password123!",
            role: "Specialist",
            status: "Active",
            shiftExempt: false,
        });

        const residentUser = await User.create({
            userId: "RES-101",
            name: "Dr. Omar Khaled",
            email: "resident@hospital.org",
            password: "Password123!",
            role: "Resident",
            status: "Active",
            shiftExempt: false,
        });

        // Doctor with NO active shift (to test shift lockout)
        const offShiftDoctor = await User.create({
            userId: "RES-999",
            name: "Dr. Huda Rasheed",
            email: "offshift.doc@hospital.org",
            password: "Password123!",
            role: "Resident",
            status: "Active",
            shiftExempt: false,
        });

        console.log("Seeded 5 staff accounts (Admin, Consultant, Specialist, Resident, Off-Shift Resident).");

        // 2. Create Active Shift Schedules covering today for Resident and Specialist
        const now = new Date();
        const shiftStart = new Date(now.getTime() - 4 * 60 * 60 * 1000); // started 4 hours ago
        const shiftEnd = new Date(now.getTime() + 8 * 60 * 60 * 1000);   // ends 8 hours from now

        await ShiftSchedule.create([
            {
                user: residentUser._id,
                shiftDate: now,
                shiftType: "Morning",
                startTime: shiftStart,
                endTime: shiftEnd,
                gracePeriodMinutes: 45,
                assignedBy: adminUser._id,
                status: "Active",
                notes: "Pediatric Ward Floor Duty",
            },
            {
                user: specialistUser._id,
                shiftDate: now,
                shiftType: "Morning",
                startTime: shiftStart,
                endTime: shiftEnd,
                gracePeriodMinutes: 45,
                assignedBy: adminUser._id,
                status: "Active",
                notes: "Ward Round and High Risk Escalation Supervision",
            },
        ]);

        console.log("Seeded active shift schedules covering the current timeframe.");

        // 3. Create Pediatric Patients
        // Patient 1: Critical (Bronchiolitis on High Flow Nasal Cannula)
        const patient1 = await Patient.create({
            patientId: "PED-2026-001",
            fileNumber: "FILE-77401",
            name: "Zaid Al-Mansour",
            age: { years: 0, months: 8, days: 12 },
            weight: 8.4,
            bedNumber: "Bed 3A",
            admissionDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            mainDiagnosis: "Acute Severe Viral Bronchiolitis",
            associatedDiagnoses: ["Acute Respiratory Failure Type 1"],
            allergies: ["NKDA"],
            status: "Critical",
            statusReason: "respiratory distress",
            statusHistory: [
                {
                    status: "Close Monitoring",
                    reason: "Tachypneic",
                    updatedBy: residentUser._id,
                    updatedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
                },
                {
                    status: "Critical",
                    reason: "respiratory distress",
                    updatedBy: specialistUser._id,
                    updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
                },
            ],
            responsibleDoctor: consultantUser._id,
            lastUpdatedBy: specialistUser._id,
        });

        // Patient 2: Close Monitoring (Febrile Convulsion)
        const patient2 = await Patient.create({
            patientId: "PED-2026-002",
            fileNumber: "FILE-88320",
            name: "Layla Nour",
            age: { years: 4, months: 2, days: 0 },
            weight: 16.2,
            bedNumber: "Bed 5B",
            admissionDate: new Date(now.getTime() - 12 * 60 * 60 * 1000),
            mainDiagnosis: "Complex Febrile Convulsions",
            associatedDiagnoses: ["Acute Otitis Media"],
            allergies: ["Amoxicillin (Rash)"],
            status: "Close Monitoring",
            statusHistory: [
                {
                    status: "Close Monitoring",
                    reason: "Post-ictal observation",
                    updatedBy: residentUser._id,
                    updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
                },
            ],
            responsibleDoctor: specialistUser._id,
            lastUpdatedBy: residentUser._id,
        });

        // Patient 3: Stable (Acute Gastroenteritis)
        const patient3 = await Patient.create({
            patientId: "PED-2026-003",
            fileNumber: "FILE-90114",
            name: "Yousef Kareem",
            age: { years: 2, months: 6, days: 0 },
            weight: 12.8,
            bedNumber: "Bed 7A",
            admissionDate: new Date(now.getTime() - 36 * 60 * 60 * 1000),
            mainDiagnosis: "Acute Gastroenteritis with mild dehydration",
            associatedDiagnoses: [],
            allergies: ["NKDA"],
            status: "Stable",
            statusHistory: [
                {
                    status: "Stable",
                    updatedBy: residentUser._id,
                    updatedAt: new Date(now.getTime() - 36 * 60 * 60 * 1000),
                },
            ],
            responsibleDoctor: specialistUser._id,
            lastUpdatedBy: residentUser._id,
        });

        console.log("Seeded 3 realistic pediatric inpatient cases.");

        // 4. Seed Vital Signs (Historical measurements)
        await VitalSign.create([
            {
                patient: patient1._id,
                temperature: 38.6,
                heartRate: 165,
                respiratoryRate: 64,
                bloodPressure: { systolic: 92, diastolic: 55 },
                spO2: 91,
                gcs: 14,
                weight: 8.4,
                oxygenSupport: { mode: "High Flow Nasal Cannula", flowRate: 15, fiO2: 45 },
                ivFluids: "D5 0.45% NS at 32 ml/hr",
                devices: ["Peripheral IV Left Hand", "HFNC Cannula"],
                recordedBy: residentUser._id,
                recordedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            },
            {
                patient: patient2._id,
                temperature: 39.1,
                heartRate: 125,
                respiratoryRate: 26,
                bloodPressure: { systolic: 100, diastolic: 62 },
                spO2: 98,
                gcs: 14,
                weight: 16.2,
                oxygenSupport: { mode: "Room Air", flowRate: 0, fiO2: 21 },
                ivFluids: "Heplock peripheral line",
                devices: ["Peripheral IV Right Forearm"],
                recordedBy: residentUser._id,
                recordedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
            },
            {
                patient: patient3._id,
                temperature: 37.0,
                heartRate: 98,
                respiratoryRate: 22,
                bloodPressure: { systolic: 98, diastolic: 60 },
                spO2: 99,
                gcs: 15,
                weight: 12.8,
                oxygenSupport: { mode: "Room Air" },
                ivFluids: "Oral ORS tolerated well",
                recordedBy: residentUser._id,
                recordedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
            },
        ]);

        // 5. Seed Active Problems
        await ActiveProblem.create([
            {
                patient: patient1._id,
                title: "Acute Severe Bronchiolitis with Hypoxia",
                description: "Intercostal retractions, grunting, oxygen requirement on HFNC",
                startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                status: "Active",
                createdBy: specialistUser._id,
                updatedBy: specialistUser._id,
            },
            {
                patient: patient2._id,
                title: "Prolonged Post-Ictal Lethargy",
                description: "Slow arousal following 8-minute febrile seizure",
                startDate: new Date(now.getTime() - 12 * 60 * 60 * 1000),
                status: "Active",
                createdBy: residentUser._id,
                updatedBy: residentUser._id,
            },
            {
                patient: patient3._id,
                title: "Dehydration Secondary to Diarrhea",
                description: "Mild sunken eyes, decreased urine output",
                startDate: new Date(now.getTime() - 36 * 60 * 60 * 1000),
                status: "Resolved",
                resolutionInfo: {
                    resolvedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
                    resolvedBy: residentUser._id,
                    resolutionNote: "Euhydrated, skin turgor normal, voiding abundantly",
                },
                createdBy: residentUser._id,
                updatedBy: residentUser._id,
            },
        ]);

        // 6. Seed Management Plans (Versioned)
        await ManagementPlan.create([
            {
                patient: patient1._id,
                version: 1,
                plan: "High Flow Nasal Cannula at 2 L/kg/min with FiO2 titrated to keep SpO2 > 94%. Maintain IV hydration at 80% maintenance.",
                recommendations: "PICU consult if FiO2 exceeds 50% or severe respiratory muscle fatigue develops.",
                clinicalReasoning: "Severe viral lower respiratory tract involvement in young infant.",
                medications: [
                    { name: "Salbutamol Inhaler (Trial)", dosage: "2 puffs", route: "Inhaled via spacer", frequency: "Q4H PRN", isAntibiotic: false },
                    { name: "Paracetamol", dosage: "125 mg", route: "IV", frequency: "Q6H PRN", isAntibiotic: false },
                ],
                ivFluids: "D5 0.45% NS at 32 ml/hr",
                oxygenSupport: "HFNC 15 L/min FiO2 45%",
                supportiveCare: "Gentle nasal suctioning before feeds, minimal handling",
                isSuperseded: false,
                authorRole: "Consultant",
                createdBy: consultantUser._id,
                createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
            },
        ]);

        // 7. Seed Investigations & Unreviewed Results
        await Investigation.create([
            {
                patient: patient1._id,
                name: "Venous Blood Gas (VBG)",
                type: "Laboratory",
                status: "Result Available", // Unreviewed result waiting for senior doctor review!
                requestedBy: residentUser._id,
                requestedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                result: "pH 7.31, pCO2 56 mmHg (CO2 retention), HCO3 27 mmol/L, Lactate 1.8",
                resultAt: new Date(now.getTime() - 45 * 60 * 1000),
                isAbnormal: true,
                notes: "Evaluate ventilatory adequacy",
            },
            {
                patient: patient1._id,
                name: "Respiratory Viral PCR Panel",
                type: "Microbiology",
                status: "Pending",
                requestedBy: specialistUser._id,
                requestedAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
            },
            {
                patient: patient2._id,
                name: "Serum Electrolytes & Calcium",
                type: "Laboratory",
                status: "Reviewed",
                requestedBy: residentUser._id,
                requestedAt: new Date(now.getTime() - 11 * 60 * 60 * 1000),
                result: "Na 138, K 4.2, Cl 102, Ca 2.35 mmol/L (Normal)",
                resultAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
                isAbnormal: false,
                reviewedBy: specialistUser._id,
                reviewedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
                notes: "Electrolytes normal, no hypocalcemic seizure trigger",
            },
        ]);

        // 8. Seed Tasks (including overdue)
        await Task.create([
            {
                patient: patient1._id,
                description: "Repeat venous blood gas and notify PICU fellow",
                priority: "Critical",
                dueAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 mins overdue!
                assignedTo: residentUser._id,
                status: "Overdue",
                createdBy: specialistUser._id,
            },
            {
                patient: patient2._id,
                description: "Perform formal GCS and pupil assessment at 20:00",
                priority: "Urgent",
                dueAt: new Date(now.getTime() + 60 * 60 * 1000), // in 1 hour
                assignedTo: residentUser._id,
                status: "Pending",
                createdBy: residentUser._id,
            },
        ]);

        // 9. Seed System Alert
        await Alert.create([
            {
                patient: patient1._id,
                type: "critical patient",
                message: "Patient Zaid Al-Mansour (Bed 3A) marked CRITICAL: respiratory distress",
                priority: "Critical",
                isRead: false,
                createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
            },
            {
                patient: patient1._id,
                type: "important pending result",
                message: "Result Available: Venous Blood Gas (VBG) for Zaid Al-Mansour (Bed 3A) [ABNORMAL VALUE: pCO2 56]",
                priority: "High",
                isRead: false,
                createdAt: new Date(now.getTime() - 45 * 60 * 1000),
            },
        ]);

        // 10. Seed Initial Audit Log
        await AuditLog.create([
            {
                user: adminUser._id,
                userId: adminUser.userId,
                userName: adminUser.name,
                action: "SYSTEM_INITIALIZATION",
                entity: "System",
                entityId: adminUser._id,
                newValue: { status: "Pediatric Ward System Seeded and Ready" },
                ipAddress: "127.0.0.1",
                timestamp: new Date(),
            },
        ]);

        console.log("=================================================");
        console.log("SEEDING COMPLETED SUCCESSFULLY!");
        console.log("=================================================");
        console.log("Staff Accounts (Password for all: Password123!):");
        console.log("  • Admin:      admin@hospital.org       (ID: ADM-001) - Full control, Shift-Exempt");
        console.log("  • Consultant: consultant@hospital.org  (ID: CNS-301) - Shift-Exempt (On-call)");
        console.log("  • Specialist: specialist@hospital.org  (ID: SPC-201) - Active Shift Scheduled");
        console.log("  • Resident:   resident@hospital.org    (ID: RES-101) - Active Shift Scheduled");
        console.log("  • Off-Shift:  offshift.doc@hospital.org(ID: RES-999) - Outside Shift (Will be blocked)");
        console.log("=================================================");

        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedDatabase();
