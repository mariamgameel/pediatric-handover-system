require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");

let server;
let baseUrl;

const request = async (path, options = {}) => {
    const url = `${baseUrl}${path}`;
    const headers = {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const status = res.status;
    let data;
    try {
        data = await res.json();
    } catch (e) {
        data = null;
    }

    return { status, data };
};

const runTests = async () => {
    console.log("Starting Pediatric Handover System Integration & Verification Tests...\n");
    await connectDB();

    await new Promise((resolve) => {
        server = app.listen(5001, () => {
            baseUrl = "http://127.0.0.1:5001";
            console.log("Test server running on port 5001");
            resolve();
        });
    });

    try {
        // Test 1: Health Check
        console.log("1. Testing Health Check...");
        const health = await request("/api/health");
        if (health.status === 200 && health.data.success) {
            console.log("   [PASS] API Health Check OK");
        } else {
            throw new Error(`Health check failed: ${JSON.stringify(health)}`);
        }

        // Test 2: Shift-Lockout for Off-Shift Doctor
        console.log("2. Testing Shift Lockout on Off-Shift Clinician...");
        const offShiftLogin = await request("/api/auth/login", {
            method: "POST",
            body: { email: "offshift.doc@hospital.org", password: "Password123!" },
        });
        if (offShiftLogin.status === 403 && offShiftLogin.data.code === "SHIFT_ACCESS_BLOCKED") {
            console.log("   [PASS] Off-shift doctor blocked with SHIFT_ACCESS_BLOCKED as expected");
        } else {
            throw new Error(`Expected shift lockout 403, got: ${JSON.stringify(offShiftLogin)}`);
        }

        // Test 3: Admin Login (Shift-Exempt Super-User)
        console.log("3. Testing Admin Login (Super-User)...");
        const adminLogin = await request("/api/auth/login", {
            method: "POST",
            body: { email: "admin@hospital.org", password: "Password123!" },
        });
        if (adminLogin.status === 200 && adminLogin.data.token && adminLogin.data.data.user.role === "Admin") {
            console.log("   [PASS] Admin authenticated, shift-exempt bypass verified");
        } else {
            throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
        }
        const adminToken = adminLogin.data.token;
        const adminUser = adminLogin.data.data.user;

        // Test 4: Active Resident Login (Within active shift)
        console.log("4. Testing Resident Login (Within Active Shift)...");
        const resLogin = await request("/api/auth/login", {
            method: "POST",
            body: { email: "resident@hospital.org", password: "Password123!" },
        });
        if (resLogin.status === 200 && resLogin.data.token) {
            console.log("   [PASS] Resident authenticated successfully during active shift");
        } else {
            throw new Error(`Resident login failed: ${JSON.stringify(resLogin)}`);
        }
        const residentToken = resLogin.data.token;

        // Test 5: Specialist Login
        console.log("5. Testing Specialist Login...");
        const specLogin = await request("/api/auth/login", {
            method: "POST",
            body: { email: "specialist@hospital.org", password: "Password123!" },
        });
        if (specLogin.status === 200 && specLogin.data.token) {
            console.log("   [PASS] Specialist authenticated successfully");
        } else {
            throw new Error(`Specialist login failed: ${JSON.stringify(specLogin)}`);
        }
        const specialistToken = specLogin.data.token;

        // Test 6: Admin creates new staff account with unique Staff ID
        console.log("6. Testing Admin User Account Creation (Unique Staff ID)...");
        const newUserRes = await request("/api/users", {
            method: "POST",
            token: adminToken,
            body: {
                userId: "DOC-808",
                name: "Dr. Layan Fadi",
                email: "layan.fadi@hospital.org",
                password: "Password123!",
                role: "Resident",
            },
        });
        if (newUserRes.status === 201 && newUserRes.data.data.user.userId === "DOC-808") {
            console.log("   [PASS] Staff account created with unique Staff ID DOC-808");
        } else {
            throw new Error(`User creation failed: ${JSON.stringify(newUserRes)}`);
        }

        // Test 7: Non-Admin attempts to create user account (Must be forbidden)
        console.log("7. Testing Security: Resident attempting to create user account...");
        const residentCreateUser = await request("/api/users", {
            method: "POST",
            token: residentToken,
            body: {
                userId: "DOC-999",
                name: "Hacker",
                email: "hacker@hospital.org",
                password: "Password123!",
            },
        });
        if (residentCreateUser.status === 403) {
            console.log("   [PASS] Non-admin properly blocked from user management (403 Forbidden)");
        } else {
            throw new Error(`Expected 403, got: ${JSON.stringify(residentCreateUser)}`);
        }

        // Test 8: Admin grants emergency shift override to off-shift doctor
        console.log("8. Testing Admin Emergency Shift Access Override...");
        const offShiftUser = await request(`/api/users?search=offshift`, { token: adminToken });
        const offShiftDocId = offShiftUser.data.data.users[0]._id;

        const overrideRes = await request(`/api/shifts/override/${offShiftDocId}`, {
            method: "POST",
            token: adminToken,
            body: { overrideHours: 4, reason: "Emergency pediatric resuscitation coverage" },
        });
        if (overrideRes.status === 200) {
            console.log("   [PASS] Emergency shift access granted by Admin");
        } else {
            throw new Error(`Shift override failed: ${JSON.stringify(overrideRes)}`);
        }

        // Now test off-shift doctor login -> Should succeed!
        const offShiftNowAllowed = await request("/api/auth/login", {
            method: "POST",
            body: { email: "offshift.doc@hospital.org", password: "Password123!" },
        });
        if (offShiftNowAllowed.status === 200 && offShiftNowAllowed.data.token) {
            console.log("   [PASS] Clinician with emergency override now successfully granted access!");
        } else {
            throw new Error(`Expected access after override, got: ${JSON.stringify(offShiftNowAllowed)}`);
        }

        // Test 9: Mandatory Critical Reason Joi Validation
        console.log("9. Testing Patient Creation: Enforcing Critical Reason...");
        const invalidPatient = await request("/api/patients", {
            method: "POST",
            token: residentToken,
            body: {
                patientId: "TEST-001",
                fileNumber: "FILE-TEST-1",
                name: "Test Baby",
                weight: 5.5,
                bedNumber: "Bed 1",
                mainDiagnosis: "Fever",
                age: { years: 0, months: 4, days: 0 },
                status: "Critical", // Critical WITHOUT statusReason
            },
        });
        if (invalidPatient.status === 400) {
            console.log("   [PASS] Rejected patient registration with Critical status lacking reason");
        } else {
            throw new Error(`Expected 400 validation error, got: ${JSON.stringify(invalidPatient)}`);
        }

        // Test 10: Valid Patient Creation
        console.log("10. Testing Valid Patient Admission...");
        const validPatientRes = await request("/api/patients", {
            method: "POST",
            token: residentToken,
            body: {
                patientId: "PED-TEST-88",
                fileNumber: "FILE-TEST-88",
                name: "Baby Adam",
                weight: 6.2,
                bedNumber: "Bed 9C",
                mainDiagnosis: "Neonatal Jaundice",
                age: { years: 0, months: 0, days: 14 },
                status: "Close Monitoring",
            },
        });
        if (validPatientRes.status === 201) {
            console.log("   [PASS] Patient registered successfully with Close Monitoring status");
        } else {
            throw new Error(`Patient registration failed: ${JSON.stringify(validPatientRes)}`);
        }
        const testPatientId = validPatientRes.data.data.patient._id;

        // Test 11: Rapid Clinical Deterioration Flow
        console.log("11. Testing Rapid Clinical Deterioration Recording...");
        const detRes = await request("/api/clinical-updates/deterioration", {
            method: "POST",
            token: residentToken,
            body: {
                patient: testPatientId,
                triggerReason: "Apneic spell with desaturation to 78%",
                escalationLevel: "Resident to Specialist",
                immediateActionTaken: "Tactile stimulation, oxygen via mask, specialist paged",
                setPatientCritical: true,
                criticalReason: "persistent desaturation",
            },
        });
        if (detRes.status === 201 && detRes.data.data.patientStatus === "Critical") {
            console.log("   [PASS] Rapid deterioration recorded; patient status escalated to Critical");
        } else {
            throw new Error(`Deterioration recording failed: ${JSON.stringify(detRes)}`);
        }

        // Test 12: Investigation Lifecycle & Role Restriction
        console.log("12. Testing Investigation Ordering, Result Entry, and Role-Gated Review...");
        const reqInv = await request("/api/investigations", {
            method: "POST",
            token: residentToken,
            body: {
                patient: testPatientId,
                name: "Total Serum Bilirubin",
                type: "Laboratory",
            },
        });
        const invId = reqInv.data.data.investigation._id;

        const recordRes = await request(`/api/investigations/${invId}/result`, {
            method: "PATCH",
            token: residentToken,
            body: {
                result: "Total Bilirubin 310 umol/L (Above exchange transfusion threshold)",
                isAbnormal: true,
            },
        });
        if (recordRes.status === 200 && recordRes.data.data.investigation.status === "Result Available") {
            console.log("   [PASS] Result entered and marked 'Result Available'");
        } else {
            throw new Error(`Result entry failed: ${JSON.stringify(recordRes)}`);
        }

        // Resident attempts review (Must be forbidden)
        const resAttemptReview = await request(`/api/investigations/${invId}/review`, {
            method: "PATCH",
            token: residentToken,
            body: { notes: "Looks high" },
        });
        if (resAttemptReview.status === 403) {
            console.log("   [PASS] Resident blocked from formally reviewing investigation results (403 Forbidden)");
        } else {
            throw new Error(`Expected 403 for resident review, got: ${JSON.stringify(resAttemptReview)}`);
        }

        // Specialist reviews (Must succeed)
        const specReview = await request(`/api/investigations/${invId}/review`, {
            method: "PATCH",
            token: specialistToken,
            body: { notes: "Reviewed: Initiate intensive phototherapy immediately" },
        });
        if (specReview.status === 200 && specReview.data.data.investigation.status === "Reviewed") {
            console.log("   [PASS] Specialist formally reviewed investigation result");
        } else {
            throw new Error(`Specialist review failed: ${JSON.stringify(specReview)}`);
        }

        // Test 13: Management Plan Versioning & Role Checks
        console.log("13. Testing Versioned Management Plan Authoring...");
        // Resident authoring plan (Must be forbidden)
        const resPlan = await request("/api/management-plans", {
            method: "POST",
            token: residentToken,
            body: {
                patient: testPatientId,
                plan: "Phototherapy and fluids",
            },
        });
        if (resPlan.status === 403) {
            console.log("   [PASS] Resident blocked from creating management plans (403 Forbidden)");
        } else {
            throw new Error(`Expected 403 for resident plan, got: ${JSON.stringify(resPlan)}`);
        }

        // Specialist authors v1
        const specPlanV1 = await request("/api/management-plans", {
            method: "POST",
            token: specialistToken,
            body: {
                patient: testPatientId,
                plan: "Intensive triple phototherapy, IV hydration, check bilirubin in 4h",
                clinicalReasoning: "Hyperbilirubinemia approaching exchange level",
            },
        });
        if (specPlanV1.status === 201 && specPlanV1.data.data.managementPlan.version === 1) {
            console.log("   [PASS] Specialist authored Management Plan v1");
        } else {
            throw new Error(`Plan v1 failed: ${JSON.stringify(specPlanV1)}`);
        }

        // Admin (Super-User) authors v2 superseding v1
        const adminPlanV2 = await request("/api/management-plans", {
            method: "POST",
            token: adminToken,
            body: {
                patient: testPatientId,
                plan: "Continue triple phototherapy, add IV albumin before exchange if TSB > 340",
            },
        });
        if (adminPlanV2.status === 201 && adminPlanV2.data.data.managementPlan.version === 2) {
            console.log("   [PASS] Admin (super-user) authored Management Plan v2 (superseded v1, immutable history)");
        } else {
            throw new Error(`Plan v2 failed: ${JSON.stringify(adminPlanV2)}`);
        }

        // Test 14: Timeline Service Aggregation (Zero Dedicated Collection)
        console.log("14. Testing Timeline Aggregator Service...");
        const timelineRes = await request(`/api/patients/${testPatientId}/timeline`, {
            token: residentToken,
        });
        if (timelineRes.status === 200 && timelineRes.data.data.timeline.length >= 3) {
            console.log(`   [PASS] Timeline aggregated ${timelineRes.data.data.timeline.length} events across patient models on-the-fly`);
        } else {
            throw new Error(`Timeline aggregation failed: ${JSON.stringify(timelineRes)}`);
        }

        // Test 15: Handover Engine Auto-Summary & Critical Warnings
        console.log("15. Testing Automated Handover Compilation...");
        const handoverPreview = await request(`/api/handovers/preview/${testPatientId}`, {
            token: residentToken,
        });
        if (
            handoverPreview.status === 200 &&
            handoverPreview.data.data.recommendedStatus === "Critical — Verbal Handover Required"
        ) {
            console.log("   [PASS] Handover Engine compiled structured summary with 'Critical — Verbal Handover Required' rule flag");
        } else {
            throw new Error(`Handover preview failed: ${JSON.stringify(handoverPreview)}`);
        }

        // Test 16: Audit Trail Verification
        console.log("16. Testing Immutable Audit Trail...");
        const auditRes = await request("/api/audit", { token: adminToken });
        if (auditRes.status === 200 && auditRes.data.count > 0) {
            console.log(`   [PASS] Audit trail verified with ${auditRes.data.count} immutable system logs`);
        } else {
            throw new Error(`Audit verification failed: ${JSON.stringify(auditRes)}`);
        }

        console.log("\n=================================================");
        console.log("ALL 16 INTEGRATION & CLINICAL TESTS PASSED!");
        console.log("=================================================");
    } catch (err) {
        console.error("\nTEST FAILURE:", err);
        process.exitCode = 1;
    } finally {
        if (server) server.close();
        process.exit(process.exitCode || 0);
    }
};

runTests();
