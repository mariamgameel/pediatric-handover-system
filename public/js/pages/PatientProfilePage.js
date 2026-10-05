/**
 * Patient Profile Workspace Page
 */

import { api } from "../api.js";
import { state } from "../state.js";
import { PatientProfileView } from "../components/PatientProfileView.js";

export const PatientProfilePage = {
  async render(container, params) {
    const patientId = params.id;
    state.activePatientId = patientId;

    container.innerHTML = `
      <section id="profileView" style="display: block;">
        <div style="margin-bottom: 0.75rem;">
          <button class="btn btn-outline btn-sm" onclick="app.router.navigate('/patients')">← Back to Patient Directory</button>
        </div>

        <!-- Identity Header & Quick Actions -->
        <div class="profile-header">
          <div class="profile-title-row">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                <span class="card-bed" id="profileBed">Bed --</span>
                <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a;" id="profileName">Patient Name</h2>
                <span class="badge-status" id="profileStatusBadge">Stable</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-dim);" id="profileMeta">
                Age: -- | Weight: -- kg | File: -- | ID: --
              </div>
              <div style="font-size: 0.82rem; margin-top: 0.35rem;">
                <strong>Main Diagnosis:</strong> <span id="profileDiagnosis">--</span>
                &nbsp;|&nbsp; <strong>Allergies:</strong> <span id="profileAllergies" style="color: var(--critical); font-weight: 700;">NKDA</span>
              </div>
              <div id="profileCriticalReasonRow" style="display: none; margin-top: 0.35rem; color: var(--critical); font-weight: 700; font-size: 0.82rem;">
                Reason for Critical Status: <span id="profileCriticalReason">--</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn btn-critical" onclick="app.showPatientDeteriorationModal()">Record Deterioration</button>
              <button class="btn btn-outline" onclick="app.showUpdateStatusModal()">Update Status</button>
              <button class="btn btn-outline" onclick="app.showModal('dischargeModal')">Discharge / Transfer</button>
            </div>
          </div>

          <!-- Latest Vitals Ribbon -->
          <div class="patient-vital-stats" id="profileVitalsRibbon">
            <div class="stat-item"><span class="stat-label">Temperature</span><span class="stat-val" id="statTemp">--</span></div>
            <div class="stat-item"><span class="stat-label">Heart Rate</span><span class="stat-val" id="statHR">--</span></div>
            <div class="stat-item"><span class="stat-label">Resp Rate</span><span class="stat-val" id="statRR">--</span></div>
            <div class="stat-item"><span class="stat-label">BP</span><span class="stat-val" id="statBP">--</span></div>
            <div class="stat-item"><span class="stat-label">SpO2</span><span class="stat-val" id="statSpO2">--</span></div>
            <div class="stat-item"><span class="stat-label">GCS</span><span class="stat-val" id="statGCS">--</span></div>
            <div class="stat-item"><span class="stat-label">Oxygen Support</span><span class="stat-val" id="statO2">--</span></div>
            <div class="stat-item"><span class="stat-label">IV Fluids</span><span class="stat-val" id="statIV">--</span></div>
          </div>
        </div>

        <!-- "What Changed?" Dynamic Delta Banner -->
        <div id="whatChangedContainer" style="display: none;"></div>

        <!-- Workspace Tabs -->
        <div class="tabs-nav">
          <button class="tab-btn active" data-tab="overview" onclick="app.switchProfileTab('overview')">Overview &amp; Vitals</button>
          <button class="tab-btn" data-tab="problems" onclick="app.switchProfileTab('problems')">Active Problems</button>
          <button class="tab-btn" data-tab="investigations" onclick="app.switchProfileTab('investigations')">Investigations &amp; Results</button>
          <button class="tab-btn" data-tab="management" onclick="app.switchProfileTab('management')">Management Plans</button>
          <button class="tab-btn" data-tab="tasks" onclick="app.switchProfileTab('tasks')">Clinical Tasks</button>
          <button class="tab-btn" data-tab="timeline" onclick="app.switchProfileTab('timeline')">Timeline Stream</button>
        </div>

        <!-- Tab Content 1: Overview & Vitals -->
        <div class="tab-pane" id="tabOverview">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700;">Bedside Vital Signs History (Append-Only)</h4>
            <button class="btn btn-primary btn-sm" onclick="app.showModal('addVitalsModal')">Record Vitals</button>
          </div>
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Temp (°C)</th>
                  <th>HR (bpm)</th>
                  <th>RR (bpm)</th>
                  <th>BP (mmHg)</th>
                  <th>SpO2 (%)</th>
                  <th>GCS</th>
                  <th>Oxygen Support</th>
                  <th>IV Fluids</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody id="vitalsTableBody">
                <tr><td colspan="10" style="text-align: center; color: var(--text-dim);">No vitals recorded yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab Content 2: Active Problems -->
        <div class="tab-pane" id="tabProblems" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700;">Problems List (Active &amp; Resolved History)</h4>
            <button class="btn btn-primary btn-sm" onclick="app.showModal('addProblemModal')">Add Active Problem</button>
          </div>
          <div id="problemsList">
            <!-- Rendered Problems -->
          </div>
        </div>

        <!-- Tab Content 3: Investigations -->
        <div class="tab-pane" id="tabInvestigations" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700;">Diagnostic Investigations</h4>
            <button class="btn btn-primary btn-sm" onclick="app.showModal('requestInvestigationModal')">Request Investigation</button>
          </div>
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>Investigation</th>
                  <th>Type</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Result</th>
                  <th>Reviewed By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="investigationsTableBody">
                <tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No investigations on record.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab Content 4: Management Plans -->
        <div class="tab-pane" id="tabManagement" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700;">Management Plans (Versioned Stack)</h4>
            <button class="btn btn-primary btn-sm" id="addPlanBtn" onclick="app.showModal('addPlanModal')">Author New Plan Version</button>
          </div>
          <div id="managementPlansStack">
            <!-- Rendered Management Plans -->
          </div>
        </div>

        <!-- Tab Content 5: Tasks -->
        <div class="tab-pane" id="tabTasks" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700;">Patient Tasks &amp; To-Do</h4>
            <button class="btn btn-primary btn-sm" onclick="app.showModal('addTaskModal')">Add Task</button>
          </div>
          <div id="patientTasksList">
            <!-- Rendered Tasks -->
          </div>
        </div>

        <!-- Tab Content 6: Timeline -->
        <div class="tab-pane" id="tabTimeline" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700;">Unified Chronological History</h4>
            <button class="btn btn-outline btn-sm" onclick="app.showModal('addUpdateModal')">Add Clinical Note</button>
          </div>
          <div class="timeline-list" id="patientTimelineStream">
            <!-- Rendered Timeline -->
          </div>
        </div>
      </section>
    `;
  },

  async afterRender(params) {
    const patientId = params.id;
    if (!patientId) return;

    try {
      const [profileRes, whatChangedRes] = await Promise.all([
        api.request(`/api/patients/${patientId}`),
        api.request(`/api/patients/${patientId}/what-changed`),
      ]);

      const { patient, latestVitals } = profileRes.data;
      state.currentPatientData = profileRes.data;

      PatientProfileView.renderProfileHeader(patient, latestVitals);
      PatientProfileView.renderWhatChangedBanner(whatChangedRes.data);
      window.app.switchProfileTab("overview");
    } catch (err) {
      console.error("Failed to load patient workspace:", err.message);
    }
  },
};
