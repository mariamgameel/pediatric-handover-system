const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Pediatric Handover & Clinical Follow-up API",
    version: "1.0.0",
    description: `
**Minimal web system for a hospital Pediatrics Department to handle patient handover and clinical follow-up.**

### Key Security & Governance Rules:
* **JWT Authentication:** Pass \`Bearer <token>\` in the \`Authorization\` header. Use the **Authorize** button above.
* **Super-User Admin:** Admin has full permissions across all endpoints and bypasses role restrictions.
* **Shift-Lockout:** Doctors without an active scheduled shift are blocked with \`403 Forbidden\` (\`SHIFT_ACCESS_BLOCKED\`). Admin and exempt clinicians (Consultant) bypass this restriction.
* **Zero Overwrite:** Vital signs, problem histories, management plans (versioned stack), and audit logs are append-only.
* **Mandatory Critical Reasons:** Changing status to \`Critical\` requires a reason from a fixed clinical list.
* **4-Stage Investigation Lifecycle:** \`Requested\` → \`Pending\` → \`Result Available\` → \`Reviewed\`.

### Demo Test Credentials (All passwords: \`Password123!\`):
* **Admin:** \`admin@hospital.org\` (Amira Fouad, Staff ID: \`ADM-001\`, Shift-Exempt, Full System Authority)
* **Consultant:** \`consultant@hospital.org\` (Staff ID: \`CNS-301\`, Shift-Exempt On-call)
* **Specialist:** \`specialist@hospital.org\` (Staff ID: \`SPC-201\`, Active Shift Scheduled)
* **Resident:** \`resident@hospital.org\` (Staff ID: \`RES-101\`, Active Shift Scheduled)
* **Off-Shift Doctor:** \`offshift.doc@hospital.org\` (Staff ID: \`RES-999\`, Outside Shift - will be blocked until Admin grants an override)
    `,
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from POST /api/auth/login",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          code: { type: "string", example: "SHIFT_ACCESS_BLOCKED" },
        },
      },
      User: {
        type: "object",
        properties: {
          _id: { type: "string" },
          userId: { type: "string", example: "RES-101" },
          name: { type: "string", example: "Dr. Omar Khaled" },
          email: { type: "string", example: "resident@hospital.org" },
          role: { type: "string", enum: ["Resident", "Specialist", "Consultant", "Admin"] },
          status: { type: "string", enum: ["Active", "Inactive"] },
          shiftExempt: { type: "boolean" },
          permissions: { type: "array", items: { type: "string" } },
        },
      },
      Patient: {
        type: "object",
        properties: {
          _id: { type: "string" },
          patientId: { type: "string", example: "PED-2026-001" },
          fileNumber: { type: "string", example: "FILE-77401" },
          name: { type: "string", example: "Zaid Al-Mansour" },
          bedNumber: { type: "string", example: "Bed 3A" },
          age: {
            type: "object",
            properties: {
              years: { type: "number", example: 0 },
              months: { type: "number", example: 8 },
              days: { type: "number", example: 12 },
            },
          },
          weight: { type: "number", example: 8.4 },
          mainDiagnosis: { type: "string", example: "Acute Severe Viral Bronchiolitis" },
          allergies: { type: "array", items: { type: "string" }, example: ["NKDA"] },
          status: { type: "string", enum: ["Stable", "Close Monitoring", "Critical"], example: "Critical" },
          statusReason: {
            type: "string",
            enum: [
              "respiratory distress",
              "increased O2 requirement",
              "persistent desaturation",
              "altered consciousness",
              "convulsions",
              "poor perfusion",
              "persistent hypotension",
              "other",
            ],
            example: "respiratory distress",
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    "/api/health": {
      get: {
        summary: "System Health Check",
        description: "Checks if the API is running smoothly",
        security: [],
        responses: {
          200: { description: "API is healthy" },
        },
      },
    },

    // ==================== AUTH ====================
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate Staff Member",
        description: "Validates credentials, verifies scheduled shift window (for non-exempt doctors), updates last login, and returns JWT.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "admin@hospital.org" },
                  password: { type: "string", example: "Password123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful; returns JWT token" },
          401: { description: "Invalid credentials" },
          403: { description: "Account inactive OR shift access blocked outside scheduled hours" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get Current Logged-in Staff Profile",
        description: "Returns currently authenticated doctor profile, active permissions, and shift status.",
        responses: {
          200: { description: "Staff profile returned" },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ==================== USER MANAGEMENT (ADMIN) ====================
    "/api/users": {
      get: {
        tags: ["User Management (Admin Only)"],
        summary: "List All Staff Accounts",
        description: "Admin lists all users with role, unique Staff ID, shift exemption, and status.",
        parameters: [
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Staff accounts list" } },
      },
      post: {
        tags: ["User Management (Admin Only)"],
        summary: "Create Staff Account",
        description: "Only Admin can create user accounts. Requires a unique Staff ID (e.g. DOC-104) to avoid same-name confusion.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "name", "email", "password", "role"],
                properties: {
                  userId: { type: "string", example: "DOC-202" },
                  name: { type: "string", example: "Dr. Layan Fadi" },
                  email: { type: "string", example: "layan.fadi@hospital.org" },
                  password: { type: "string", example: "Password123!" },
                  role: { type: "string", enum: ["Resident", "Specialist", "Consultant", "Admin"], example: "Resident" },
                  shiftExempt: { type: "boolean", example: false },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Staff member created" } },
      },
    },
    "/api/users/{id}/role": {
      patch: {
        tags: ["User Management (Admin Only)"],
        summary: "Update Staff Role",
        description: "Admin changes staff role and automatically updates default role permissions.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["Resident", "Specialist", "Consultant", "Admin"] },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Role updated" } },
      },
    },
    "/api/users/{id}/permissions": {
      patch: {
        tags: ["User Management (Admin Only)"],
        summary: "Dynamically Update Individual Permissions",
        description: "Admin dynamically grants or revokes specific permissions for a staff member.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["permissions"],
                properties: {
                  permissions: {
                    type: "array",
                    items: { type: "string" },
                    example: ["view_patients", "record_vitals", "review_investigations", "create_management_plan"],
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Permissions updated" } },
      },
    },
    "/api/users/{id}/status": {
      patch: {
        tags: ["User Management (Admin Only)"],
        summary: "Activate or Deactivate Staff Account",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["Active", "Inactive"] } },
              },
            },
          },
        },
        responses: { 200: { description: "Status updated" } },
      },
    },

    // ==================== SHIFT MANAGEMENT & ACCESS CONTROL ====================
    "/api/shifts/my": {
      get: {
        tags: ["Shifts & Access Control"],
        summary: "Get Logged-in Clinician Shifts",
        description: "Returns current and upcoming shifts for the authenticated doctor.",
        responses: { 200: { description: "Doctor shifts returned" } },
      },
    },
    "/api/shifts": {
      get: {
        tags: ["Shifts & Access Control"],
        summary: "List All Shift Rosters (Admin Only)",
        parameters: [
          { name: "userId", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "All shifts roster returned" } },
      },
      post: {
        tags: ["Shifts & Access Control"],
        summary: "Assign Shift to Clinician (Admin Only)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user", "shiftDate", "shiftType", "startTime", "endTime"],
                properties: {
                  user: { type: "string", example: "6ab6aac0fc7313efa30d7154" },
                  shiftDate: { type: "string", format: "date-time" },
                  shiftType: { type: "string", enum: ["Morning", "Evening", "Night", "Custom", "On-Call"], example: "Morning" },
                  startTime: { type: "string", format: "date-time" },
                  endTime: { type: "string", format: "date-time" },
                  gracePeriodMinutes: { type: "number", example: 45 },
                  notes: { type: "string", example: "Ward Bedside Floor Duty" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Shift assigned" } },
      },
    },
    "/api/shifts/override/{userId}": {
      post: {
        tags: ["Shifts & Access Control"],
        summary: "Grant Emergency Shift Access Override (Admin Only)",
        description: "Instantly unblocks an off-shift doctor for a temporary period (e.g. 4 hours) during emergencies.",
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  overrideHours: { type: "number", example: 4 },
                  reason: { type: "string", example: "Covering emergency bedside resuscitation" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Emergency override granted" } },
      },
    },
    "/api/shifts/exempt/{userId}": {
      patch: {
        tags: ["Shifts & Access Control"],
        summary: "Toggle Permanent Shift-Lockout Exemption (Admin Only)",
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shiftExempt"],
                properties: { shiftExempt: { type: "boolean", example: true } },
              },
            },
          },
        },
        responses: { 200: { description: "Exemption toggled" } },
      },
    },

    // ==================== DASHBOARD ====================
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get Ward Clinical Dashboard Summary",
        description: "Returns patient status counts (Critical, Close Monitoring, Stable), Critical Shelf, unreviewed results, and personal/overdue tasks.",
        responses: { 200: { description: "Dashboard summary data" } },
      },
    },

    // ==================== PATIENTS ====================
    "/api/patients": {
      get: {
        tags: ["Patients"],
        summary: "List / Search Patients",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["Critical", "Close Monitoring", "Stable"] } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name, bed, file number, ID" },
          { name: "discharged", in: "query", schema: { type: "boolean" }, description: "Default false" },
        ],
        responses: { 200: { description: "Patients list" } },
      },
      post: {
        tags: ["Patients"],
        summary: "Register / Admit Pediatric Inpatient",
        description: "Registers patient. If status is Critical, a statusReason from the approved list is mandatory.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patientId", "fileNumber", "name", "weight", "bedNumber", "mainDiagnosis", "age"],
                properties: {
                  patientId: { type: "string", example: "PED-2026-004" },
                  fileNumber: { type: "string", example: "FILE-12345" },
                  name: { type: "string", example: "Sami Tariq" },
                  weight: { type: "number", example: 10.5 },
                  bedNumber: { type: "string", example: "Bed 6A" },
                  mainDiagnosis: { type: "string", example: "Acute Lobar Pneumonia" },
                  age: {
                    type: "object",
                    properties: {
                      years: { type: "number", example: 1 },
                      months: { type: "number", example: 6 },
                      days: { type: "number", example: 0 },
                    },
                  },
                  allergies: { type: "array", items: { type: "string" }, example: ["Penicillin"] },
                  status: { type: "string", enum: ["Stable", "Close Monitoring", "Critical"], example: "Close Monitoring" },
                  statusReason: { type: "string", example: "increased O2 requirement" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Patient registered successfully" } },
      },
    },
    "/api/patients/{id}": {
      get: {
        tags: ["Patients"],
        summary: "Get Patient Profile Workspace",
        description: "Aggregates identity, latest vitals, active problems, current management plan, and tracks doctor view for 'What Changed?' deltas.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Patient workspace details" } },
      },
    },
    "/api/patients/{id}/status": {
      patch: {
        tags: ["Patients"],
        summary: "Update Patient Status & Clinical Escalation",
        description: "Updates status. If changing to Critical, requires statusReason and automatically generates a Critical Alert.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["Stable", "Close Monitoring", "Critical"], example: "Critical" },
                  statusReason: {
                    type: "string",
                    enum: [
                      "respiratory distress",
                      "increased O2 requirement",
                      "persistent desaturation",
                      "altered consciousness",
                      "convulsions",
                      "poor perfusion",
                      "persistent hypotension",
                      "other",
                    ],
                    example: "persistent desaturation",
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Status updated" } },
      },
    },
    "/api/patients/{id}/discharge": {
      post: {
        tags: ["Patients"],
        summary: "Discharge / Transfer Patient",
        description: "Removes patient from active ward lists while preserving all measurement and clinical history intact.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["outcome", "summaryNotes"],
                properties: {
                  outcome: { type: "string", enum: ["Discharged", "Transferred", "Referred", "Other"], example: "Discharged" },
                  summaryNotes: { type: "string", example: "Afebrile 48h, oral intake excellent, discharge on oral antibiotics." },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Discharge recorded" } },
      },
    },
    "/api/patients/{id}/what-changed": {
      get: {
        tags: ["Patients"],
        summary: "What Changed? (Clinical Delta Since Doctor's Last Visit)",
        description: "Compares changes (status changes, deterioration, unreviewed results, new consultant plans, tasks) since the requesting clinician's previous visit.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Delta changes list returned" } },
      },
    },
    "/api/patients/{id}/timeline": {
      get: {
        tags: ["Patients"],
        summary: "Unified Chronological Timeline (Zero-Storage Aggregator)",
        description: "Aggregates events on-the-fly from Vitals, Problems, Updates, Investigations, Tasks, Plans, and Status transitions without a separate collection.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Timeline events stream returned" } },
      },
    },

    // ==================== VITALS ====================
    "/api/vitals": {
      post: {
        tags: ["Vital Signs"],
        summary: "Record Bedside Vital Signs (Append-Only)",
        description: "Stores historical measurements; never overwrites previous records.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient"],
                properties: {
                  patient: { type: "string", example: "6ab6aac0fc7313efa30d715a" },
                  temperature: { type: "number", example: 38.2 },
                  heartRate: { type: "number", example: 140 },
                  respiratoryRate: { type: "number", example: 45 },
                  bloodPressure: {
                    type: "object",
                    properties: {
                      systolic: { type: "number", example: 95 },
                      diastolic: { type: "number", example: 58 },
                    },
                  },
                  spO2: { type: "number", example: 96 },
                  gcs: { type: "number", example: 15 },
                  oxygenSupport: {
                    type: "object",
                    properties: {
                      mode: {
                        type: "string",
                        enum: ["Room Air", "Nasal Cannula", "Face Mask", "Non-Rebreather Mask", "High Flow Nasal Cannula", "CPAP/BiPAP", "Mechanical Ventilation"],
                        example: "Nasal Cannula",
                      },
                      flowRate: { type: "number", example: 2 },
                      fiO2: { type: "number", example: 28 },
                    },
                  },
                  ivFluids: { type: "string", example: "D5 0.45% NS at 40 ml/hr" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Vitals recorded" } },
      },
    },
    "/api/vitals/patient/{patientId}": {
      get: {
        tags: ["Vital Signs"],
        summary: "Get Patient Vitals History",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Vitals history returned" } },
      },
    },

    // ==================== ACTIVE PROBLEMS ====================
    "/api/problems": {
      post: {
        tags: ["Active Problems"],
        summary: "Record Active Problem",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "title"],
                properties: {
                  patient: { type: "string", example: "6ab6aac0fc7313efa30d715a" },
                  title: { type: "string", example: "Persistent Tachycardia" },
                  description: { type: "string", example: "HR 160s despite fluid bolus" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Problem recorded" } },
      },
    },
    "/api/problems/{id}/resolve": {
      patch: {
        tags: ["Active Problems"],
        summary: "Resolve Active Problem (Archive to History)",
        description: "Marks problem Resolved with doctor name and clinical note; never deletes the problem.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resolutionNote"],
                properties: { resolutionNote: { type: "string", example: "Resolved with antipyretic and volume expansion" } },
              },
            },
          },
        },
        responses: { 200: { description: "Problem resolved" } },
      },
    },
    "/api/problems/patient/{patientId}": {
      get: {
        tags: ["Active Problems"],
        summary: "Get Patient Problems",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Problems list" } },
      },
    },

    // ==================== CLINICAL UPDATES & DETERIORATION ====================
    "/api/clinical-updates": {
      post: {
        tags: ["Clinical Updates & Deterioration"],
        summary: "Add Clinical Note / Update",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "type", "details"],
                properties: {
                  patient: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["Clinical Change", "New Investigation", "New Result", "Treatment Change", "Consultation", "New Task", "Clinical Deterioration", "Other"],
                    example: "Clinical Change",
                  },
                  details: { type: "string", example: "Patient feeding well, chest signs improving." },
                  severity: { type: "string", enum: ["Routine", "Urgent", "Emergency"], example: "Routine" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Update saved" } },
      },
    },
    "/api/clinical-updates/deterioration": {
      post: {
        tags: ["Clinical Updates & Deterioration"],
        summary: "Bedside Rapid Clinical Deterioration Quick-Record",
        description: "1-click bedside workflow: records deterioration, logs doctor & time, escalates patient to Critical with reason, and generates immediate Emergency alerts.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "triggerReason", "escalationLevel", "immediateActionTaken"],
                properties: {
                  patient: { type: "string" },
                  triggerReason: { type: "string", example: "Sudden desaturation to 80% on high flow O2" },
                  escalationLevel: {
                    type: "string",
                    enum: ["Resident to Specialist", "Specialist to Consultant", "PICU Review Required", "Emergency Code Team Called"],
                    example: "PICU Review Required",
                  },
                  immediateActionTaken: { type: "string", example: "Switched to 100% Non-rebreather mask, suctioned airway, PICU fellow paged" },
                  setPatientCritical: { type: "boolean", example: true },
                  criticalReason: { type: "string", example: "respiratory distress" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Deterioration logged and alerts triggered" } },
      },
    },

    // ==================== MANAGEMENT PLANS ====================
    "/api/management-plans": {
      post: {
        tags: ["Management Plans"],
        summary: "Author New Management Plan Version (Specialist / Consultant / Admin)",
        description: "Versioned stack: older plans are superseded, never replaced. Residents are restricted from authoring plans.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "plan"],
                properties: {
                  patient: { type: "string" },
                  plan: { type: "string", example: "Wean high flow oxygen as tolerated. Maintain IV hydration." },
                  recommendations: { type: "string", example: "Recheck blood gas if tachypnea worsens." },
                  clinicalReasoning: { type: "string", example: "Clinical improvement with decreasing work of breathing." },
                  supportiveCare: { type: "string", example: "Chest physiotherapy Q8H" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Management plan created and version incremented" } },
      },
    },
    "/api/management-plans/patient/{patientId}": {
      get: {
        tags: ["Management Plans"],
        summary: "Get Patient Management Plan Stack",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Current plan and immutable revision history" } },
      },
    },

    // ==================== INVESTIGATIONS ====================
    "/api/investigations": {
      post: {
        tags: ["Investigations"],
        summary: "Request Diagnostic Investigation",
        description: "Initiates lifecycle in status 'Requested'.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "name", "type"],
                properties: {
                  patient: { type: "string" },
                  name: { type: "string", example: "Serum Electrolytes" },
                  type: { type: "string", enum: ["Laboratory", "Radiology", "Microbiology", "Bedside", "Other"], example: "Laboratory" },
                  notes: { type: "string", example: "Assess hydration status" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Investigation requested" } },
      },
    },
    "/api/investigations/{id}/result": {
      patch: {
        tags: ["Investigations"],
        summary: "Enter Investigation Result",
        description: "Transitions status to 'Result Available'. If marked abnormal, immediately fires a high-priority alert.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["result"],
                properties: {
                  result: { type: "string", example: "Na 134, K 4.0, Cl 98 (Normal)" },
                  isAbnormal: { type: "boolean", example: false },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Result recorded" } },
      },
    },
    "/api/investigations/{id}/review": {
      patch: {
        tags: ["Investigations"],
        summary: "Formally Review Investigation Result (Specialist / Consultant / Admin)",
        description: "Transitions status to 'Reviewed' with reviewer ID and timestamp. Residents are restricted.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { notes: { type: "string", example: "Electrolytes acceptable; continue maintenance fluids." } },
              },
            },
          },
        },
        responses: { 200: { description: "Investigation formally reviewed" } },
      },
    },
    "/api/investigations/unreviewed": {
      get: {
        tags: ["Investigations"],
        summary: "Get All Unreviewed Results Across Ward",
        description: "Returns all 'Result Available' investigations awaiting doctor review.",
        responses: { 200: { description: "Unreviewed results list" } },
      },
    },

    // ==================== TASKS ====================
    "/api/tasks/my": {
      get: {
        tags: ["Clinical Tasks"],
        summary: "Get Logged-in Doctor's Tasks",
        responses: { 200: { description: "Personal task queue" } },
      },
    },
    "/api/tasks/overdue": {
      get: {
        tags: ["Clinical Tasks"],
        summary: "Get Overdue Tasks Across Ward",
        responses: { 200: { description: "Overdue tasks list" } },
      },
    },
    "/api/tasks": {
      post: {
        tags: ["Clinical Tasks"],
        summary: "Create Clinical Task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "description", "dueAt"],
                properties: {
                  patient: { type: "string" },
                  description: { type: "string", example: "Check capillary blood glucose before 22:00 feed" },
                  priority: { type: "string", enum: ["Routine", "Urgent", "Critical"], example: "Urgent" },
                  dueAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Task created" } },
      },
    },
    "/api/tasks/{id}/status": {
      patch: {
        tags: ["Clinical Tasks"],
        summary: "Update Task Status (Complete / Progress / Cancel)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["Pending", "In Progress", "Completed", "Cancelled"], example: "Completed" },
                  completionNotes: { type: "string", example: "Glucose checked: 5.4 mmol/L (Normal)" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Task status updated" } },
      },
    },

    // ==================== SHIFT HANDOVER ====================
    "/api/handovers/preview/{patientId}": {
      get: {
        tags: ["Shift Handover"],
        summary: "Get Auto-Compiled Handover Summary Preview",
        description: "Automatically compiles status, active problems, management, latest vitals, pending tests, overdue tasks, and recommends handover severity.",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Auto-compiled summary" } },
      },
    },
    "/api/handovers": {
      post: {
        tags: ["Shift Handover"],
        summary: "Submit Shift Handover Record",
        description: "Saves a point-in-time clinical snapshot and logs from-doctor and to-doctor handover metadata.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["patient", "shiftType", "status"],
                properties: {
                  patient: { type: "string" },
                  shiftType: { type: "string", enum: ["Morning to Evening", "Evening to Night", "Night to Morning"], example: "Morning to Evening" },
                  status: {
                    type: "string",
                    enum: ["Handed Over", "Needs Direct Discussion", "Critical — Verbal Handover Required"],
                    example: "Critical — Verbal Handover Required",
                  },
                  customNotes: { type: "string", example: "Close watch on SpO2; alert PICU if desaturating." },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Handover recorded" } },
      },
    },
    "/api/handovers/ward-sheet": {
      get: {
        tags: ["Shift Handover"],
        summary: "Get Department Ward Handover Sheet",
        description: "Compiles handover summaries for all active admitted patients in the ward.",
        responses: { 200: { description: "Ward handover summaries" } },
      },
    },

    // ==================== ALERTS ====================
    "/api/alerts": {
      get: {
        tags: ["Alerts"],
        summary: "Get Clinical Alerts Feed",
        parameters: [
          { name: "unreadOnly", in: "query", schema: { type: "boolean" }, example: true },
        ],
        responses: { 200: { description: "Alerts feed" } },
      },
    },
    "/api/alerts/{id}/read": {
      patch: {
        tags: ["Alerts"],
        summary: "Mark Alert as Read / Dismiss",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Alert marked as read" } },
      },
    },

    // ==================== AUDIT TRAIL ====================
    "/api/audit": {
      get: {
        tags: ["Audit Trail (Admin Only)"],
        summary: "View System Audit Trail",
        description: "Admin inspects immutable audit logs with previous and new values.",
        parameters: [
          { name: "entity", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Audit logs" } },
      },
    },
  },
};

module.exports = swaggerDocument;
