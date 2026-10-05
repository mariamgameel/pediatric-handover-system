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
const Guideline = require("./src/models/Guideline");
const Protocol = require("./src/models/Protocol");
const StaffProfile = require("./src/models/StaffProfile");
const ShiftSwapRequest = require("./src/models/ShiftSwapRequest");
const StaffLeave = require("./src/models/StaffLeave");

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
            Guideline.deleteMany({}),
            Protocol.deleteMany({}),
            StaffProfile.deleteMany({}),
            ShiftSwapRequest.deleteMany({}),
            StaffLeave.deleteMany({}),
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

        const residentUser2 = await User.create({
            userId: "RES-102",
            name: "Dr. Nourhan Adel",
            email: "nourhan@hospital.org",
            password: "Password123!",
            role: "Resident",
            status: "Active",
            shiftExempt: false,
        });

        const chargeNurse = await User.create({
            userId: "NUR-001",
            name: "Sister Fatima Zahra",
            email: "fatima.nurse@hospital.org",
            password: "Password123!",
            role: "Resident", // Mapped into clinician role
            status: "Active",
            shiftExempt: false,
        });

        const bedsideNurse = await User.create({
            userId: "NUR-002",
            name: "Sarah Ahmad, RN",
            email: "sarah.nurse@hospital.org",
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

        console.log("Seeded 8 staff accounts.");

        // 2. Create Staff Manpower Profiles
        await StaffProfile.create([
            {
                user: consultantUser._id,
                staffCode: "PED-CNS-301",
                clinicalGrade: "Consultant",
                pediatricSubspecialty: "Pediatric Pulmonology & PICU",
                bleepNumber: "#2001",
                phoneExtension: "Ext. 4501",
                emergencyContact: "+20 100 123 4567",
                certifications: [
                    { name: "PALS Instructor", validUntil: new Date("2028-06-30"), certificateNumber: "PALS-INST-882" },
                    { name: "NRP Provider", validUntil: new Date("2027-12-15"), certificateNumber: "NRP-9941" },
                ],
                defaultWard: "General Pediatric Ward",
                activeStatus: "Active",
            },
            {
                user: specialistUser._id,
                staffCode: "PED-SPC-201",
                clinicalGrade: "Associate_Specialist",
                pediatricSubspecialty: "General Pediatrics & Emergency",
                bleepNumber: "#2005",
                phoneExtension: "Ext. 4505",
                emergencyContact: "+20 101 234 5678",
                certifications: [
                    { name: "PALS Provider", validUntil: new Date("2027-04-10"), certificateNumber: "PALS-PROV-5412" },
                ],
                defaultWard: "Pediatric HDU",
                activeStatus: "Active",
            },
            {
                user: residentUser._id,
                staffCode: "PED-RES-101",
                clinicalGrade: "Senior_Registrar",
                pediatricSubspecialty: "Inpatient Pediatrics",
                bleepNumber: "#2012",
                phoneExtension: "Ext. 4512",
                emergencyContact: "+20 102 345 6789",
                certifications: [
                    { name: "PALS Provider", validUntil: new Date("2026-11-20"), certificateNumber: "PALS-PROV-7819" },
                    { name: "BLS Healthcare Provider", validUntil: new Date("2027-01-15"), certificateNumber: "BLS-3310" },
                ],
                defaultWard: "General Pediatric Ward",
                activeStatus: "Active",
            },
            {
                user: residentUser2._id,
                staffCode: "PED-RES-102",
                clinicalGrade: "Resident_PGY1_2",
                pediatricSubspecialty: "Pediatric Inpatient Floor",
                bleepNumber: "#2018",
                phoneExtension: "Ext. 4518",
                emergencyContact: "+20 103 456 7890",
                certifications: [
                    { name: "PALS Provider", validUntil: new Date("2027-08-15"), certificateNumber: "PALS-PROV-9122" },
                ],
                defaultWard: "General Pediatric Ward",
                activeStatus: "Active",
            },
            {
                user: chargeNurse._id,
                staffCode: "PED-NUR-001",
                clinicalGrade: "Nurse_Supervisor",
                pediatricSubspecialty: "Pediatric Critical Care Nursing",
                bleepNumber: "#3001",
                phoneExtension: "Ext. 4531",
                emergencyContact: "+20 104 567 8901",
                certifications: [
                    { name: "PALS", validUntil: new Date("2027-05-12"), certificateNumber: "NUR-PALS-112" },
                    { name: "Pediatric IV Cannulation", validUntil: new Date("2029-01-01"), certificateNumber: "IV-CERT-441" },
                ],
                defaultWard: "General Pediatric Ward",
                activeStatus: "Active",
            },
            {
                user: bedsideNurse._id,
                staffCode: "PED-NUR-002",
                clinicalGrade: "Staff_Nurse",
                pediatricSubspecialty: "General Inpatient Nursing",
                bleepNumber: "#3002",
                phoneExtension: "Ext. 4532",
                emergencyContact: "+20 105 678 9012",
                certifications: [
                    { name: "BLS", validUntil: new Date("2027-03-25"), certificateNumber: "BLS-9912" },
                ],
                defaultWard: "General Pediatric Ward",
                activeStatus: "Active",
            },
        ]);

        console.log("Seeded 6 staff manpower profiles with bleeps and certifications.");

        // 3. Create Active Shift Schedules covering today
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
                wardZone: "General Pediatric Ward",
                dutyRole: "Senior Resident",
                checkInTime: new Date(now.getTime() - 3.8 * 60 * 60 * 1000),
                status: "Active",
                notes: "Morning round and covering General Pediatric Ward beds 1 to 10",
            },
            {
                user: specialistUser._id,
                shiftDate: now,
                shiftType: "Morning",
                startTime: shiftStart,
                endTime: shiftEnd,
                gracePeriodMinutes: 45,
                assignedBy: adminUser._id,
                wardZone: "Pediatric HDU",
                dutyRole: "Specialist In-Charge",
                checkInTime: new Date(now.getTime() - 3.9 * 60 * 60 * 1000),
                status: "Active",
                notes: "Covering HDU beds and high-risk admissions",
            },
            {
                user: chargeNurse._id,
                shiftDate: now,
                shiftType: "Morning",
                startTime: shiftStart,
                endTime: shiftEnd,
                gracePeriodMinutes: 45,
                assignedBy: adminUser._id,
                wardZone: "General Pediatric Ward",
                dutyRole: "Charge Nurse",
                checkInTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
                status: "Active",
                notes: "Ward shift supervisor and IV medication checks",
            },
            {
                user: bedsideNurse._id,
                shiftDate: now,
                shiftType: "Morning",
                startTime: shiftStart,
                endTime: shiftEnd,
                gracePeriodMinutes: 45,
                assignedBy: adminUser._id,
                wardZone: "General Pediatric Ward",
                dutyRole: "Bedside Nurse",
                checkInTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
                status: "Active",
                notes: "Bedside care & vitals monitoring",
            },
            {
                user: residentUser2._id,
                shiftDate: new Date(now.getTime() + 8 * 60 * 60 * 1000),
                shiftType: "Evening",
                startTime: new Date(now.getTime() + 7.5 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() + 15.5 * 60 * 60 * 1000),
                gracePeriodMinutes: 45,
                assignedBy: adminUser._id,
                wardZone: "General Pediatric Ward",
                dutyRole: "Junior Resident",
                status: "Scheduled",
                notes: "Evening handover incoming",
            },
        ]);

        console.log("Seeded active and upcoming shift schedules with check-in timestamps.");

        // 4. Create Department Guidelines
        await Guideline.create([
            {
                title: "Pediatric Sepsis 6 (1-Hour Resuscitation Bundle)",
                slug: "pediatric-sepsis-6-resuscitation-bundle",
                category: "Emergency_PICU",
                targetAgeGroup: "All_Pediatric",
                summary: "Rapid 6-step resuscitation protocol within 60 minutes of recognizing pediatric septic shock or severe sepsis.",
                contentMarkdown: `### Pediatric Sepsis 6 Protocol
1. **Oxygen Therapy**: Titrate high-flow oxygen via non-rebreather mask to maintain SpO2 > 94%.
2. **IV/IO Access & Bloods**: Establish reliable access within 5 minutes. Draw Blood Cultures, Blood Gas, Lactate, CBC, CRP, and Coagulation.
3. **Broad-Spectrum Antibiotics**: Administer within 60 minutes.
   - Age > 1 month: Ceftriaxone 80 mg/kg IV once daily (max 4g) + Vancomycin 15 mg/kg IV if MRSA suspected.
   - Neonate: Ampicillin 50 mg/kg IV + Gentamicin 5 mg/kg IV.
4. **Fluid Resuscitation**: 10-20 mL/kg isotonic crystalloid (Normal Saline or Plasmalyte) bolus over 10-20 minutes. Reassess for crackles or hepatomegaly.
5. **Inotropic Support**: If fluid refractory shock (hypotension persists after 40-60 mL/kg), initiate Epinephrine 0.05-0.3 mcg/kg/min or Norepinephrine peripheral/central infusion.
6. **Consult Senior Clinician**: Call Pediatric Consultant / PICU Fellow within 15 minutes of trigger.`,
                dosageFormulas: [
                    { drug: "Ceftriaxone", dose: "80 mg/kg once daily", maxDose: "4000 mg", route: "IV", frequency: "Daily" },
                    { drug: "Vancomycin", dose: "15 mg/kg Q6H", maxDose: "1000 mg/dose", route: "IV", frequency: "Q6H", notes: "Check trough before 4th dose" },
                    { drug: "Normal Saline Bolus", dose: "10-20 mL/kg bolus", maxDose: "1000 mL", route: "IV", frequency: "STAT over 15 min" },
                    { drug: "Epinephrine Infusion", dose: "0.05 - 0.3 mcg/kg/min", route: "IV/IO", frequency: "Continuous" },
                ],
                references: ["Surviving Sepsis Campaign International Guidelines 2024", "NICE Guideline NG51"],
                version: "2.1",
                status: "Active",
                author: consultantUser._id,
                approvedBy: consultantUser._id,
            },
            {
                title: "Pediatric Diabetic Ketoacidosis (DKA) Management & 2-Bag Fluid Protocol",
                slug: "pediatric-dka-management-protocol",
                category: "Endocrinology_Metabolic",
                targetAgeGroup: "Child_1_12y",
                summary: "Standardized 2-bag intravenous fluid rehydration, potassium replacement, and continuous low-dose insulin infusion for pediatric DKA.",
                contentMarkdown: `### Diagnostic Criteria
- Blood Glucose > 200 mg/dL (11.1 mmol/L)
- Venous Blood Gas: pH < 7.30 or Serum Bicarbonate < 15 mmol/L
- Ketonemia (beta-hydroxybutyrate >= 3.0 mmol/L) or moderate/large ketonuria.

### Fluid Deficit Calculation
- **Mild (pH 7.25-7.30)**: 5% dehydration
- **Moderate (pH 7.10-7.24)**: 7% dehydration
- **Severe (pH < 7.10)**: 10% dehydration
- Rehydrate over **48 hours** steadily to prevent cerebral edema.
- Initial volume expansion: 10 mL/kg Normal Saline over 60 minutes.

### Insulin Infusion
- **DO NOT give insulin bolus!**
- Start regular insulin infusion at **0.05 - 0.1 units/kg/hour** 1-2 hours AFTER fluid resuscitation has begun.
- When blood glucose drops below 250-300 mg/dL, add 5% or 10% Dextrose using the 2-Bag System.`,
                dosageFormulas: [
                    { drug: "Normal Saline Initial Bolus", dose: "10 mL/kg over 1 hour", maxDose: "1000 mL", route: "IV", frequency: "STAT" },
                    { drug: "Regular Insulin Infusion", dose: "0.05 - 0.1 units/kg/hour", maxDose: "No bolus", route: "IV Infusion", frequency: "Continuous" },
                    { drug: "Potassium Chloride", dose: "40 mEq/L fluid", route: "IV", notes: "Start once urine output confirmed and K+ < 5.5" },
                ],
                references: ["ISPAD Clinical Practice Consensus Guidelines 2022"],
                version: "1.5",
                status: "Active",
                author: consultantUser._id,
                approvedBy: consultantUser._id,
            },
            {
                title: "Acute Severe Bronchiolitis & Asthma Clinical Pathway (PRAM Score)",
                slug: "acute-severe-bronchiolitis-asthma-pathway",
                category: "Respiratory",
                targetAgeGroup: "All_Pediatric",
                summary: "Severity-driven escalation based on Pediatric Respiratory Assessment Measure (PRAM) scoring.",
                contentMarkdown: `### Severity Stratification
- **Mild (PRAM 0-3)**: Salbutamol 4-6 puffs via MDI + spacer Q2-4H.
- **Moderate (PRAM 4-7)**: Salbutamol 6-8 puffs Q20min x 3 doses + Oral Dexamethasone 0.6 mg/kg.
- **Severe (PRAM 8-12)**: Continuous Salbutamol nebulization + Ipratropium Bromide 250-500 mcg nebulized + IV Magnesium Sulfate 50 mg/kg over 20 min.

### Monitoring & Oxygen
- High-Flow Nasal Cannula (HFNC) at 1-2 L/kg/min if work of breathing remains elevated or SpO2 < 92%.`,
                dosageFormulas: [
                    { drug: "Salbutamol MDI", dose: "4-8 puffs with spacer", route: "Inhalation", frequency: "Q20min x 3 doses" },
                    { drug: "Dexamethasone", dose: "0.6 mg/kg single dose", maxDose: "16 mg", route: "Oral/IV", frequency: "Once daily x 2 days" },
                    { drug: "Magnesium Sulfate", dose: "50 mg/kg over 20 minutes", maxDose: "2000 mg", route: "IV Infusion", frequency: "STAT" },
                ],
                references: ["British Thoracic Society (BTS) Asthma Guidelines", "AAP Bronchiolitis Guidelines"],
                version: "2.0",
                status: "Active",
                author: specialistUser._id,
                approvedBy: consultantUser._id,
            },
            {
                title: "Neonatal Hyperbilirubinemia & Phototherapy Thresholds",
                slug: "neonatal-hyperbilirubinemia-phototherapy",
                category: "Neonatology",
                targetAgeGroup: "Neonate_0_28d",
                summary: "AAP nomogram-based phototherapy and exchange transfusion decision guide for term and late preterm neonates.",
                contentMarkdown: `### Phototherapy Guidelines
- Check Total Serum Bilirubin (TSB) against hour-specific AAP nomogram.
- Intensive phototherapy requires irradiance >= 30 mcg/cm2/nm in blue-green spectrum.
- Hydration support: maintain breast milk or formula feeding Q2-3H. Check hydration status and wet diapers.
- Exchange Transfusion indication: TSB reaching high-risk cutoff or signs of Acute Bilirubin Encephalopathy (hypertonia, arching, retrocollis).`,
                dosageFormulas: [
                    { drug: "IVIG (for Isoimmune Hemolytic Disease)", dose: "0.5 - 1 g/kg over 2 hours", route: "IV Infusion", notes: "If TSB rising despite intensive phototherapy" },
                ],
                references: ["AAP Clinical Practice Guideline: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation 2022"],
                version: "1.2",
                status: "Active",
                author: consultantUser._id,
                approvedBy: consultantUser._id,
            },
            {
                title: "Pediatric Status Epilepticus (0-5-10-20 min Protocol)",
                slug: "pediatric-status-epilepticus-timeline",
                category: "Neurology",
                targetAgeGroup: "All_Pediatric",
                summary: "Time-critical management algorithm for active convulsive seizures lasting greater than 5 minutes.",
                contentMarkdown: `### Seizure Emergency Timeline
- **0 - 5 min**: Airway, breathing, 100% High Flow O2, check capillary blood glucose (treat hypoglycemia with 2 mL/kg 10% Dextrose).
- **5 - 10 min (First-line Benzodiazepine)**:
  - IV Midazolam 0.15 mg/kg (max 10 mg) OR IV Lorazepam 0.1 mg/kg.
  - If no IV: Buccal Midazolam 0.3-0.5 mg/kg or Rectal Diazepam 0.5 mg/kg.
- **10 - 15 min**: If seizure continues, repeat second dose of Benzodiazepine. Prepare second-line antiepileptic.
- **15 - 25 min (Second-line)**:
  - Levetiracetam (Keppra) 60 mg/kg IV over 5-10 min (max 4500 mg) OR
  - Phenytoin 20 mg/kg IV over 20 min OR Sodium Valproate 40 mg/kg IV over 5 min.
- **> 25 min (Refractory Status)**: Call PICU & Anesthesia for intubation and continuous Midazolam or Propofol infusion.`,
                dosageFormulas: [
                    { drug: "Midazolam (IV)", dose: "0.15 mg/kg STAT", maxDose: "10 mg", route: "IV", frequency: "Repeat once after 5 min" },
                    { drug: "Midazolam (Buccal)", dose: "0.3 - 0.5 mg/kg", maxDose: "10 mg", route: "Buccal mucosa", frequency: "STAT" },
                    { drug: "Levetiracetam (Keppra)", dose: "60 mg/kg over 10 min", maxDose: "4500 mg", route: "IV", frequency: "STAT" },
                    { drug: "10% Dextrose (if hypoglycemic)", dose: "2 mL/kg bolus", maxDose: "100 mL", route: "IV", frequency: "STAT" },
                ],
                references: ["American Epilepsy Society (AES) Guidelines", "APLS 7th Edition"],
                version: "2.3",
                status: "Active",
                author: consultantUser._id,
                approvedBy: consultantUser._id,
            },
        ]);

        console.log("Seeded 5 pediatric department guidelines.");

        // 5. Create Clinical Protocols
        await Protocol.create([
            {
                protocolCode: "PROT-PED-001",
                title: "Pediatric Early Warning Score (PEWS) Rapid Escalation Protocol",
                category: "Deterioration_Escalation",
                priority: "Urgent",
                triggerConditions: "PEWS Score >= 4, single red-flag vital sign, or clinical gut concern by nurse.",
                checklistItems: [
                    { stepNumber: 1, action: "Immediate bedside clinical assessment & apply continuous SpO2/ECG monitor", roleRequired: "Staff_Nurse", targetTimeMinutes: 2, isMandatory: true },
                    { stepNumber: 2, action: "Notify Senior Resident on bleep #2012 / speed-dial", roleRequired: "Staff_Nurse", targetTimeMinutes: 5, isMandatory: true },
                    { stepNumber: 3, action: "Doctor bedside review completed; check airway, work of breathing, cap refill", roleRequired: "Resident", targetTimeMinutes: 10, isMandatory: true },
                    { stepNumber: 4, action: "Draw STAT venous/capillary blood gas and lactate", roleRequired: "Resident", targetTimeMinutes: 15, isMandatory: true },
                    { stepNumber: 5, action: "If PEWS >= 6 or no improvement: escalate immediately to Attending Specialist on bleep #2005", roleRequired: "Resident", targetTimeMinutes: 20, isMandatory: true },
                ],
                escalationRole: "Specialist",
                status: "Active",
                createdBy: consultantUser._id,
            },
            {
                protocolCode: "PROT-PED-002",
                title: "Pediatric Code Blue / Medical Emergency Team (MET) Arrest SOP",
                category: "Resuscitation_CodeBlue",
                priority: "Critical_Stat",
                triggerConditions: "Cardiac/Respiratory arrest, apnea, pulse < 60 in infant with poor perfusion, or unresponsiveness.",
                checklistItems: [
                    { stepNumber: 1, action: "Press CODE BLUE button or dial hospital emergency extension 2222", roleRequired: "Staff_Nurse", targetTimeMinutes: 1, isMandatory: true },
                    { stepNumber: 2, action: "Begin chest compressions 15:2 with bag-valve-mask 100% O2 ventilation", roleRequired: "Staff_Nurse", targetTimeMinutes: 1, isMandatory: true },
                    { stepNumber: 3, action: "Attach defibrillator / AED pads and analyze heart rhythm", roleRequired: "Resident", targetTimeMinutes: 2, isMandatory: true },
                    { stepNumber: 4, action: "Establish IV/IO access; draw emergency labs", roleRequired: "Resident", targetTimeMinutes: 3, isMandatory: true },
                    { stepNumber: 5, action: "First dose Epinephrine 0.01 mg/kg (0.1 mL/kg of 1:10,000) IV/IO", roleRequired: "Specialist", targetTimeMinutes: 4, isMandatory: true },
                    { stepNumber: 6, action: "Check 4H's and 4T's reversible causes; confirm airway security", roleRequired: "Consultant", targetTimeMinutes: 5, isMandatory: true },
                ],
                escalationRole: "Code_Blue_Team",
                status: "Active",
                createdBy: consultantUser._id,
            },
            {
                protocolCode: "PROT-PED-003",
                title: "Standardized SBAR Ward Handover Verification SOP",
                category: "Handover_SBAR",
                priority: "Routine",
                triggerConditions: "Mandatory at end of Morning (15:00), Evening (23:00), and Night (07:00) shifts.",
                checklistItems: [
                    { stepNumber: 1, action: "Situation: Confirm patient ID, bed number, age, weight, and active clinical status", roleRequired: "Resident", targetTimeMinutes: 5, isMandatory: true },
                    { stepNumber: 2, action: "Background: Review admission diagnosis, comorbidities, allergies, and resuscitation status", roleRequired: "Resident", targetTimeMinutes: 5, isMandatory: true },
                    { stepNumber: 3, action: "Assessment: Review vital signs trends, lab investigations, oxygen support, and active IV infusions", roleRequired: "Resident", targetTimeMinutes: 10, isMandatory: true },
                    { stepNumber: 4, action: "Recommendation: Highlight pending tasks, overnight watch-outs, and escalate to incoming doctor", roleRequired: "Resident", targetTimeMinutes: 5, isMandatory: true },
                    { stepNumber: 5, action: "Incoming doctor acknowledges and electronically confirms handover signoff in system", roleRequired: "Resident", targetTimeMinutes: 5, isMandatory: true },
                ],
                escalationRole: "Specialist",
                status: "Active",
                createdBy: consultantUser._id,
            },
            {
                protocolCode: "PROT-PED-004",
                title: "Pediatric Inpatient Discharge Readiness & Safe Handover SOP",
                category: "Admission_Discharge",
                priority: "Routine",
                triggerConditions: "Patient meeting clinical criteria for safe home discharge.",
                checklistItems: [
                    { stepNumber: 1, action: "Vital signs stable on room air for consecutive 12-24 hours", roleRequired: "Resident", targetTimeMinutes: 15, isMandatory: true },
                    { stepNumber: 2, action: "Tolerating adequate oral hydration/feedings without vomiting", roleRequired: "Staff_Nurse", targetTimeMinutes: 15, isMandatory: true },
                    { stepNumber: 3, action: "Discharge medication reconciled and prescription counseling provided to family", roleRequired: "Resident", targetTimeMinutes: 20, isMandatory: true },
                    { stepNumber: 4, action: "Discharge summary printed with 48-hour follow-up appointment date", roleRequired: "Resident", targetTimeMinutes: 15, isMandatory: true },
                    { stepNumber: 5, action: "Red flag warning signs explained to parents (fever, work of breathing, lethargy)", roleRequired: "Staff_Nurse", targetTimeMinutes: 10, isMandatory: true },
                ],
                escalationRole: "Consultant",
                status: "Active",
                createdBy: consultantUser._id,
            },
            {
                protocolCode: "PROT-PED-005",
                title: "Respiratory Syncytial Virus (RSV) & Droplet Isolation Protocol",
                category: "Infection_Isolation",
                priority: "Urgent",
                triggerConditions: "Positive RSV rapid PCR/antigen or acute viral bronchiolitis in infant.",
                checklistItems: [
                    { stepNumber: 1, action: "Assign patient to single isolation room or cohort with confirmed RSV cases", roleRequired: "Nurse_Supervisor", targetTimeMinutes: 15, isMandatory: true },
                    { stepNumber: 2, action: "Place Contact & Droplet Precautions signage outside room entrance", roleRequired: "Staff_Nurse", targetTimeMinutes: 10, isMandatory: true },
                    { stepNumber: 3, action: "PPE requirement verified: Mask, eye protection, gown, and gloves before entry", roleRequired: "Staff_Nurse", targetTimeMinutes: 5, isMandatory: true },
                    { stepNumber: 4, action: "Dedicated stethoscope, blood pressure cuff, and thermometer stationed in room", roleRequired: "Staff_Nurse", targetTimeMinutes: 10, isMandatory: true },
                ],
                escalationRole: "Specialist",
                status: "Active",
                createdBy: specialistUser._id,
            },
        ]);

        console.log("Seeded 5 clinical protocols & SOP checklists.");

        // 6. Seed Inpatient Patients
        const patient1 = await Patient.create({
            patientId: "PID-2026-001",
            fileNumber: "MRN-88201",
            name: "Youssef Karim",
            age: { years: 2, months: 4, days: 10 },
            weight: 12.5,
            bedNumber: "Bed-04",
            mainDiagnosis: "Severe Bronchiolitis with moderate respiratory distress",
            associatedDiagnoses: ["Mild Dehydration", "Failure to Thrive"],
            allergies: ["Penicillin"],
            status: "Close Monitoring",
            statusReason: "respiratory distress",
            responsibleDoctor: residentUser._id,
            lastUpdatedBy: residentUser._id,
        });

        const patient2 = await Patient.create({
            patientId: "PID-2026-002",
            fileNumber: "MRN-88202",
            name: "Lina Mahmoud",
            age: { years: 5, months: 8, days: 0 },
            weight: 18.0,
            bedNumber: "Bed-08",
            mainDiagnosis: "Diabetic Ketoacidosis (Moderate) secondary to new-onset Type 1 DM",
            associatedDiagnoses: ["Metabolic Acidosis", "Ketonuria 3+"],
            allergies: ["NKDA"],
            status: "Critical",
            statusReason: "other",
            statusReasonOther: "Severe DKA requiring 2-Bag fluid protocol and regular insulin infusion",
            responsibleDoctor: specialistUser._id,
            lastUpdatedBy: specialistUser._id,
        });

        const patient3 = await Patient.create({
            patientId: "PID-2026-003",
            fileNumber: "MRN-88203",
            name: "Adam Tamer",
            age: { years: 0, months: 0, days: 14 },
            weight: 3.4,
            bedNumber: "Bed-12",
            mainDiagnosis: "Neonatal Hyperbilirubinemia (Unconjugated)",
            associatedDiagnoses: ["Physiologic Jaundice", "Breastfeeding difficulty"],
            allergies: ["NKDA"],
            status: "Stable",
            responsibleDoctor: residentUser._id,
            lastUpdatedBy: residentUser._id,
        });

        console.log("Seeded 3 realistic pediatric patients.");

        // 7. Seed Active Vitals
        await VitalSign.create([
            {
                patient: patient1._id,
                recordedBy: residentUser._id,
                temperature: 38.4,
                heartRate: 142,
                respiratoryRate: 48,
                systolicBP: 92,
                diastolicBP: 58,
                spO2: 92,
                gcs: 15,
                oxygenMode: "Nasal Cannula",
                oxygenFlowRate: 2,
                oxygenFiO2: 28,
                devices: ["Nasal Cannula"],
            },
            {
                patient: patient2._id,
                recordedBy: specialistUser._id,
                temperature: 37.1,
                heartRate: 128,
                respiratoryRate: 28,
                systolicBP: 104,
                diastolicBP: 64,
                spO2: 98,
                gcs: 14,
                ivFluids: "Two-bag DKA fluid system at 82 mL/hr",
                devices: ["Peripheral IV x 2", "Urinary Catheter"],
            },
            {
                patient: patient3._id,
                recordedBy: residentUser._id,
                temperature: 36.8,
                heartRate: 138,
                respiratoryRate: 42,
                systolicBP: 72,
                diastolicBP: 46,
                spO2: 99,
                gcs: 15,
                devices: ["Phototherapy Eye Shield"],
            },
        ]);

        console.log("Seeded vital signs.");

        // 8. Seed Active Problems
        await ActiveProblem.create([
            {
                patient: patient1._id,
                title: "Acute Severe Bronchiolitis",
                description: "RSV positive rapid swab. Subcostal retractions, tachypneic.",
                status: "Active",
                createdBy: residentUser._id,
            },
            {
                patient: patient2._id,
                title: "Diabetic Ketoacidosis (Moderate)",
                description: "VBG pH 7.21, HCO3 11, blood glucose 380 mg/dL upon admission.",
                status: "Active",
                createdBy: specialistUser._id,
            },
        ]);

        // 9. Seed Management Plans
        await ManagementPlan.create([
            {
                patient: patient1._id,
                authorRole: "Specialist",
                createdBy: specialistUser._id,
                plan: "Initiate high-flow nasal cannula at 1.5 L/kg/min (18 L/min, FiO2 35%). Trial of inhaled hypertonic 3% saline nebulizer Q6H. Maintain hydration with IV 0.9% NaCl + 5% Dextrose at maintenance rate.",
                recommendations: "Strict SpO2 monitoring. Re-evaluate work of breathing after 2 hours. Escalate to specialist if persistent retractions.",
                medications: [
                    { name: "Paracetamol", dosage: "15 mg/kg", route: "Oral", frequency: "Q6H PRN" },
                    { name: "Hypertonic Saline 3%", dosage: "4 mL nebulized", route: "Nebulizer", frequency: "Q6H" },
                ],
                ivFluids: "D5 0.9% NaCl at 45 mL/hr",
                oxygenSupport: "HFNC 18 L/min FiO2 35%",
            },
            {
                patient: patient2._id,
                authorRole: "Specialist",
                createdBy: specialistUser._id,
                plan: "Continue Two-Bag fluid method (Bag 1: 0.9% NaCl with 40 mEq/L KCl, Bag 2: D10W + 0.9% NaCl with 40 mEq/L KCl). Regular Insulin infusion at 0.05 units/kg/hr. Check point-of-care capillary blood glucose hourly and VBG Q2-4H.",
                recommendations: "Target steady glucose decline of 50-75 mg/dL per hour. Watch out for rapid drops or headache indicating cerebral edema.",
                medications: [
                    { name: "Regular Insulin", dosage: "0.05 units/kg/hr (0.9 units/hr)", route: "IV Infusion", frequency: "Continuous" },
                ],
                ivFluids: "Two-Bag DKA protocol at total 82 mL/hr",
            },
        ]);

        // 10. Seed Initial Tasks
        const dueDate1 = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const dueDate2 = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        await Task.create([
            {
                patient: patient1._id,
                description: "Repeat capillary blood gas & evaluate work of breathing on HFNC",
                priority: "Urgent",
                dueAt: dueDate1,
                assignedTo: residentUser._id,
                createdBy: residentUser._id,
                status: "Pending",
            },
            {
                patient: patient2._id,
                description: "Check 2-hour VBG and serum electrolytes (potassium check for DKA protocol)",
                priority: "Critical",
                dueAt: dueDate1,
                assignedTo: specialistUser._id,
                createdBy: specialistUser._id,
                status: "Pending",
            },
            {
                patient: patient3._id,
                description: "Check 12-hour follow-up Total Serum Bilirubin (TSB) under phototherapy",
                priority: "Routine",
                dueAt: dueDate2,
                assignedTo: residentUser._id,
                createdBy: residentUser._id,
                status: "Pending",
            },
        ]);

        // 11. Seed Alerts
        await Alert.create([
            {
                patient: patient1._id,
                type: "clinical deterioration",
                priority: "High",
                message: "Patient Youssef Karim (Bed-04) SpO2 dropped to 92% with tachypnea (RR 48).",
                relatedEntityType: "VitalSign",
            },
            {
                patient: patient2._id,
                type: "critical patient",
                priority: "Critical",
                message: "Patient Lina Mahmoud (Bed-08) is on active DKA insulin protocol. Hourly glucose check due.",
                relatedEntityType: "Patient",
            },
        ]);

        // 12. Seed Handover Record
        await HandoverRecord.create({
            patient: patient1._id,
            fromDoctor: residentUser._id,
            toDoctor: residentUser2._id,
            shiftType: "Morning to Evening",
            status: "Needs Direct Discussion",
            autoSummarySnapshot: {
                patientStatus: patient1.status,
                statusReason: patient1.statusReason,
                activeProblemsSummary: ["Acute Severe Bronchiolitis"],
                pendingTasksSummary: ["Repeat capillary blood gas on HFNC"],
                recentVitalsSummary: "Temp 38.4C, HR 142, RR 48, SpO2 92% on HFNC",
            },
            customNotes: "Watch out for tiring. If SpO2 drops below 92%, notify Dr. Tariq (Specialist) on bleep #2005 immediately.",
            acknowledged: false,
        });

        // 13. System Audit Log
        await AuditLog.create([
            {
                user: adminUser._id,
                userId: adminUser.userId,
                userName: adminUser.name,
                action: "SYSTEM_INITIALIZATION",
                entity: "System",
                entityId: adminUser._id,
                newValue: { status: "Pediatric Ward System Seeded with Guidelines, Protocols, Rosters & Manpower" },
                ipAddress: "127.0.0.1",
                timestamp: new Date(),
            },
        ]);

        console.log("=================================================");
        console.log("SEEDING COMPLETED SUCCESSFULLY!");
        console.log("=================================================");
        console.log("Staff Accounts (Password for all: Password123!):");
        console.log("  • Admin:        admin@hospital.org       (ID: ADM-001) - Full CRUD, Shift-Exempt");
        console.log("  • Consultant:   consultant@hospital.org  (ID: CNS-301) - Bleep #2001, Shift-Exempt");
        console.log("  • Specialist:   specialist@hospital.org  (ID: SPC-201) - Bleep #2005, Active Shift");
        console.log("  • Resident 1:   resident@hospital.org    (ID: RES-101) - Bleep #2012, Active Shift");
        console.log("  • Resident 2:   nourhan@hospital.org     (ID: RES-102) - Bleep #2018, Evening Shift");
        console.log("  • Charge Nurse: fatima.nurse@hospital.org(ID: NUR-001) - Bleep #3001, Active Shift");
        console.log("  • Bedside Nurse:sarah.nurse@hospital.org (ID: NUR-002) - Bleep #3002, Active Shift");
        console.log("  • Off-Shift:    offshift.doc@hospital.org(ID: RES-999) - Outside Shift (Locked out)");
        console.log("=================================================");
        console.log("New Modules Seeded:");
        console.log("  • 5 Pediatric Guidelines (Sepsis, DKA, Asthma, Jaundice, Seizures)");
        console.log("  • 5 Clinical Protocols & SOP Checklists (PEWS, Code Blue, SBAR, Discharge, RSV)");
        console.log("  • 6 Staff Manpower Profiles (Bleeps, Extensions, PALS/NRP Certifications)");
        console.log("  • Active Multi-Tier Shift Schedule with Check-in Timestamps");
        console.log("=================================================");

        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedDatabase();
