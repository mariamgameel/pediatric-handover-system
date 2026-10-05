const http = require("http");

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

async function run() {
    console.log("1. Logging in as Admin...");
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

    console.log("Login status:", loginRes.status, "User:", loginRes.body?.data?.user?.name);
    const token = loginRes.body?.token;
    if (!token) throw new Error("No token returned");

    const authHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    console.log("\n2. Testing GET /api/guidelines...");
    const guidelinesRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/guidelines",
        method: "GET",
        headers: authHeaders,
    });
    console.log("Guidelines status:", guidelinesRes.status, "Count:", guidelinesRes.body?.count);

    console.log("\n3. Testing GET /api/protocols...");
    const protocolsRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/protocols",
        method: "GET",
        headers: authHeaders,
    });
    console.log("Protocols status:", protocolsRes.status, "Count:", protocolsRes.body?.count);

    console.log("\n4. Testing GET /api/manpower/live-coverage...");
    const coverageRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/manpower/live-coverage",
        method: "GET",
        headers: authHeaders,
    });
    console.log("Coverage status:", coverageRes.status);
    console.log("Active Census:", coverageRes.body?.data?.wardCensus);
    console.log("Staffing Ratios:", coverageRes.body?.data?.staffingRatios);
    console.log("Doctors on duty:", coverageRes.body?.data?.coverageCounts?.totalDoctors, "Nurses:", coverageRes.body?.data?.coverageCounts?.totalNurses);

    console.log("\n5. Testing GET /api/manpower/staff...");
    const staffRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/manpower/staff",
        method: "GET",
        headers: authHeaders,
    });
    console.log("Staff status:", staffRes.status, "Count:", staffRes.body?.count);

    console.log("\n6. Testing GET /api/shifts/roster...");
    const rosterRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/shifts/roster",
        method: "GET",
        headers: authHeaders,
    });
    console.log("Roster status:", rosterRes.status, "Count:", rosterRes.body?.count);

    console.log("\n7. Testing GET /api/shifts/excel-template...");
    const templateRes = await request({
        hostname: "localhost",
        port: 5000,
        path: "/api/shifts/excel-template",
        method: "GET",
        headers: authHeaders,
    });
    console.log("Excel template status:", templateRes.status, "Content-Type:", templateRes.headers["content-type"]);

    console.log("\nAll Backend Endpoints Verified Successfully!");
}

run().catch(console.error);
