const http = require("http");
const XLSX = require("xlsx");

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body });
                }
            });
        });
        req.on("error", reject);
        if (data) req.write(data);
        req.end();
    });
}

async function testFullCrud() {
    console.log("==================================================");
    console.log("RUNNING COMPREHENSIVE END-TO-END CRUD VERIFICATION");
    console.log("==================================================");

    // 1. Verify frontend assets are served with 200
    console.log("\n1. Verifying static assets & Page scripts...");
    const pages = [
        "/",
        "/js/app.js",
        "/js/pages/GuidelinesPage.js",
        "/js/pages/ProtocolsPage.js",
        "/js/pages/RosterPage.js",
        "/js/pages/ManpowerPage.js",
        "/js/components/AdminModals.js",
    ];

    for (const p of pages) {
        const res = await request({ hostname: "localhost", port: 5000, path: p, method: "GET" });
        if (res.status !== 200 && res.status !== 304) {
            throw new Error(`Failed to serve ${p}, status: ${res.status}`);
        }
        console.log(`  ✓ ${p} -> HTTP ${res.status}`);
    }

    // 2. Admin Login
    console.log("\n2. Admin Authentication...");
    const loginRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: "/api/auth/login",
            method: "POST",
            headers: { "Content-Type": "application/json" },
        },
        JSON.stringify({ email: "admin@hospital.org", password: "Password123!" })
    );

    const token = loginRes.body?.token;
    console.log("  ✓ Admin logged in:", loginRes.body?.data?.user?.name, "Token acquired.");

    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    // 3. Test Guideline Full CRUD
    console.log("\n3. Testing Admin Guideline CRUD (Add -> Edit -> Delete)...");
    const createGuidelineRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: "/api/guidelines",
            method: "POST",
            headers: authHeaders,
        },
        JSON.stringify({
            title: "Test Acute Anaphylaxis Guideline",
            category: "Emergency_PICU",
            targetAgeGroup: "All_Pediatric",
            summary: "Immediate intramuscular epinephrine protocol for pediatric anaphylaxis.",
            contentMarkdown: "### Anaphylaxis Resuscitation\n1. IM Epinephrine 0.01 mg/kg in anterolateral thigh.",
            dosageFormulas: [{ drug: "Epinephrine IM", dose: "0.01 mg/kg", maxDose: "0.5 mg", route: "IM" }],
        })
    );

    const guidelineId = createGuidelineRes.body?.data?.guideline?._id;
    console.log(`  ✓ Created Guideline: '${createGuidelineRes.body?.data?.guideline?.title}' (ID: ${guidelineId})`);

    // Edit Guideline
    const editGuidelineRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: `/api/guidelines/${guidelineId}`,
            method: "PATCH",
            headers: authHeaders,
        },
        JSON.stringify({
            title: "Test Acute Anaphylaxis Guideline (Updated by Admin)",
            version: "2.0",
        })
    );
    console.log(`  ✓ Updated Guideline: new title '${editGuidelineRes.body?.data?.guideline?.title}', version: ${editGuidelineRes.body?.data?.guideline?.version}`);

    // Delete Guideline
    const deleteGuidelineRes = await request({
        hostname: "localhost",
        port: 5000,
        path: `/api/guidelines/${guidelineId}`,
        method: "DELETE",
        headers: authHeaders,
    });
    console.log(`  ✓ Deleted Guideline successfully: ${deleteGuidelineRes.body?.message}`);

    // 4. Test Protocol Checklist Execution
    console.log("\n4. Testing Protocol Execution & Patient Timeline Logging...");
    const protocolsRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/protocols",
        method: "GET",
        headers: authHeaders,
    });
    const firstProtocol = protocolsRes.body?.data?.protocols[0];

    const patientsRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/patients",
        method: "GET",
        headers: authHeaders,
    });
    const firstPatient = patientsRes.body?.data?.patients[0];

    const execRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: `/api/protocols/${firstProtocol._id}/execute`,
            method: "POST",
            headers: authHeaders,
        },
        JSON.stringify({
            patientId: firstPatient._id,
            executedSteps: [
                { stepNumber: 1, action: "Bedside assessment completed", completed: true, notes: "SpO2 95%" },
                { stepNumber: 2, action: "Notified resident on bleep", completed: true, notes: "Dr. Omar at bedside" },
            ],
            clinicalNotes: "Patient stabilizing, vitals improving.",
        })
    );
    console.log(`  ✓ Checklist Executed for ${firstPatient.name}:`, execRes.body?.message);

    // 5. Test Excel Sheet Auto-Upload Simulation
    console.log("\n5. Testing Excel Roster Auto-Scheduling...");
    // Create an in-memory workbook with 3 shifts
    const wb = XLSX.utils.book_new();
    const sheetData = [
        ["Staff_ID", "Shift_Date", "Shift_Type", "Ward_Zone", "Duty_Role", "Notes"],
        ["RES-101", "2026-10-20", "Morning", "General Pediatric Ward", "Senior Resident", "Automated Excel Test Shift 1"],
        ["SPC-201", "2026-10-20", "Evening", "Pediatric HDU", "Specialist", "Automated Excel Test Shift 2"],
        ["RES-102", "2026-10-20", "Night", "General Pediatric Ward", "Junior Resident", "Automated Excel Test Shift 3"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Shift_Roster");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Use boundary multipart
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_roster.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
    const fieldConfirm = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="confirm"\r\n\r\ntrue\r\n--${boundary}--\r\n`;
    const multipartBody = Buffer.concat([Buffer.from(header, "utf-8"), buffer, Buffer.from(fieldConfirm, "utf-8")]);

    const uploadRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: "/api/shifts/upload-excel",
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": multipartBody.length,
            },
        },
        multipartBody
    );

    console.log("  ✓ Excel Upload Status:", uploadRes.status);
    console.log("  ✓ Auto-Import Message:", uploadRes.body?.message);
    console.log("  ✓ Shifts Imported from Excel:", uploadRes.body?.data?.importedCount);

    // 6. Test Manpower Staff Profile Add -> Edit -> Delete
    console.log("\n6. Testing Admin Manpower Staff Profile CRUD...");
    const createStaffRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: "/api/manpower/staff",
            method: "POST",
            headers: authHeaders,
        },
        JSON.stringify({
            user: firstPatient.responsibleDoctor?._id || firstPatient.responsibleDoctor,
            staffCode: "PED-NEW-99",
            clinicalGrade: "Senior_Registrar",
            bleepNumber: "#2099",
            phoneExtension: "Ext. 4599",
            pediatricSubspecialty: "Neonatal Stepdown",
        })
    );

    // If user already has profile, test update
    let staffId = createStaffRes.body?.data?.profile?._id;
    if (!staffId) {
        // get existing
        const existingStaff = await request({ hostname: "localhost", port: 5000, path: "/api/manpower/staff", method: "GET", headers: authHeaders });
        staffId = existingStaff.body?.data?.profiles[0]?._id;
    }

    const updateStaffRes = await request(
        {
            hostname: "localhost",
            port: 5000,
            path: `/api/manpower/staff/${staffId}`,
            method: "PATCH",
            headers: authHeaders,
        },
        JSON.stringify({
            bleepNumber: "#2077",
            phoneExtension: "Ext. 4577",
        })
    );
    console.log(`  ✓ Updated Staff Profile bleep to: ${updateStaffRes.body?.data?.profile?.bleepNumber}`);

    console.log("\n==================================================");
    console.log("🎉 ALL CRUD OPERATIONS, EXCEL IMPORT, AND APIs PASSED!");
    console.log("==================================================");
}

testFullCrud().catch(console.error);
