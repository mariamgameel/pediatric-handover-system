// Pediatric Handover & Clinical Follow-up System Client Engine

const app = {
  token: localStorage.getItem("ped_token") || null,
  currentUser: null,
  activePatientId: null,
  currentPatientData: null,
  allPatientsCache: [],

  // Initialization
  async init() {
    if (this.token) {
      await this.fetchCurrentUser();
    } else {
      this.showLogin();
    }
  },

  // Central API Fetch Wrapper
  async api(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json();

      if (!res.ok) {
        // Handle shift lockout
        if (data.code === "SHIFT_ACCESS_BLOCKED") {
          this.showLockout(data.message);
          throw new Error(data.message);
        }
        // Handle session expiration
        if (res.status === 401 && !endpoint.includes("/login")) {
          this.logout();
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(data.message || "An error occurred");
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Authentication & Sessions
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errBox = document.getElementById("loginError");
    errBox.style.display = "none";

    try {
      const res = await this.api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      this.token = res.token;
      localStorage.setItem("ped_token", this.token);
      this.currentUser = res.data.user;
      this.setupAuthenticatedState();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = "block";
    }
  },

  async fetchCurrentUser() {
    try {
      const res = await this.api("/api/auth/me");
      this.currentUser = res.data.user;
      this.setupAuthenticatedState();
    } catch (err) {
      console.warn("Auth check failed:", err.message);
    }
  },

  quickFillLogin(email, password) {
    document.getElementById("loginEmail").value = email;
    document.getElementById("loginPassword").value = password;
    const card = document.getElementById("staff-portal");
    if (card) {
      card.scrollIntoView({ behavior: "smooth" });
    }
  },

  setupAuthenticatedState() {
    document.getElementById("loginView").style.display = "none";
    document.getElementById("lockoutView").style.display = "none";
    document.getElementById("mainContainer").style.display = "block";
    document.getElementById("appHeader").style.display = "block";

    // Header info
    document.getElementById("headerUserName").textContent = this.currentUser.name;
    document.getElementById("headerUserMeta").textContent = `ID: ${this.currentUser.userId} | Role: ${this.currentUser.role}`;

    // Shift pill
    const shiftContainer = document.getElementById("shiftIndicatorContainer");
    if (this.currentUser.role === "Admin" || this.currentUser.shiftExempt) {
      shiftContainer.innerHTML = `<span class="shift-pill shift-exempt">Shift Exempt (24/7)</span>`;
    } else {
      shiftContainer.innerHTML = `<span class="shift-pill shift-active">Active Shift</span>`;
    }

    // Admin nav tab
    if (this.currentUser.role === "Admin") {
      document.getElementById("adminNavBtn").style.display = "inline-block";
    } else {
      document.getElementById("adminNavBtn").style.display = "none";
    }

    // Role-dependent UI controls (Specialist/Consultant/Admin for management plan)
    const addPlanBtn = document.getElementById("addPlanBtn");
    if (addPlanBtn) {
      if (["Specialist", "Consultant", "Admin"].includes(this.currentUser.role)) {
        addPlanBtn.style.display = "inline-block";
      } else {
        addPlanBtn.style.display = "none";
      }
    }

    this.pollAlerts();
    this.navigate("dashboard");
  },

  logout() {
    this.token = null;
    this.currentUser = null;
    this.activePatientId = null;
    localStorage.removeItem("ped_token");
    document.getElementById("appHeader").style.display = "none";
    this.showLogin();
  },

  showLogin() {
    this.hideAllViews();
    document.getElementById("mainContainer").style.display = "none";
    document.getElementById("loginView").style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  showLockout(message) {
    this.hideAllViews();
    document.getElementById("mainContainer").style.display = "block";
    document.getElementById("lockoutView").style.display = "block";
    if (this.currentUser) {
      document.getElementById("lockoutUserName").textContent = this.currentUser.name;
      document.getElementById("lockoutUserId").textContent = this.currentUser.userId;
    }
  },

  hideAllViews() {
    const views = ["loginView", "lockoutView", "dashboardView", "patientsView", "profileView", "handoverView", "adminView"];
    views.forEach((v) => {
      const el = document.getElementById(v);
      if (el) el.style.display = "none";
    });
  },

  navigate(viewName) {
    this.hideAllViews();
    document.getElementById("mainContainer").style.display = "block";
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    const target = document.getElementById(`${viewName}View`);
    if (target) target.style.display = "block";

    if (viewName === "dashboard") this.loadDashboard();
    if (viewName === "patients") this.loadPatients();
    if (viewName === "handover") this.loadWardHandoverSheet();
    if (viewName === "admin") this.loadAdminUsers();
  },

  // Modal Control
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
  },

  toggleCriticalReasonField(statusSelectId, groupContainerId) {
    const statusVal = document.getElementById(statusSelectId).value;
    const groupEl = document.getElementById(groupContainerId);
    groupEl.style.display = statusVal === "Critical" ? "block" : "none";
  },

  // ==================== DASHBOARD ====================
  async loadDashboard() {
    try {
      const res = await this.api("/api/dashboard");
      const {
        patientCounts,
        criticalPatients,
        importantPendingResults,
        myPendingTasks,
        overdueTasks,
      } = res.data;

      // Counters
      document.getElementById("countCritical").textContent = patientCounts.critical;
      document.getElementById("countCloseMonitoring").textContent = patientCounts.closeMonitoring;
      document.getElementById("countStable").textContent = patientCounts.stable;
      document.getElementById("countTotalActive").textContent = patientCounts.totalActive;

      // Badges
      document.getElementById("criticalShelfBadge").textContent = `${criticalPatients.length} Critical`;
      document.getElementById("pendingResultsBadge").textContent = `${importantPendingResults.length} Pending`;
      document.getElementById("myTasksBadge").textContent = `${myPendingTasks.length} Active`;
      document.getElementById("overdueTasksBadge").textContent = `${overdueTasks.length} Overdue`;

      // Render Critical Shelf
      const critContainer = document.getElementById("criticalPatientsList");
      if (criticalPatients.length === 0) {
        critContainer.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No critical patients at this time.</p>`;
      } else {
        critContainer.innerHTML = criticalPatients.map((p) => `
          <div style="background: var(--critical-bg); border: 1px solid var(--critical-border); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="app.openPatientProfile('${p._id}')">
            <div>
              <div style="font-weight: 700; color: #0f172a;">${p.name} (${p.bedNumber})</div>
              <div style="font-size: 0.75rem; color: var(--critical); font-weight: 600;">Reason: ${p.statusReason || "Critical"}</div>
            </div>
            <button class="btn btn-outline btn-sm">Open Workspace</button>
          </div>
        `).join("");
      }

      // Render Pending Results
      const resContainer = document.getElementById("pendingResultsList");
      if (importantPendingResults.length === 0) {
        resContainer.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No unreviewed results.</p>`;
      } else {
        resContainer.innerHTML = importantPendingResults.map((inv) => `
          <div style="padding: 0.5rem 0.65rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600;">${inv.name} - ${inv.patient ? `${inv.patient.name} (${inv.patient.bedNumber})` : "Patient"}</div>
              <div style="font-size: 0.75rem; color: ${inv.isAbnormal ? "var(--critical)" : "var(--text-muted)"}; font-weight: ${inv.isAbnormal ? "700" : "400"};">
                ${inv.result || "Result entered"} ${inv.isAbnormal ? "[ABNORMAL]" : ""}
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="app.openPatientProfile('${inv.patient ? inv.patient._id : ""}')">Review</button>
          </div>
        `).join("");
      }

      // Render My Tasks
      const myTaskContainer = document.getElementById("myTasksList");
      if (myPendingTasks.length === 0) {
        myTaskContainer.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No pending tasks assigned to you.</p>`;
      } else {
        myTaskContainer.innerHTML = myPendingTasks.map((t) => `
          <div style="padding: 0.5rem 0.65rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; font-size: 0.82rem;">${t.description}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">
                ${t.patient ? `${t.patient.name} (${t.patient.bedNumber})` : ""} | Due: ${new Date(t.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="app.handleCompleteTask('${t._id}', '${t.patient ? t.patient._id : ""}')">Done</button>
          </div>
        `).join("");
      }

      // Render Overdue Tasks
      const overdueContainer = document.getElementById("overdueTasksList");
      if (overdueTasks.length === 0) {
        overdueContainer.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No overdue tasks in the ward.</p>`;
      } else {
        overdueContainer.innerHTML = overdueTasks.map((t) => `
          <div style="background: #fffafa; border: 1px solid var(--critical-border); padding: 0.5rem 0.65rem; border-radius: var(--radius-sm); margin-bottom: 0.45rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; color: var(--critical); font-size: 0.82rem;">${t.description}</div>
              <div style="font-size: 0.72rem; color: var(--text-dim);">
                ${t.patient ? `${t.patient.name} (${t.patient.bedNumber})` : ""} | Overdue since ${new Date(t.dueAt).toLocaleTimeString()}
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="app.handleCompleteTask('${t._id}', '${t.patient ? t.patient._id : ""}')">Resolve</button>
          </div>
        `).join("");
      }

    } catch (err) {
      console.error("Dashboard load failed:", err.message);
    }
  },

  handleDashboardSearch(e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;
    if (e.key === "Enter" || q.length >= 3) {
      document.getElementById("patientFilterSearch").value = q;
      this.navigate("patients");
    }
  },

  // ==================== PATIENTS DIRECTORY ====================
  async loadPatients() {
    const search = document.getElementById("patientFilterSearch").value.trim();
    const status = document.getElementById("patientFilterStatus").value;
    const discharged = document.getElementById("patientFilterDischarge").value;

    let url = `/api/patients?discharged=${discharged}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${status}`;

    try {
      const res = await this.api(url);
      this.allPatientsCache = res.data.patients;
      this.renderPatientsGrid(this.allPatientsCache);
    } catch (err) {
      console.error("Failed to load patients:", err.message);
    }
  },

  renderPatientsGrid(patients) {
    const grid = document.getElementById("patientsGrid");
    if (!patients || patients.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-dim);">No patients matching your criteria.</div>`;
      return;
    }

    grid.innerHTML = patients.map((p) => {
      const borderClass = p.status === "Critical" 
        ? "border-critical" 
        : p.status === "Close Monitoring" 
        ? "border-close-monitoring" 
        : "border-stable";

      const ageText = p.age.years > 0 
        ? `${p.age.years}y ${p.age.months}m` 
        : `${p.age.months}m ${p.age.days}d`;

      const doctorName = p.lastUpdatedBy 
        ? `${p.lastUpdatedBy.name} (${p.lastUpdatedBy.userId})` 
        : (p.responsibleDoctor ? `${p.responsibleDoctor.name} (${p.responsibleDoctor.userId})` : "Unassigned");

      return `
        <div class="patient-card ${borderClass}" onclick="app.openPatientProfile('${p._id}')">
          <div class="card-header-flex">
            <div>
              <span class="card-bed">${p.bedNumber}</span>
              <div class="card-name">${p.name}</div>
            </div>
            <span class="badge-status status-${p.status.replace(/\s+/g, '-')}">${p.status}</span>
          </div>
          <div class="card-meta">
            Age: ${ageText} | Wt: ${p.weight} kg | File: ${p.fileNumber}
          </div>
          <div class="card-diagnosis">
            ${p.mainDiagnosis}
          </div>
          ${p.status === "Critical" && p.statusReason ? `
            <div style="font-size: 0.72rem; color: var(--critical); font-weight: 700; margin-bottom: 0.5rem;">
              Critical: ${p.statusReason}
            </div>
          ` : ""}
          <div class="card-footer">
            <span>Doctor: ${doctorName}</span>
            <span>Touch: ${new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  async handleCreatePatient(e) {
    e.preventDefault();
    const payload = {
      patientId: document.getElementById("newPatientId").value.trim(),
      fileNumber: document.getElementById("newFileNumber").value.trim(),
      name: document.getElementById("newPatientName").value.trim(),
      weight: parseFloat(document.getElementById("newPatientWeight").value),
      bedNumber: document.getElementById("newBedNumber").value.trim(),
      mainDiagnosis: document.getElementById("newMainDiagnosis").value.trim(),
      age: {
        years: parseInt(document.getElementById("newAgeYears").value, 10) || 0,
        months: parseInt(document.getElementById("newAgeMonths").value, 10) || 0,
        days: parseInt(document.getElementById("newAgeDays").value, 10) || 0,
      },
      status: document.getElementById("newStatus").value,
      statusReason: document.getElementById("newStatus").value === "Critical" ? document.getElementById("newCriticalReason").value : undefined,
      allergies: document.getElementById("newAllergies").value.split(",").map((s) => s.trim()).filter(Boolean),
    };

    try {
      await this.api("/api/patients", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addPatientModal");
      e.target.reset();
      this.loadPatients();
      this.loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  },

  // ==================== PATIENT PROFILE WORKSPACE ====================
  async openPatientProfile(patientId) {
    this.activePatientId = patientId;
    this.hideAllViews();
    document.getElementById("profileView").style.display = "block";

    try {
      const [profileRes, whatChangedRes] = await Promise.all([
        this.api(`/api/patients/${patientId}`),
        this.api(`/api/patients/${patientId}/what-changed`),
      ]);

      const { patient, latestVitals, activeProblems, currentPlan } = profileRes.data;
      this.currentPatientData = profileRes.data;

      // Render Identity Banner
      document.getElementById("profileBed").textContent = patient.bedNumber;
      document.getElementById("profileName").textContent = patient.name;
      const statusBadge = document.getElementById("profileStatusBadge");
      statusBadge.textContent = patient.status;
      statusBadge.className = `badge-status status-${patient.status.replace(/\s+/g, '-')}`;

      const ageText = patient.age.years > 0 
        ? `${patient.age.years}y ${patient.age.months}m` 
        : `${patient.age.months}m ${patient.age.days}d`;
      document.getElementById("profileMeta").textContent = `Age: ${ageText} | Weight: ${patient.weight} kg | File: ${patient.fileNumber} | ID: ${patient.patientId}`;
      document.getElementById("profileDiagnosis").textContent = patient.mainDiagnosis;
      document.getElementById("profileAllergies").textContent = patient.allergies.join(", ") || "NKDA";

      const critRow = document.getElementById("profileCriticalReasonRow");
      if (patient.status === "Critical" && patient.statusReason) {
        critRow.style.display = "block";
        document.getElementById("profileCriticalReason").textContent = patient.statusReason;
      } else {
        critRow.style.display = "none";
      }

      // Render Latest Vitals Ribbon
      if (latestVitals) {
        document.getElementById("statTemp").textContent = latestVitals.temperature ? `${latestVitals.temperature}°C` : "--";
        document.getElementById("statHR").textContent = latestVitals.heartRate ? `${latestVitals.heartRate} bpm` : "--";
        document.getElementById("statRR").textContent = latestVitals.respiratoryRate ? `${latestVitals.respiratoryRate} bpm` : "--";
        document.getElementById("statBP").textContent = latestVitals.bloodPressure && latestVitals.bloodPressure.systolic ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}` : "--";
        document.getElementById("statSpO2").textContent = latestVitals.spO2 ? `${latestVitals.spO2}%` : "--";
        document.getElementById("statGCS").textContent = latestVitals.gcs || "--";
        document.getElementById("statO2").textContent = latestVitals.oxygenSupport?.mode || "Room Air";
        document.getElementById("statIV").textContent = latestVitals.ivFluids || "None";
      } else {
        ["statTemp", "statHR", "statRR", "statBP", "statSpO2", "statGCS", "statO2", "statIV"].forEach((id) => {
          document.getElementById(id).textContent = "--";
        });
      }

      // Render "What Changed?" Banner
      this.renderWhatChangedBanner(whatChangedRes.data);

      // Load active tab data (default overview)
      this.switchProfileTab("overview");

    } catch (err) {
      console.error("Failed to load patient profile:", err.message);
    }
  },

  renderWhatChangedBanner(deltaData) {
    const container = document.getElementById("whatChangedContainer");
    if (!deltaData || deltaData.isFirstVisit || deltaData.changeCount === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    container.className = `delta-banner ${deltaData.hasCriticalChange ? "has-critical" : ""}`;

    const itemsHtml = deltaData.changes.slice(0, 4).map((c) => `
      <div style="font-size: 0.78rem; margin-top: 0.2rem;">
        • <strong>${c.title}</strong>: ${c.details ? c.details.substring(0, 90) : ""} (${new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
      </div>
    `).join("");

    container.innerHTML = `
      <div style="flex: 1;">
        <div class="delta-title">
          ${deltaData.hasCriticalChange ? "CRITICAL CLINICAL UPDATES" : "Clinical Updates"} Since Your Last Visit (${new Date(deltaData.lastViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
        </div>
        ${itemsHtml}
      </div>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('whatChangedContainer').style.display='none'">Dismiss</button>
    `;
  },

  switchProfileTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabName);
    });

    const panes = ["tabOverview", "tabProblems", "tabInvestigations", "tabManagement", "tabTasks", "tabTimeline"];
    panes.forEach((p) => {
      const el = document.getElementById(p);
      if (el) el.style.display = "none";
    });

    const activeEl = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeEl) activeEl.style.display = "block";

    if (tabName === "overview") this.loadPatientVitals();
    if (tabName === "problems") this.loadPatientProblems();
    if (tabName === "investigations") this.loadPatientInvestigations();
    if (tabName === "management") this.loadPatientManagementPlans();
    if (tabName === "tasks") this.loadPatientTasks();
    if (tabName === "timeline") this.loadPatientTimeline();
  },

  // Tab 1: Vitals
  async loadPatientVitals() {
    try {
      const res = await this.api(`/api/vitals/patient/${this.activePatientId}`);
      const tbody = document.getElementById("vitalsTableBody");
      const vitals = res.data.vitals;

      if (!vitals || vitals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-dim);">No vitals recorded yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = vitals.map((v) => {
        const bpStr = v.bloodPressure?.systolic ? `${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}` : "--";
        const doc = v.recordedBy ? `${v.recordedBy.name} (${v.recordedBy.userId})` : "Clinician";
        return `
          <tr>
            <td>${new Date(v.recordedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
            <td style="font-weight: 700;">${v.temperature ? `${v.temperature}°C` : "--"}</td>
            <td>${v.heartRate || "--"}</td>
            <td>${v.respiratoryRate || "--"}</td>
            <td>${bpStr}</td>
            <td style="font-weight: 700; color: ${v.spO2 < 92 ? "var(--critical)" : "inherit"};">${v.spO2 ? `${v.spO2}%` : "--"}</td>
            <td>${v.gcs || "--"}</td>
            <td>${v.oxygenSupport?.mode || "Room Air"}</td>
            <td>${v.ivFluids || "None"}</td>
            <td>${doc}</td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreateVitals(e) {
    e.preventDefault();
    const payload = {
      patient: this.activePatientId,
      temperature: parseFloat(document.getElementById("vTemp").value) || undefined,
      heartRate: parseInt(document.getElementById("vHR").value, 10) || undefined,
      respiratoryRate: parseInt(document.getElementById("vRR").value, 10) || undefined,
      bloodPressure: {
        systolic: parseInt(document.getElementById("vBPSys").value, 10) || undefined,
        diastolic: parseInt(document.getElementById("vBPDia").value, 10) || undefined,
      },
      spO2: parseInt(document.getElementById("vSpO2").value, 10) || undefined,
      gcs: parseInt(document.getElementById("vGCS").value, 10) || undefined,
      oxygenSupport: {
        mode: document.getElementById("vO2Mode").value,
      },
      ivFluids: document.getElementById("vIVFluids").value.trim(),
    };

    try {
      await this.api("/api/vitals", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addVitalsModal");
      e.target.reset();
      this.openPatientProfile(this.activePatientId);
    } catch (err) {
      alert(err.message);
    }
  },

  // Tab 2: Problems
  async loadPatientProblems() {
    try {
      const res = await this.api(`/api/problems/patient/${this.activePatientId}`);
      const container = document.getElementById("problemsList");
      const problems = res.data.problems;

      if (!problems || problems.length === 0) {
        container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No active or resolved problems listed.</p>`;
        return;
      }

      container.innerHTML = problems.map((p) => {
        const isResolved = p.status === "Resolved";
        return `
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 0.65rem; border-left: 4px solid ${isResolved ? "var(--success)" : "var(--warning)"};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span class="badge-status ${isResolved ? "status-Discharged" : "status-Close-Monitoring"}">${p.status}</span>
                <strong style="font-size: 0.95rem; margin-left: 0.5rem; color: #0f172a;">${p.title}</strong>
              </div>
              ${!isResolved ? `<button class="btn btn-outline btn-sm" onclick="app.promptResolveProblem('${p._id}')">Resolve Problem</button>` : ""}
            </div>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.35rem;">${p.description || "No additional description."}</p>
            ${isResolved && p.resolutionInfo ? `
              <div style="font-size: 0.75rem; color: var(--success); font-weight: 600; margin-top: 0.35rem; background: var(--success-bg); padding: 0.35rem 0.5rem; border-radius: var(--radius-sm);">
                Resolved by ${p.resolutionInfo.resolvedBy?.name || "Doctor"} on ${new Date(p.resolutionInfo.resolvedAt).toLocaleDateString()}: "${p.resolutionInfo.resolutionNote}"
              </div>
            ` : ""}
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.35rem;">
              Started: ${new Date(p.startDate || p.createdAt).toLocaleDateString()} by ${p.createdBy?.name || "Clinician"} (${p.createdBy?.userId || ""})
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreateProblem(e) {
    e.preventDefault();
    const payload = {
      patient: this.activePatientId,
      title: document.getElementById("probTitle").value.trim(),
      description: document.getElementById("probDescription").value.trim(),
    };

    try {
      await this.api("/api/problems", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addProblemModal");
      e.target.reset();
      this.loadPatientProblems();
    } catch (err) {
      alert(err.message);
    }
  },

  async promptResolveProblem(problemId) {
    const note = prompt("Enter clinical resolution notes (e.g. Tachycardia resolved following fluid bolus):");
    if (!note) return;

    try {
      await this.api(`/api/problems/${problemId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolutionNote: note }),
      });
      this.loadPatientProblems();
    } catch (err) {
      alert(err.message);
    }
  },

  // Tab 3: Investigations
  async loadPatientInvestigations() {
    try {
      const res = await this.api(`/api/investigations/patient/${this.activePatientId}`);
      const tbody = document.getElementById("investigationsTableBody");
      const list = res.data.investigations;

      if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No investigations on record.</td></tr>`;
        return;
      }

      tbody.innerHTML = list.map((inv) => {
        let actionBtn = "";
        if (inv.status === "Requested" || inv.status === "Pending") {
          actionBtn = `<button class="btn btn-outline btn-sm" onclick="app.showEnterResultModal('${inv._id}')">Enter Result</button>`;
        } else if (inv.status === "Result Available") {
          if (["Specialist", "Consultant", "Admin"].includes(this.currentUser.role)) {
            actionBtn = `<button class="btn btn-primary btn-sm" onclick="app.promptReviewResult('${inv._id}')">Formally Review</button>`;
          } else {
            actionBtn = `<span style="font-size: 0.72rem; color: var(--text-dim);">Awaiting Senior Review</span>`;
          }
        } else {
          actionBtn = `<span style="font-size: 0.75rem; color: var(--success); font-weight: 700;">Verified</span>`;
        }

        const isUnreviewed = inv.status === "Result Available";

        return `
          <tr style="${isUnreviewed ? "background: #fffbeb;" : ""}">
            <td style="font-weight: 700;">${inv.name}</td>
            <td>${inv.type}</td>
            <td>${new Date(inv.requestedAt || inv.createdAt).toLocaleDateString()}</td>
            <td>
              <span class="badge-status ${inv.status === "Reviewed" ? "status-Discharged" : inv.status === "Result Available" ? "status-Critical" : "status-Stable"}">
                ${inv.status}
              </span>
            </td>
            <td>
              ${inv.result ? `
                <div style="font-weight: 600; color: ${inv.isAbnormal ? "var(--critical)" : "inherit"};">
                  ${inv.result} ${inv.isAbnormal ? "[ABNORMAL]" : ""}
                </div>
              ` : `<span style="color: var(--text-dim);">Pending test</span>`}
            </td>
            <td>${inv.reviewedBy ? `${inv.reviewedBy.name} (${inv.reviewedBy.userId})` : "--"}</td>
            <td>${actionBtn}</td>
          </tr>
        `;
      }).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleRequestInvestigation(e) {
    e.preventDefault();
    const payload = {
      patient: this.activePatientId,
      name: document.getElementById("invName").value.trim(),
      type: document.getElementById("invType").value,
      notes: document.getElementById("invNotes").value.trim(),
    };

    try {
      await this.api("/api/investigations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("requestInvestigationModal");
      e.target.reset();
      this.loadPatientInvestigations();
    } catch (err) {
      alert(err.message);
    }
  },

  showEnterResultModal(invId) {
    document.getElementById("resultInvestigationId").value = invId;
    this.showModal("enterResultModal");
  },

  async handleRecordResult(e) {
    e.preventDefault();
    const invId = document.getElementById("resultInvestigationId").value;
    const payload = {
      result: document.getElementById("resText").value.trim(),
      isAbnormal: document.getElementById("resIsAbnormal").checked,
    };

    try {
      await this.api(`/api/investigations/${invId}/result`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      this.closeModal("enterResultModal");
      e.target.reset();
      this.loadPatientInvestigations();
      this.pollAlerts();
    } catch (err) {
      alert(err.message);
    }
  },

  async promptReviewResult(invId) {
    const notes = prompt("Enter formal review note (or leave blank to confirm verification):");
    if (notes === null) return;

    try {
      await this.api(`/api/investigations/${invId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      this.loadPatientInvestigations();
    } catch (err) {
      alert(err.message);
    }
  },

  // Tab 4: Management Plans
  async loadPatientManagementPlans() {
    try {
      const res = await this.api(`/api/management-plans/patient/${this.activePatientId}`);
      const container = document.getElementById("managementPlansStack");
      const { currentPlan, history } = res.data;

      if (!history || history.length === 0) {
        container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No formal management plan created yet.</p>`;
        return;
      }

      container.innerHTML = history.map((plan) => {
        const isCurrent = !plan.isSuperseded;
        return `
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 0.75rem; border-left: 4px solid ${isCurrent ? "var(--primary)" : "#cbd5e1"};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <div>
                <strong style="font-size: 1rem;">Version ${plan.version}</strong>
                <span class="badge-status ${isCurrent ? "status-Stable" : "status-Discharged"}" style="margin-left: 0.5rem;">
                  ${isCurrent ? "Active Plan" : "Superseded"}
                </span>
                <span style="font-size: 0.78rem; color: var(--text-dim); margin-left: 0.5rem;">
                  Authored by ${plan.authorRole} Dr. ${plan.createdBy?.name || "Clinician"} (${plan.createdBy?.userId || ""})
                </span>
              </div>
              <span style="font-size: 0.72rem; color: var(--text-dim);">
                ${new Date(plan.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <div style="font-size: 0.88rem; color: #1e293b; font-weight: 600; margin-bottom: 0.5rem;">
              ${plan.plan}
            </div>
            ${plan.recommendations ? `
              <div style="background: var(--surface-subtle); padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 0.5rem;">
                <strong>Recommendations:</strong> ${plan.recommendations}
              </div>
            ` : ""}
            ${plan.clinicalReasoning ? `
              <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 0.35rem;">
                <em>Clinical Reasoning: ${plan.clinicalReasoning}</em>
              </div>
            ` : ""}
            ${plan.supportiveCare ? `
              <div style="font-size: 0.78rem; color: var(--text-dim);">
                Supportive Care: ${plan.supportiveCare}
              </div>
            ` : ""}
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreatePlan(e) {
    e.preventDefault();
    const payload = {
      patient: this.activePatientId,
      plan: document.getElementById("planText").value.trim(),
      recommendations: document.getElementById("planRecommendations").value.trim(),
      clinicalReasoning: document.getElementById("planReasoning").value.trim(),
      supportiveCare: document.getElementById("planSupportive").value.trim(),
    };

    try {
      await this.api("/api/management-plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addPlanModal");
      e.target.reset();
      this.loadPatientManagementPlans();
    } catch (err) {
      alert(err.message);
    }
  },

  // Tab 5: Tasks
  async loadPatientTasks() {
    try {
      const res = await this.api(`/api/tasks/patient/${this.activePatientId}`);
      const container = document.getElementById("patientTasksList");
      const tasks = res.data.tasks;

      if (!tasks || tasks.length === 0) {
        container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No clinical tasks for this patient.</p>`;
        return;
      }

      container.innerHTML = tasks.map((t) => {
        const isDone = t.status === "Completed";
        const isOverdue = t.status === "Overdue";
        return `
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.75rem 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${isOverdue ? "var(--critical)" : isDone ? "var(--success)" : "var(--primary)"};">
            <div>
              <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a; text-decoration: ${isDone ? "line-through" : "none"};">
                ${t.description}
              </div>
              <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.2rem;">
                Assigned: ${t.assignedTo?.name || "Doctor"} (${t.assignedTo?.userId || ""}) | Due: ${new Date(t.dueAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                ${t.completedAt ? ` | Completed: ${new Date(t.completedAt).toLocaleTimeString()}` : ""}
              </div>
            </div>
            <div>
              ${!isDone ? `
                <button class="btn btn-primary btn-sm" onclick="app.handleCompleteTask('${t._id}', '${t.patient}')">Mark Done</button>
              ` : `
                <span class="badge-status status-Discharged">Completed</span>
              `}
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreateTask(e) {
    e.preventDefault();
    const payload = {
      patient: this.activePatientId,
      description: document.getElementById("taskDesc").value.trim(),
      priority: document.getElementById("taskPriority").value,
      dueAt: document.getElementById("taskDueAt").value,
    };

    try {
      await this.api("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addTaskModal");
      e.target.reset();
      this.loadPatientTasks();
    } catch (err) {
      alert(err.message);
    }
  },

  async handleCompleteTask(taskId, patientId) {
    try {
      await this.api(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Completed" }),
      });

      if (this.activePatientId) this.loadPatientTasks();
      this.loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  },

  // Tab 6: Timeline
  async loadPatientTimeline() {
    try {
      const res = await this.api(`/api/patients/${this.activePatientId}/timeline`);
      const container = document.getElementById("patientTimelineStream");
      const events = res.data.timeline;

      if (!events || events.length === 0) {
        container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No timeline events recorded.</p>`;
        return;
      }

      container.innerHTML = events.map((ev) => `
        <div class="timeline-item severity-${ev.severity || "Routine"}">
          <div class="timeline-meta">
            <span><strong>${ev.category}</strong> • ${ev.actor}</span>
            <span>${new Date(ev.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div class="timeline-title">${ev.title}</div>
          <div class="timeline-details">${ev.details}</div>
        </div>
      `).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreateClinicalUpdate(e) {
    e.preventDefault();
    const payload = {
      patient: this.activePatientId,
      type: document.getElementById("updateType").value,
      details: document.getElementById("updateDetails").value.trim(),
    };

    try {
      await this.api("/api/clinical-updates", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addUpdateModal");
      e.target.reset();
      this.loadPatientTimeline();
    } catch (err) {
      alert(err.message);
    }
  },

  // Patient Status & Deterioration Controls
  showUpdateStatusModal() {
    this.showModal("updateStatusModal");
  },

  async handleUpdatePatientStatus(e) {
    e.preventDefault();
    const status = document.getElementById("editStatusSelect").value;
    const reason = status === "Critical" ? document.getElementById("editCriticalReasonSelect").value : undefined;

    try {
      await this.api(`/api/patients/${this.activePatientId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, statusReason: reason }),
      });

      this.closeModal("updateStatusModal");
      this.openPatientProfile(this.activePatientId);
    } catch (err) {
      alert(err.message);
    }
  },

  async handleDischargePatient(e) {
    e.preventDefault();
    const payload = {
      outcome: document.getElementById("dischargeOutcome").value,
      summaryNotes: document.getElementById("dischargeNotes").value.trim(),
    };

    try {
      await this.api(`/api/patients/${this.activePatientId}/discharge`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("dischargeModal");
      e.target.reset();
      this.navigate("patients");
    } catch (err) {
      alert(err.message);
    }
  },

  // Quick Deterioration Flow
  async showQuickDeteriorationModal() {
    await this.populateDeteriorationPatients();
    this.showModal("deteriorationModal");
  },

  async showPatientDeteriorationModal() {
    await this.populateDeteriorationPatients(this.activePatientId);
    this.showModal("deteriorationModal");
  },

  async populateDeteriorationPatients(selectedId = null) {
    const sel = document.getElementById("deteriorationPatientSelect");
    if (!this.allPatientsCache || this.allPatientsCache.length === 0) {
      const res = await this.api("/api/patients?discharged=false");
      this.allPatientsCache = res.data.patients;
    }

    sel.innerHTML = this.allPatientsCache.map((p) => `
      <option value="${p._id}" ${selectedId === p._id ? "selected" : ""}>
        ${p.bedNumber} - ${p.name} (${p.status})
      </option>
    `).join("");
  },

  async handleRecordDeterioration(e) {
    e.preventDefault();
    const payload = {
      patient: document.getElementById("deteriorationPatientSelect").value,
      triggerReason: document.getElementById("detTrigger").value.trim(),
      escalationLevel: document.getElementById("detEscalation").value,
      immediateActionTaken: document.getElementById("detAction").value.trim(),
      setPatientCritical: true,
      criticalReason: document.getElementById("detCriticalReason").value,
    };

    try {
      await this.api("/api/clinical-updates/deterioration", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("deteriorationModal");
      e.target.reset();
      alert("EMERGENCY RECORDED: Clinical deterioration logged and ward team notified.");
      this.loadDashboard();
      if (this.activePatientId) this.openPatientProfile(this.activePatientId);
    } catch (err) {
      alert(err.message);
    }
  },

  // ==================== SHIFT HANDOVER ====================
  async loadWardHandoverSheet() {
    try {
      const res = await this.api("/api/handovers/ward-sheet");
      const container = document.getElementById("wardHandoverCards");
      const handovers = res.data.wardHandovers;

      if (!handovers || handovers.length === 0) {
        container.innerHTML = `<p style="color: var(--text-dim); text-align: center; padding: 2rem;">No active admitted patients in the ward.</p>`;
        return;
      }

      container.innerHTML = handovers.map((h) => {
        const p = h.patient;
        const snap = h.autoSummarySnapshot;
        const isVerbalRequired = h.recommendedStatus.includes("Verbal Handover Required");
        const statusBorder = isVerbalRequired 
          ? "border-left: 6px solid var(--critical);" 
          : "border-left: 6px solid var(--stable);";

        return `
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm); ${statusBorder}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem;">
              <div>
                <span class="card-bed">${p.bedNumber}</span>
                <strong style="font-size: 1.15rem; color: #0f172a; margin-left: 0.5rem;">${p.name}</strong>
                <span class="badge-status status-${p.status.replace(/\s+/g, '-')}" style="margin-left: 0.5rem;">${p.status}</span>
                <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 0.2rem;">
                  Diagnosis: <strong>${p.mainDiagnosis}</strong> | Allergies: <strong style="color: var(--critical);">${p.allergies.join(", ") || "NKDA"}</strong>
                </div>
              </div>

              <div style="text-align: right;">
                <span class="badge-status ${isVerbalRequired ? "status-Critical" : "status-Stable"}" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
                  ${h.recommendedStatus}
                </span>
                <div style="margin-top: 0.5rem;">
                  <button class="btn btn-primary btn-sm" onclick="app.submitShiftHandover('${p.id}', '${h.recommendedStatus}')">Sign Shift Handover</button>
                  <button class="btn btn-outline btn-sm" onclick="app.openPatientProfile('${p.id}')">Open Workspace</button>
                </div>
              </div>
            </div>

            ${snap.warnings && snap.warnings.length > 0 ? `
              <div class="handover-warning-box">
                <div class="handover-warning-title">Clinical Flags / Warnings</div>
                ${snap.warnings.map((w) => `<div style="font-size: 0.8rem; color: var(--critical); font-weight: 600;">• ${w}</div>`).join("")}
              </div>
            ` : ""}

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; font-size: 0.82rem; background: var(--surface-subtle); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
              <div>
                <strong>Active Problems:</strong>
                <div style="color: var(--text-muted); margin-top: 0.2rem;">
                  ${snap.activeProblemsSummary && snap.activeProblemsSummary.length > 0 ? snap.activeProblemsSummary.join(", ") : "None listed"}
                </div>
              </div>

              <div>
                <strong>Current Management / O2:</strong>
                <div style="color: var(--text-muted); margin-top: 0.2rem;">
                  ${snap.currentManagementSummary?.plan || "Supportive care"} (O2: ${snap.currentManagementSummary?.oxygenSupport || "Room Air"})
                </div>
              </div>

              <div>
                <strong>Pending Tests &amp; Unreviewed Results:</strong>
                <div style="color: var(--text-muted); margin-top: 0.2rem;">
                  ${snap.unreviewedResults && snap.unreviewedResults.length > 0 
                    ? `<span style="color: var(--critical); font-weight: 700;">Unreviewed: ${snap.unreviewedResults.join("; ")}</span>` 
                    : (snap.pendingInvestigations && snap.pendingInvestigations.length > 0 ? snap.pendingInvestigations.join(", ") : "None")}
                </div>
              </div>

              <div>
                <strong>Shift Tasks:</strong>
                <div style="color: var(--text-muted); margin-top: 0.2rem;">
                  ${snap.pendingTasks && snap.pendingTasks.length > 0 ? snap.pendingTasks.join("; ") : "No pending tasks"}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async submitShiftHandover(patientId, recommendedStatus) {
    const shiftType = prompt("Select Shift Transition (1 = Morning to Evening, 2 = Evening to Night, 3 = Night to Morning):", "1");
    if (!shiftType) return;

    const shiftMap = {
      "1": "Morning to Evening",
      "2": "Evening to Night",
      "3": "Night to Morning",
    };

    const notes = prompt("Enter additional handover notes / specific instructions:", "") || "";

    try {
      await this.api("/api/handovers", {
        method: "POST",
        body: JSON.stringify({
          patient: patientId,
          shiftType: shiftMap[shiftType] || "Morning to Evening",
          status: recommendedStatus,
          customNotes: notes,
        }),
      });

      alert("Shift handover record generated and logged to audit trail.");
      this.loadWardHandoverSheet();
    } catch (err) {
      alert(err.message);
    }
  },

  // ==================== ALERTS FEED ====================
  async pollAlerts() {
    try {
      const res = await this.api("/api/alerts?unreadOnly=true");
      const countBadge = document.getElementById("alertsCountBadge");
      const unreadCount = res.unreadCount || 0;

      if (unreadCount > 0) {
        countBadge.textContent = unreadCount;
        countBadge.style.display = "inline-block";
      } else {
        countBadge.style.display = "none";
      }

      const body = document.getElementById("alertsModalBody");
      const alerts = res.data.alerts;

      if (!alerts || alerts.length === 0) {
        body.innerHTML = `<p style="color: var(--text-dim);">No active clinical alerts.</p>`;
        return;
      }

      body.innerHTML = alerts.map((a) => `
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-left: 4px solid ${a.priority === "Critical" ? "var(--critical)" : "var(--warning)"}; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: ${a.priority === "Critical" ? "var(--critical)" : "#0f172a"};">
              ${a.message}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.2rem;">
              Type: ${a.type} | ${new Date(a.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="app.dismissAlert('${a._id}')">Dismiss</button>
        </div>
      `).join("");
    } catch (err) {
      // quiet poll
    }
  },

  async dismissAlert(alertId) {
    try {
      await this.api(`/api/alerts/${alertId}/read`, { method: "PATCH" });
      this.pollAlerts();
    } catch (err) {
      alert(err.message);
    }
  },

  // ==================== ADMIN CONSOLE ====================
  switchAdminTab(tabName) {
    document.querySelectorAll("[data-admintab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.admintab === tabName);
    });

    document.getElementById("adminTabUsers").style.display = tabName === "users" ? "block" : "none";
    document.getElementById("adminTabShifts").style.display = tabName === "shifts" ? "block" : "none";
    document.getElementById("adminTabAudit").style.display = tabName === "audit" ? "block" : "none";

    if (tabName === "users") this.loadAdminUsers();
    if (tabName === "shifts") this.loadAdminShifts();
    if (tabName === "audit") this.loadAdminAudit();
  },

  async loadAdminUsers() {
    try {
      const res = await this.api("/api/users");
      const tbody = document.getElementById("adminUsersTableBody");
      const users = res.data.users;

      tbody.innerHTML = users.map((u) => `
        <tr>
          <td style="font-weight: 800; color: var(--primary);">${u.userId}</td>
          <td style="font-weight: 700;">${u.name}</td>
          <td>${u.email}</td>
          <td><span class="badge-status status-Stable">${u.role}</span></td>
          <td>
            <span class="badge-status ${u.status === "Active" ? "status-Discharged" : "status-Critical"}">${u.status}</span>
          </td>
          <td>${u.shiftExempt ? `<strong style="color: var(--success);">Exempt (24/7)</strong>` : "Subject to Shift Roster"}</td>
          <td>${u.lastLogin ? new Date(u.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "Never"}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-outline btn-sm" onclick="app.adminChangeUserRole('${u._id}', '${u.role}')">Role</button>
              <button class="btn btn-outline btn-sm" onclick="app.adminToggleUserStatus('${u._id}', '${u.status}')">${u.status === "Active" ? "Deactivate" : "Activate"}</button>
              <button class="btn btn-outline btn-sm" onclick="app.adminGrantShiftOverride('${u._id}')">Override Shift</button>
            </div>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreateUser(e) {
    e.preventDefault();
    const payload = {
      userId: document.getElementById("adminNewStaffId").value.trim().toUpperCase(),
      name: document.getElementById("adminNewName").value.trim(),
      email: document.getElementById("adminNewEmail").value.trim(),
      password: document.getElementById("adminNewPassword").value,
      role: document.getElementById("adminNewRole").value,
    };

    try {
      await this.api("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("createUserModal");
      e.target.reset();
      this.loadAdminUsers();
      alert("Staff account created with unique Staff ID.");
    } catch (err) {
      alert(err.message);
    }
  },

  async adminChangeUserRole(userId, currentRole) {
    const newRole = prompt(`Change Role for this staff member (Resident, Specialist, Consultant, Admin):`, currentRole);
    if (!newRole || newRole === currentRole) return;

    try {
      await this.api(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      this.loadAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  },

  async adminToggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    if (!confirm(`Are you sure you want to mark this staff account as ${newStatus}?`)) return;

    try {
      await this.api(`/api/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      this.loadAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  },

  async adminGrantShiftOverride(userId) {
    const hours = prompt("Enter emergency shift override duration in hours (e.g. 2, 4, 8, 12):", "4");
    if (!hours) return;
    const reason = prompt("Enter clinical justification for shift emergency access override:", "Covering emergency bedside duty");
    if (!reason) return;

    try {
      await this.api(`/api/shifts/override/${userId}`, {
        method: "POST",
        body: JSON.stringify({ overrideHours: parseFloat(hours), reason }),
      });
      alert(`Emergency shift access granted for ${hours} hours.`);
      this.loadAdminUsers();
    } catch (err) {
      alert(err.message);
    }
  },

  async loadAdminShifts() {
    try {
      const [shiftsRes, usersRes] = await Promise.all([
        this.api("/api/shifts"),
        this.api("/api/users"),
      ]);

      const tbody = document.getElementById("adminShiftsTableBody");
      const shifts = shiftsRes.data.shifts;

      tbody.innerHTML = shifts.map((s) => `
        <tr>
          <td style="font-weight: 700;">${s.user?.name || "Clinician"} (${s.user?.userId || ""})</td>
          <td><span class="badge-status status-Stable">${s.shiftType}</span></td>
          <td>${new Date(s.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${new Date(s.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${s.gracePeriodMinutes || 45} mins buffer</td>
          <td><span class="badge-status status-Discharged">${s.status}</span></td>
          <td>${s.assignedBy?.name || "Admin"}</td>
        </tr>
      `).join("");

      // Populate select inside modal
      const userSel = document.getElementById("shiftUserSelect");
      userSel.innerHTML = usersRes.data.users.map((u) => `
        <option value="${u._id}">${u.name} (${u.userId} - ${u.role})</option>
      `).join("");
    } catch (err) {
      console.error(err.message);
    }
  },

  autoFillShiftTimes() {
    const dateVal = document.getElementById("shiftDateInput").value;
    const shiftType = document.getElementById("shiftTypeSelect").value;
    if (!dateVal) return;

    const startInput = document.getElementById("shiftStartInput");
    const endInput = document.getElementById("shiftEndInput");

    if (shiftType === "Morning") {
      startInput.value = `${dateVal}T07:30`;
      endInput.value = `${dateVal}T15:30`;
    } else if (shiftType === "Evening") {
      startInput.value = `${dateVal}T15:00`;
      endInput.value = `${dateVal}T23:30`;
    } else if (shiftType === "Night") {
      startInput.value = `${dateVal}T23:00`;
      // next day for night end
      const d = new Date(dateVal);
      d.setDate(d.getDate() + 1);
      const nextDayStr = d.toISOString().split("T")[0];
      endInput.value = `${nextDayStr}T08:00`;
    }
  },

  async handleAssignShift(e) {
    e.preventDefault();
    const payload = {
      user: document.getElementById("shiftUserSelect").value,
      shiftDate: new Date(document.getElementById("shiftDateInput").value).toISOString(),
      shiftType: document.getElementById("shiftTypeSelect").value,
      startTime: new Date(document.getElementById("shiftStartInput").value).toISOString(),
      endTime: new Date(document.getElementById("shiftEndInput").value).toISOString(),
      gracePeriodMinutes: parseInt(document.getElementById("shiftGraceInput").value, 10) || 45,
    };

    try {
      await this.api("/api/shifts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("assignShiftModal");
      e.target.reset();
      this.loadAdminShifts();
      alert("Shift assigned to doctor schedule.");
    } catch (err) {
      alert(err.message);
    }
  },

  async loadAdminAudit() {
    try {
      const res = await this.api("/api/audit");
      const tbody = document.getElementById("adminAuditTableBody");
      const logs = res.data.logs;

      tbody.innerHTML = logs.map((l) => `
        <tr>
          <td>${new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td style="font-weight: 700;">${l.userName} (${l.userId})</td>
          <td><span class="badge-status status-Stable">${l.action}</span></td>
          <td>${l.entity}</td>
          <td style="font-size: 0.72rem; color: var(--text-dim); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${l.previousValue ? JSON.stringify(l.previousValue) : "--"}
          </td>
          <td style="font-size: 0.72rem; color: var(--text-muted); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${l.newValue ? JSON.stringify(l.newValue) : "--"}
          </td>
          <td style="font-size: 0.72rem; color: var(--text-dim);">${l.ipAddress || "--"}</td>
        </tr>
      `).join("");
    } catch (err) {
      console.error(err.message);
    }
  },
};

// Auto-run on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
