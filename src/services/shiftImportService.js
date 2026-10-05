const XLSX = require("xlsx");
const User = require("../models/User");
const ShiftSchedule = require("../models/ShiftSchedule");
const StaffProfile = require("../models/StaffProfile");
const AppError = require("../utils/AppError");

// Standard pediatric ward shift timings
const STANDARD_SHIFT_HOURS = {
    Morning: { start: "07:00", end: "15:30" },
    Evening: { start: "15:00", end: "23:30" },
    Night: { start: "23:00", end: "07:30" }, // ends next day
    "On-Call": { start: "08:00", end: "08:00" }, // 24-hr on call
    Custom: { start: "08:00", end: "16:00" },
};

/**
 * Generate a pre-filled Excel template for Admin roster planning
 */
const generateShiftExcelTemplate = async () => {
    // Fetch active clinical staff to provide reference sheet
    const users = await User.find({ status: "Active" }).select("userId name email role").lean();
    
    // Header for Roster Import sheet
    const rosterHeaders = [
        "Staff_ID_or_Email",
        "Staff_Name_Optional",
        "Shift_Date_YYYY_MM_DD",
        "Shift_Type",
        "Start_Time_HH_MM_Optional",
        "End_Time_HH_MM_Optional",
        "Ward_Zone_Optional",
        "Duty_Role_Optional",
        "Notes_Optional",
    ];

    // Sample data rows
    const sampleRows = [
        [
            users[0]?.userId || "CNS-301",
            users[0]?.name || "Dr. Mariam Al-Hashemi",
            "2026-10-15",
            "Morning",
            "07:00",
            "15:30",
            "General Pediatric Ward",
            "Consultant In-Charge",
            "Morning ward round & handover",
        ],
        [
            users[1]?.userId || "RES-101",
            users[1]?.name || "Dr. Omar Khaled",
            "2026-10-15",
            "Evening",
            "15:00",
            "23:30",
            "Pediatric HDU",
            "Senior Resident",
            "Covering acute admissions",
        ],
        [
            users[2]?.userId || "RES-102",
            users[2]?.name || "Dr. Nourhan Adel",
            "2026-10-15",
            "Night",
            "23:00",
            "07:30",
            "General Pediatric Ward",
            "Junior Resident",
            "Night floor coverage",
        ],
    ];

    const rosterSheetData = [rosterHeaders, ...sampleRows];
    const rosterSheet = XLSX.utils.aoa_to_sheet(rosterSheetData);

    // Reference Sheet: List of active staff
    const staffHeaders = ["Staff_ID", "Name", "Email", "Role"];
    const staffRows = users.map((u) => [u.userId, u.name, u.email, u.role]);
    const staffSheet = XLSX.utils.aoa_to_sheet([staffHeaders, ...staffRows]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, rosterSheet, "Shift_Roster");
    XLSX.utils.book_append_sheet(workbook, staffSheet, "Staff_Directory_Reference");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return buffer;
};

/**
 * Parse date values from Excel (handles string dates and Excel serial dates)
 */
const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === "number") {
        // Excel serial date to JS Date
        return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const str = String(val).trim();
    // Support YYYY-MM-DD, DD/MM/YYYY, etc.
    const isoParsed = new Date(str);
    if (!isNaN(isoParsed.getTime())) return isoParsed;

    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
        // Check if DD/MM/YYYY or YYYY-MM-DD
        if (parts[0].length === 4) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
};

/**
 * Parse time string "HH:MM" into Date combined with a base date
 */
const combineDateAndTime = (baseDate, timeStr, addDay = false) => {
    const d = new Date(baseDate);
    const [h, m] = (timeStr || "00:00").split(":").map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    if (addDay) {
        d.setDate(d.getDate() + 1);
    }
    return d;
};

/**
 * Parse and validate uploaded Excel / CSV buffer
 */
const parseAndValidateExcel = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rawRows || rawRows.length === 0) {
        throw new AppError("The uploaded sheet is empty or invalid", 400);
    }

    // Pre-cache all active users
    const allUsers = await User.find({}).lean();
    const userMap = new Map();
    for (const u of allUsers) {
        if (u.userId) userMap.set(u.userId.toLowerCase().trim(), u);
        if (u.email) userMap.set(u.email.toLowerCase().trim(), u);
        if (u.name) userMap.set(u.name.toLowerCase().trim(), u);
    }

    const validatedRows = [];
    const errors = [];
    const warnings = [];

    for (let index = 0; index < rawRows.length; index++) {
        const row = rawRows[index];
        const rowNum = index + 2; // 1-based + 1 for header

        // Look for keys flexibly (case-insensitive / with or without underscores)
        const findVal = (keySubstrings) => {
            for (const k of Object.keys(row)) {
                const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                for (const sub of keySubstrings) {
                    if (cleanKey.includes(sub)) return row[k];
                }
            }
            return "";
        };

        const staffIdentifier = String(findVal(["staffid", "email", "identifier", "doctorid", "userid"])).trim();
        const rawDate = findVal(["shiftdate", "date"]);
        const rawShiftType = String(findVal(["shifttype", "type", "shift"])).trim();
        const rawStartTime = String(findVal(["starttime", "start"])).trim();
        const rawEndTime = String(findVal(["endtime", "end"])).trim();
        const wardZone = String(findVal(["wardzone", "ward", "zone"])).trim() || "General Pediatric Ward";
        const dutyRole = String(findVal(["dutyrole", "role"])).trim();
        const notes = String(findVal(["notes", "comment"])).trim();

        if (!staffIdentifier && !rawDate && !rawShiftType) {
            // Skip empty rows
            continue;
        }

        if (!staffIdentifier) {
            errors.push(`Row ${rowNum}: Staff ID or Email is required.`);
            continue;
        }

        const matchedUser = userMap.get(staffIdentifier.toLowerCase());
        if (!matchedUser) {
            errors.push(`Row ${rowNum}: Doctor/Staff member '${staffIdentifier}' not found in database.`);
            continue;
        }

        const parsedDate = parseExcelDate(rawDate);
        if (!parsedDate || isNaN(parsedDate.getTime())) {
            errors.push(`Row ${rowNum}: Invalid shift date '${rawDate}'. Expected YYYY-MM-DD.`);
            continue;
        }

        // Validate Shift Type
        const validTypes = ["Morning", "Evening", "Night", "Custom", "On-Call"];
        let shiftType = validTypes.find((t) => t.toLowerCase() === rawShiftType.toLowerCase());
        if (!shiftType) {
            shiftType = "Morning";
            warnings.push(`Row ${rowNum}: Unknown shift type '${rawShiftType}', defaulted to 'Morning'.`);
        }

        // Determine Start and End Times
        const defaultTimes = STANDARD_SHIFT_HOURS[shiftType] || STANDARD_SHIFT_HOURS.Morning;
        const startTimeStr = rawStartTime || defaultTimes.start;
        const endTimeStr = rawEndTime || defaultTimes.end;

        // Base date with 00:00:00
        const shiftDateNormalized = new Date(parsedDate);
        shiftDateNormalized.setHours(0, 0, 0, 0);

        const startTime = combineDateAndTime(shiftDateNormalized, startTimeStr);
        // If night shift or end time is earlier than start time, end is next day
        const isNextDay = shiftType === "Night" || endTimeStr < startTimeStr;
        const endTime = combineDateAndTime(shiftDateNormalized, endTimeStr, isNextDay);

        // Check for duplicate or overlapping shift for this user in DB
        const existingOverlap = await ShiftSchedule.findOne({
            user: matchedUser._id,
            status: { $ne: "Cancelled" },
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } },
                { startTime: { $lte: startTime }, endTime: { $gte: endTime } },
            ],
        }).lean();

        if (existingOverlap) {
            warnings.push(
                `Row ${rowNum}: ${matchedUser.name} already has a scheduled shift on ${shiftDateNormalized.toISOString().split("T")[0]} (${shiftType}). Overlap flagged.`
            );
        }

        validatedRows.push({
            rowNum,
            user: matchedUser._id,
            userId: matchedUser.userId,
            userName: matchedUser.name,
            userEmail: matchedUser.email,
            userRole: matchedUser.role,
            shiftDate: shiftDateNormalized,
            shiftType,
            startTime,
            endTime,
            wardZone: wardZone || "General Pediatric Ward",
            dutyRole: dutyRole || matchedUser.role,
            notes: notes || "Bulk imported from Excel roster",
            source: "Excel_Import",
            status: "Scheduled",
            hasOverlapWarning: !!existingOverlap,
        });
    }

    return {
        totalRows: rawRows.length,
        validCount: validatedRows.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
        previewRows: validatedRows,
    };
};

/**
 * Commit validated rows to the database
 */
const commitImportedShifts = async (validatedRows, assignedByUserId) => {
    if (!validatedRows || validatedRows.length === 0) {
        throw new AppError("No valid shift rows to import", 400);
    }

    const docs = validatedRows.map((r) => ({
        user: r.user,
        shiftDate: r.shiftDate,
        shiftType: r.shiftType,
        startTime: r.startTime,
        endTime: r.endTime,
        gracePeriodMinutes: 45,
        wardZone: r.wardZone,
        dutyRole: r.dutyRole,
        notes: r.notes,
        source: "Excel_Import",
        assignedBy: assignedByUserId,
        status: "Scheduled",
    }));

    const insertedShifts = await ShiftSchedule.insertMany(docs);
    return insertedShifts;
};

module.exports = {
    generateShiftExcelTemplate,
    parseAndValidateExcel,
    commitImportedShifts,
};
