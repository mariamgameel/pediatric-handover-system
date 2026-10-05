/**
 * ProtocolsPage Component: Clinical Protocols, Interactive SOP Checklists & Rapid Escalation
 */
import { api } from "../api.js";
import { state } from "../state.js";
import { AdminModals } from "../components/AdminModals.js";

export const ProtocolsPage = {
  protocols: [],
  patients: [],
  activeCategory: "",

  async render(container, params) {
    return this.init(container);
  },

  async init(container) {
    this.container = container;
    this.renderLayout();
    await Promise.all([this.loadProtocols(), this.loadPatients()]);
  },

  renderLayout() {
    const isAdmin = state.currentUser && state.currentUser.role === "Admin";

    this.container.innerHTML = `
      <div class="content-wrapper" style="max-width: 1300px; margin: 0 auto; padding: 1.5rem;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a;">Pediatric Clinical Protocols & SOP Checklists</h1>
            <p style="color: #64748b; font-size: 0.9rem;">Standard Operating Procedures, PEWS rapid escalation pathways, and emergency arrest algorithms.</p>
          </div>
          <div>
            ${
              isAdmin
                ? `<button class="btn btn-primary" id="addProtocolBtn">➕ Add Clinical Protocol</button>`
                : ""
            }
          </div>
        </div>

        <!-- Filter bar -->
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
          <button class="btn btn-sm btn-outline protocol-cat-btn active" data-cat="">All Protocols</button>
          <button class="btn btn-sm btn-outline protocol-cat-btn" data-cat="Deterioration_Escalation">Deterioration & PEWS</button>
          <button class="btn btn-sm btn-outline protocol-cat-btn" data-cat="Resuscitation_CodeBlue">Code Blue & Arrest</button>
          <button class="btn btn-sm btn-outline protocol-cat-btn" data-cat="Handover_SBAR">SBAR Handover</button>
          <button class="btn btn-sm btn-outline protocol-cat-btn" data-cat="Infection_Isolation">Infection & Isolation</button>
          <button class="btn btn-sm btn-outline protocol-cat-btn" data-cat="Admission_Discharge">Discharge Readiness</button>
        </div>

        <!-- Protocols List Mount -->
        <div id="protocolsMountPoint">
          <div style="text-align: center; padding: 3rem;">
            <div class="spinner" style="margin: 0 auto 1rem auto;"></div>
            <p>Loading clinical protocols...</p>
          </div>
        </div>
      </div>
    `;

    if (isAdmin) {
      document.getElementById("addProtocolBtn").onclick = () => {
        AdminModals.renderProtocolModal(null, () => this.loadProtocols());
      };
    }

    const filterBtns = this.container.querySelectorAll(".protocol-cat-btn");
    filterBtns.forEach((btn) => {
      btn.onclick = () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeCategory = btn.getAttribute("data-cat");
        this.loadProtocols();
      };
    });
  },

  async loadProtocols() {
    try {
      const params = {};
      if (this.activeCategory) params.category = this.activeCategory;

      const res = await api.getProtocols(params);
      this.protocols = res.data?.protocols || [];
      this.renderProtocols();
    } catch (err) {
      document.getElementById("protocolsMountPoint").innerHTML = `
        <div class="alert alert-danger">Failed to load protocols: ${err.message}</div>
      `;
    }
  },

  async loadPatients() {
    try {
      const res = await api.request("/api/patients");
      this.patients = res.data?.patients || [];
    } catch (err) {
      console.warn("Could not pre-load patients for checklist:", err);
    }
  },

  renderProtocols() {
    const mount = document.getElementById("protocolsMountPoint");
    if (!mount) return;

    if (this.protocols.length === 0) {
      mount.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--surface); border-radius: 8px;">
          <h3>No protocols found for this category.</h3>
        </div>
      `;
      return;
    }

    const isAdmin = state.currentUser && state.currentUser.role === "Admin";

    mount.innerHTML = `
      <div style="display: grid; gap: 1rem;">
        ${this.protocols.map((p) => {
          let badgeStyle = "background: #e0f2fe; color: #0369a1;";
          if (p.priority === "Critical_Stat") badgeStyle = "background: #fee2e2; color: #dc2626;";
          else if (p.priority === "Urgent") badgeStyle = "background: #fef3c7; color: #d97706;";

          return `
            <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem; box-shadow: var(--shadow-sm);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <span style="font-family: monospace; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">${p.protocolCode}</span>
                  <span style="padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; margin-left: 0.5rem; ${badgeStyle}">${p.priority.replace(/_/g, " ")}</span>
                  <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text); margin-top: 0.4rem;">${p.title}</h3>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                  <button class="btn btn-primary btn-sm" onclick="window._executeProtocol('${p._id}')">⚡ Execute Checklist</button>
                  ${
                    isAdmin
                      ? `
                      <button class="action-icon-btn" title="Edit Protocol" onclick="window._editProtocol('${p._id}')">✏️</button>
                      <button class="action-icon-btn" title="Delete Protocol" style="color: #dc2626;" onclick="window._deleteProtocol('${p._id}')">🗑️</button>
                    `
                      : ""
                  }
                </div>
              </div>

              ${
                p.triggerConditions
                  ? `
                <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.82rem; margin-bottom: 0.85rem; color: #92400e;">
                  <strong>Trigger:</strong> ${p.triggerConditions}
                </div>
              `
                  : ""
              }

              <!-- Checklist Step Preview -->
              <div style="margin-top: 0.5rem;">
                <strong style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em;">Standard Operating Steps (${p.checklistItems?.length || 0} steps):</strong>
                <div style="margin-top: 0.5rem; display: grid; gap: 0.4rem;">
                  ${(p.checklistItems || []).map((s) => `
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; background: #f8fafc; padding: 0.4rem 0.6rem; border-radius: 4px;">
                      <span style="font-weight: 800; color: #0284c7; width: 22px;">#${s.stepNumber}</span>
                      <span style="flex: 1;">${s.action}</span>
                      <span class="badge" style="font-size: 0.7rem; background: #e2e8f0; color: #334155;">Target: ${s.targetTimeMinutes}m</span>
                      <span class="badge" style="font-size: 0.7rem; background: #e0f2fe; color: #0369a1;">Role: ${s.roleRequired}</span>
                    </div>
                  `).join("")}
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); margin-top: 1rem; padding-top: 0.65rem; font-size: 0.78rem; color: var(--text-dim);">
                <span>Escalation Target: <strong>${p.escalationRole}</strong></span>
                <span>Category: <strong>${p.category.replace(/_/g, " ")}</strong></span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    window._editProtocol = (id) => {
      const p = this.protocols.find((item) => item._id === id);
      if (p) AdminModals.renderProtocolModal(p, () => this.loadProtocols());
    };

    window._deleteProtocol = async (id) => {
      if (!confirm("Are you sure you want to delete this clinical protocol?")) return;
      try {
        await api.deleteProtocol(id);
        await this.loadProtocols();
      } catch (err) {
        alert("Error deleting protocol: " + err.message);
      }
    };

    window._executeProtocol = (id) => {
      const p = this.protocols.find((item) => item._id === id);
      if (p) this.showExecutionDrawer(p);
    };
  },

  showExecutionDrawer(protocol) {
    let modal = document.getElementById("protocolExecuteModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "protocolExecuteModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const stepsState = (protocol.checklistItems || []).map((s) => ({
      stepNumber: s.stepNumber,
      action: s.action,
      roleRequired: s.roleRequired,
      targetTimeMinutes: s.targetTimeMinutes,
      completed: false,
      notes: "",
    }));

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 750px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <div>
            <span style="font-family: monospace; font-weight: 700; color: #0284c7;">${protocol.protocolCode}</span>
            <h2 style="font-size: 1.25rem; font-weight: 800; margin-top: 0.25rem;">Interactive Checklist: ${protocol.title}</h2>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('protocolExecuteModal').style.display='none'">&times;</button>
        </div>
        <form id="executeProtocolForm" style="padding: 1.25rem;">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Select Patient *</label>
            <select id="execPatientSelect" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required>
              ${this.patients.map((pt) => `
                <option value="${pt._id}">${pt.bedNumber} - ${pt.name} (${pt.patientId}) - Diagnosis: ${pt.mainDiagnosis}</option>
              `).join("")}
            </select>
          </div>

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 0.75rem; border-radius: 4px; font-size: 0.8rem; margin-bottom: 1rem; color: #0369a1;">
            Check off steps as they are completed at the bedside. Executing this protocol will automatically record a clinical progress update and notify the on-call ${protocol.escalationRole}.
          </div>

          <div id="execStepsContainer">
            ${stepsState.map((s, idx) => `
              <div class="protocol-step" id="step-row-${idx}">
                <div class="step-num">${s.stepNumber}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.2rem;">${s.action}</div>
                  <div style="font-size: 0.75rem; color: #64748b;">
                    Required Role: <strong>${s.roleRequired}</strong> | Target Window: <strong>${s.targetTimeMinutes} mins</strong>
                  </div>
                  <input type="text" class="form-control" style="margin-top: 0.35rem; font-size: 0.78rem; padding: 0.3rem 0.5rem; width: 100%;" placeholder="Add specific notes (e.g. oxygen saturation 96%, bloods sent to lab)..." onchange="window._setStepNote(${idx}, this.value)">
                </div>
                <div>
                  <input type="checkbox" style="width: 20px; height: 20px; cursor: pointer;" onchange="window._toggleStepCheck(${idx}, this.checked)">
                </div>
              </div>
            `).join("")}
          </div>

          <div class="form-group" style="margin-top: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Additional Clinical Summary / Escalation Notes</label>
            <textarea id="execNotes" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px; min-height: 60px;" placeholder="Patient stabilized after 20mL/kg bolus, continuing close observation..."></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('protocolExecuteModal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submitExecBtn">Submit Checklist to Patient Record</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";

    window._toggleStepCheck = (idx, isChecked) => {
      stepsState[idx].completed = isChecked;
      const row = document.getElementById(`step-row-${idx}`);
      if (row) {
        if (isChecked) row.classList.add("completed");
        else row.classList.remove("completed");
      }
    };

    window._setStepNote = (idx, note) => {
      stepsState[idx].notes = note.trim();
    };

    const form = document.getElementById("executeProtocolForm");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submitExecBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Recording...";

      try {
        const patientId = document.getElementById("execPatientSelect").value;
        const notes = document.getElementById("execNotes").value.trim();

        await api.executeProtocol(protocol._id, {
          patientId,
          executedSteps: stepsState,
          clinicalNotes: notes,
        });

        modal.style.display = "none";
        alert(`Checklist logged successfully into patient record!`);
      } catch (err) {
        alert("Error executing protocol: " + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Checklist to Patient Record";
      }
    };
  },
};
