/**
 * Pediatric Handover & Clinical Follow-up System
 * Modular Client Engine (Pages + Components Architecture)
 */

import { api } from "./api.js";
import { state } from "./state.js";
import { Router } from "./router.js";

// Pages
import { LoginPage } from "./pages/LoginPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PatientsPage } from "./pages/PatientsPage.js";
import { PatientProfilePage } from "./pages/PatientProfilePage.js";
import { HandoverPage } from "./pages/HandoverPage.js";
import { AdminPage } from "./pages/AdminPage.js";
import { GuidelinesPage } from "./pages/GuidelinesPage.js";
import { ProtocolsPage } from "./pages/ProtocolsPage.js";
import { RosterPage } from "./pages/RosterPage.js";
import { ManpowerPage } from "./pages/ManpowerPage.js";

// Components
import { Header } from "./components/Header.js";
import { DashboardView } from "./components/DashboardView.js";
import { PatientsView } from "./components/PatientsView.js";
import { PatientProfileView } from "./components/PatientProfileView.js";
import { HandoverView } from "./components/HandoverView.js";
import { AdminView } from "./components/AdminView.js";
import { Modals } from "./components/Modals.js";

// Initialize Router
const router = new Router([
  { path: "/login", page: LoginPage },
  { path: "/dashboard", page: DashboardPage },
  { path: "/patients", page: PatientsPage },
  { path: "/patient/:id", page: PatientProfilePage },
  { path: "/handover", page: HandoverPage },
  { path: "/guidelines", page: GuidelinesPage },
  { path: "/protocols", page: ProtocolsPage },
  { path: "/roster", page: RosterPage },
  { path: "/manpower", page: ManpowerPage },
  { path: "/admin", page: AdminPage, roleRequired: "Admin" },
], "app-root");

const app = {
  router,
  api: (endpoint, options) => api.request(endpoint, options),
  state,

  // Component references
  Header,
  DashboardView,
  PatientsView,
  PatientProfileView,
  HandoverView,
  AdminView,
  Modals,
  GuidelinesPage,
  ProtocolsPage,
  RosterPage,
  ManpowerPage,

  get token() { return api.token; },
  set token(val) { api.setToken(val); },
  get currentUser() { return state.currentUser; },
  set currentUser(val) { state.setCurrentUser(val); },
  get activePatientId() { return state.activePatientId; },
  set activePatientId(val) { state.activePatientId = val; },
  get currentPatientData() { return state.currentPatientData; },
  set currentPatientData(val) { state.currentPatientData = val; },
  get allPatientsCache() { return state.allPatientsCache; },
  set allPatientsCache(val) { state.setPatientsCache(val); },

  // ==================== INITIALIZATION ====================
  async init() {
    if (this.token) {
      await this.fetchCurrentUser();
    } else {
      router.navigate("/login");
    }
  },

  // ==================== AUTH & SESSIONS ====================
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errBox = document.getElementById("loginError");
    if (errBox) errBox.style.display = "none";

    try {
      const res = await this.api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      this.token = res.token;
      this.currentUser = res.data.user;
      this.setupAuthenticatedState();
      router.navigate("/dashboard");
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = "block";
      } else {
        alert(err.message);
      }
    }
  },

  async fetchCurrentUser() {
    try {
      const res = await this.api("/api/auth/me");
      this.currentUser = res.data.user;
      this.setupAuthenticatedState();
    } catch (err) {
      console.warn("Auth session expired:", err.message);
      this.logout();
    }
  },

  quickFillLogin(email, password) {
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = password;
    const card = document.getElementById("staff-portal");
    if (card) {
      card.scrollIntoView({ behavior: "smooth" });
    }
  },

  setupAuthenticatedState() {
    Header.render(this.currentUser);
    this.pollAlerts();
  },

  logout() {
    this.token = null;
    this.currentUser = null;
    this.activePatientId = null;
    Header.render(null);
    router.navigate("/login");
  },

  showLockout(message) {
    alert(`Access Blocked: ${message}`);
    router.navigate("/login");
  },

  // Router navigation helper
  navigate(pageName) {
    if (pageName === "patients") router.navigate("/patients");
    else if (pageName === "handover") router.navigate("/handover");
    else if (pageName === "guidelines") router.navigate("/guidelines");
    else if (pageName === "protocols") router.navigate("/protocols");
    else if (pageName === "roster") router.navigate("/roster");
    else if (pageName === "manpower") router.navigate("/manpower");
    else if (pageName === "admin") router.navigate("/admin");
    else router.navigate("/dashboard");
  },

  openPatientProfile(patientId) {
    router.navigate(`/patient/${patientId}`);
  },

  // Modal delegation
  showModal(id) { Modals.show(id); },
  closeModal(id) { Modals.close(id); },
  toggleCriticalReasonField(sId, gId) { Modals.toggleCriticalReasonField(sId, gId); },
  addMedicationRow() { Modals.addMedicationRow(); },

  // ==================== DASHBOARD ACTIONS ====================
  handleDashboardSearch(e) {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;
    if (e.key === "Enter" || q.length >= 3) {
      router.navigate("/patients");
      setTimeout(() => {
        const inp = document.getElementById("patientFilterSearch");
        if (inp) {
          inp.value = q;
          this.loadPatients();
        }
      }, 50);
    }
  },

  async loadDashboard() {
    await DashboardPage.afterRender();
  },

  // ==================== PATIENTS ACTIONS ====================
  async loadPatients() {
    await PatientsPage.afterRender();
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
    } catch (err) {
      alert(err.message);
    }
  },

  // ==================== PATIENT WORKSPACE TABS ====================
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

  async loadPatientVitals() {
    try {
      const res = await this.api(`/api/vitals/patient/${this.activePatientId}`);
      PatientProfileView.renderVitalsTable(res.data.vitals);
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
      oxygenSupport: { mode: document.getElementById("vO2Mode").value },
      ivFluids: document.getElementById("vIVFluids").value.trim(),
    };

    try {
      await this.api("/api/vitals", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addVitalsModal");
      e.target.reset();
      this.loadPatientVitals();
    } catch (err) {
      alert(err.message);
    }
  },

  async loadPatientProblems() {
    try {
      const res = await this.api(`/api/problems/patient/${this.activePatientId}`);
      PatientProfileView.renderProblemsList(res.data.problems);
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
    const note = prompt("Enter clinical resolution notes:");
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

  async loadPatientInvestigations() {
    try {
      const res = await this.api(`/api/investigations/patient/${this.activePatientId}`);
      PatientProfileView.renderInvestigationsTable(res.data.investigations, this.currentUser);
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
    const notes = prompt("Enter formal review note (or confirm):");
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

  async loadPatientManagementPlans() {
    try {
      const res = await this.api(`/api/management-plans/patient/${this.activePatientId}`);
      PatientProfileView.renderManagementPlans(res.data.history);
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleCreateManagementPlan(e) {
    e.preventDefault();
    const medsRows = document.querySelectorAll("#planMedsList .med-input-row");
    const medications = [];

    medsRows.forEach((r) => {
      const name = r.querySelector(".med-name").value.trim();
      const dosage = r.querySelector(".med-dose").value.trim();
      const route = r.querySelector(".med-route").value;
      const frequency = r.querySelector(".med-freq").value.trim();
      const isAntibiotic = r.querySelector(".med-abx").checked;

      if (name) {
        medications.push({ name, dosage, route, frequency, isAntibiotic });
      }
    });

    const payload = {
      patient: this.activePatientId,
      plan: document.getElementById("planText").value.trim(),
      recommendations: document.getElementById("planRecommendations").value.trim(),
      clinicalReasoning: document.getElementById("planReasoning").value.trim(),
      medications,
      ivFluids: document.getElementById("planIVFluids").value.trim(),
      oxygenSupport: document.getElementById("planO2").value.trim(),
      supportiveCare: document.getElementById("planSupportiveCare").value.trim(),
    };

    try {
      await this.api("/api/management-plans", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      this.closeModal("addPlanModal");
      e.target.reset();
      document.getElementById("planMedsList").innerHTML = "";
      this.loadPatientManagementPlans();
    } catch (err) {
      alert(err.message);
    }
  },

  async loadPatientTasks() {
    try {
      const res = await this.api(`/api/tasks/patient/${this.activePatientId}`);
      PatientProfileView.renderTasksList(res.data.tasks);
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
      assignedTo: document.getElementById("taskAssignedToSelect").value || undefined,
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
    const notes = prompt("Enter task completion notes:", "Completed");
    if (notes === null) return;

    try {
      await this.api(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ completionNotes: notes }),
      });

      if (this.activePatientId && this.activePatientId === patientId) {
        this.loadPatientTasks();
      }
      if (window.location.hash.includes("dashboard")) {
        this.loadDashboard();
      }
    } catch (err) {
      alert(err.message);
    }
  },

  async loadPatientTimeline() {
    try {
      const res = await this.api(`/api/clinical-updates/patient/${this.activePatientId}`);
      PatientProfileView.renderTimeline(res.data.clinicalUpdates);
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
      router.navigate(`/patient/${this.activePatientId}`);
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
      router.navigate("/patients");
    } catch (err) {
      alert(err.message);
    }
  },

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

    if (sel) {
      sel.innerHTML = this.allPatientsCache.map((p) => `
        <option value="${p._id || p.id}" ${selectedId === (p._id || p.id) ? "selected" : ""}>
          ${p.bedNumber} - ${p.name} (${p.status})
        </option>
      `).join("");
    }
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
      if (window.location.hash.includes("dashboard")) {
        this.loadDashboard();
      } else if (this.activePatientId) {
        router.navigate(`/patient/${this.activePatientId}`);
      }
    } catch (err) {
      alert(err.message);
    }
  },

  // ==================== SHIFT HANDOVER ACTIONS ====================
  async loadWardHandoverSheet() {
    await HandoverPage.afterRender();
  },

  async submitShiftHandover(patientId, recommendedStatus) {
    const shiftType = prompt("Select Shift Transition (1 = Morning to Evening, 2 = Evening to Night, 3 = Night to Morning):", "1");
    if (!shiftType) return;

    const shiftMap = { "1": "Morning to Evening", "2": "Evening to Night", "3": "Night to Morning" };
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

  // ==================== ALERTS ACTIONS ====================
  async pollAlerts() {
    try {
      const res = await this.api("/api/alerts?unreadOnly=true");
      Header.updateAlertBadge(res.unreadCount || 0);

      const body = document.getElementById("alertsModalBody");
      const alerts = res.data.alerts;

      if (!alerts || alerts.length === 0) {
        if (body) body.innerHTML = `<p style="color: var(--text-dim);">No active clinical alerts.</p>`;
        return;
      }

      if (body) {
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
            <button class="btn btn-outline btn-sm" onclick="app.dismissAlert('${a._id || a.id}')">Dismiss</button>
          </div>
        `).join("");
      }
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

  // ==================== ADMIN ACTIONS ====================
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
      AdminView.renderUsers(res.data.users);
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
    const newRole = prompt(`Change Role (Resident, Specialist, Consultant, Admin):`, currentRole);
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
    const hours = prompt("Enter emergency override hours:", "4");
    if (!hours) return;
    const reason = prompt("Enter clinical justification:", "Emergency bedside coverage");
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
      AdminView.renderShifts(shiftsRes.data.shifts, usersRes.data.users);
    } catch (err) {
      console.error(err.message);
    }
  },

  async handleAssignShift(e) {
    e.preventDefault();
    const payload = {
      user: document.getElementById("shiftUserSelect").value,
      shiftType: document.getElementById("shiftTypeSelect").value,
      startTime: document.getElementById("shiftStartInput").value,
      endTime: document.getElementById("shiftEndInput").value,
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
      alert("Shift assigned to roster.");
    } catch (err) {
      alert(err.message);
    }
  },

  async loadAdminAudit() {
    try {
      const res = await this.api("/api/audit");
      AdminView.renderAuditLogs(res.data.logs);
    } catch (err) {
      console.error(err.message);
    }
  },
};

// Export to window scope for HTML inline handlers
window.app = app;

document.addEventListener("DOMContentLoaded", () => {
  app.init();
});

export default app;
