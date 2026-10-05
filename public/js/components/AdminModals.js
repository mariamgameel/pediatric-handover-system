/**
 * AdminModals Component: Dynamic Administrative Modals for Guidelines, Protocols, Shifts, Excel Import, and Staff Profiles
 */
import { api } from "../api.js";

export const AdminModals = {
  // 1. Modal for Guideline Add/Edit
  renderGuidelineModal(guideline = null, onSaved) {
    const isEdit = !!guideline;
    const modalId = "adminGuidelineModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const categories = [
      "Emergency_PICU",
      "Neonatology",
      "General_Pediatrics",
      "Respiratory",
      "Infectious_Disease",
      "Endocrinology_Metabolic",
      "Neurology",
      "Cardiology",
    ];

    const ageGroups = [
      "All_Pediatric",
      "Neonate_0_28d",
      "Infant_1_12m",
      "Child_1_12y",
      "Adolescent_12_18y",
    ];

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 720px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>${isEdit ? "✏️ Edit Clinical Guideline" : "➕ Add New Clinical Guideline"}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('${modalId}').style.display='none'">&times;</button>
        </div>
        <form id="guidelineForm" style="padding: 1.25rem;">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Guideline Title *</label>
            <input type="text" id="gTitle" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required value="${guideline ? guideline.title : ""}" placeholder="e.g. Pediatric Sepsis 6 Protocol">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Category *</label>
              <select id="gCategory" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                ${categories.map((c) => `<option value="${c}" ${guideline && guideline.category === c ? "selected" : ""}>${c.replace(/_/g, " ")}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Target Age Group</label>
              <select id="gAge" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                ${ageGroups.map((a) => `<option value="${a}" ${guideline && guideline.targetAgeGroup === a ? "selected" : ""}>${a.replace(/_/g, " ")}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Handover Summary *</label>
            <textarea id="gSummary" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px; min-height: 60px;" required placeholder="Brief clinical summary for fast review...">${guideline ? guideline.summary : ""}</textarea>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Detailed Content (Markdown Supported) *</label>
            <textarea id="gContent" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px; min-height: 140px; font-family: monospace;" required placeholder="### Clinical Algorithm Steps&#10;1. Initial assessment...">${guideline ? guideline.contentMarkdown : ""}</textarea>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Weight-based Dosing Formulas (JSON format)</label>
            <textarea id="gDosage" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-size: 0.8rem; min-height: 80px;" placeholder='[{"drug": "Ceftriaxone", "dose": "80 mg/kg/day", "route": "IV"}]'>${guideline && guideline.dosageFormulas ? JSON.stringify(guideline.dosageFormulas, null, 2) : "[]"}</textarea>
            <small style="color: #64748b;">Specify drug name, dose per kg, route, maxDose for the interactive calculator.</small>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveGuidelineBtn">${isEdit ? "Update Guideline" : "Save Guideline"}</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";

    const form = document.getElementById("guidelineForm");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("saveGuidelineBtn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        let dosageFormulas = [];
        try {
          dosageFormulas = JSON.parse(document.getElementById("gDosage").value || "[]");
        } catch (err) {
          alert("Invalid JSON format in Dosing Formulas field.");
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? "Update Guideline" : "Save Guideline";
          return;
        }

        const payload = {
          title: document.getElementById("gTitle").value.trim(),
          category: document.getElementById("gCategory").value,
          targetAgeGroup: document.getElementById("gAge").value,
          summary: document.getElementById("gSummary").value.trim(),
          contentMarkdown: document.getElementById("gContent").value.trim(),
          dosageFormulas,
        };

        if (isEdit) {
          await api.updateGuideline(guideline._id, payload);
        } else {
          await api.createGuideline(payload);
        }

        modal.style.display = "none";
        if (onSaved) onSaved();
      } catch (err) {
        alert("Error saving guideline: " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? "Update Guideline" : "Save Guideline";
      }
    };
  },

  // 2. Modal for Protocol Add/Edit
  renderProtocolModal(protocol = null, onSaved) {
    const isEdit = !!protocol;
    const modalId = "adminProtocolModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    const categories = [
      "Deterioration_Escalation",
      "Resuscitation_CodeBlue",
      "Handover_SBAR",
      "Admission_Discharge",
      "Infection_Isolation",
      "Procedural_Safety",
    ];

    let steps = protocol?.checklistItems ? [...protocol.checklistItems] : [
      { stepNumber: 1, action: "Immediate bedside clinical assessment", roleRequired: "Resident", targetTimeMinutes: 5, isMandatory: true }
    ];

    const renderSteps = () => {
      const container = document.getElementById("protocolStepsContainer");
      if (!container) return;
      container.innerHTML = steps.map((s, idx) => `
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; background: #f8fafc; padding: 0.5rem; border-radius: 4px; border: 1px solid #e2e8f0;">
          <span style="font-weight: 700; width: 24px;">#${idx + 1}</span>
          <input type="text" class="form-control" style="flex: 2; padding: 0.4rem;" placeholder="Action description..." value="${s.action}" onchange="window._updatePStep(${idx}, 'action', this.value)" required>
          <select class="form-control" style="flex: 1; padding: 0.4rem;" onchange="window._updatePStep(${idx}, 'roleRequired', this.value)">
            <option value="Resident" ${s.roleRequired === "Resident" ? "selected" : ""}>Resident</option>
            <option value="Staff_Nurse" ${s.roleRequired === "Staff_Nurse" ? "selected" : ""}>Nurse</option>
            <option value="Specialist" ${s.roleRequired === "Specialist" ? "selected" : ""}>Specialist</option>
            <option value="Consultant" ${s.roleRequired === "Consultant" ? "selected" : ""}>Consultant</option>
            <option value="Code_Blue_Team" ${s.roleRequired === "Code_Blue_Team" ? "selected" : ""}>Code Blue</option>
          </select>
          <input type="number" class="form-control" style="width: 70px; padding: 0.4rem;" title="Target mins" placeholder="Mins" value="${s.targetTimeMinutes || 5}" onchange="window._updatePStep(${idx}, 'targetTimeMinutes', Number(this.value))">
          <button type="button" class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="window._removePStep(${idx})">&times;</button>
        </div>
      `).join("");
    };

    window._updatePStep = (idx, field, val) => {
      steps[idx][field] = val;
    };
    window._removePStep = (idx) => {
      if (steps.length > 1) {
        steps.splice(idx, 1);
        steps.forEach((s, i) => (s.stepNumber = i + 1));
        renderSteps();
      }
    };
    window._addPStep = () => {
      steps.push({
        stepNumber: steps.length + 1,
        action: "",
        roleRequired: "Resident",
        targetTimeMinutes: 5,
        isMandatory: true,
      });
      renderSteps();
    };

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 720px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>${isEdit ? "✏️ Edit Protocol / SOP" : "➕ Add New Clinical Protocol"}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('${modalId}').style.display='none'">&times;</button>
        </div>
        <form id="protocolForm" style="padding: 1.25rem;">
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Protocol Code *</label>
              <input type="text" id="pCode" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required value="${protocol ? protocol.protocolCode : "PROT-PED-"}" placeholder="PROT-PED-006">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Protocol Title *</label>
              <input type="text" id="pTitle" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required value="${protocol ? protocol.title : ""}" placeholder="e.g. Sepsis Resuscitation Checklist">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Category *</label>
              <select id="pCategory" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                ${categories.map((c) => `<option value="${c}" ${protocol && protocol.category === c ? "selected" : ""}>${c.replace(/_/g, " ")}</option>`).join("")}
              </select>
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Priority</label>
              <select id="pPriority" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                <option value="Routine" ${protocol && protocol.priority === "Routine" ? "selected" : ""}>Routine</option>
                <option value="Urgent" ${protocol && protocol.priority === "Urgent" ? "selected" : ""}>Urgent</option>
                <option value="Critical_Stat" ${protocol && protocol.priority === "Critical_Stat" ? "selected" : ""}>Critical STAT</option>
              </select>
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Escalate To</label>
              <input type="text" id="pEscalate" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${protocol ? protocol.escalationRole : "Specialist"}" placeholder="Specialist">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Activation Trigger Conditions</label>
            <input type="text" id="pTriggers" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${protocol ? protocol.triggerConditions || "" : ""}" placeholder="e.g. PEWS >= 5 or acute drop in SpO2 < 92%">
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <label style="font-weight: 700; font-size: 0.85rem;">Checklist Steps (Actionable SOP) *</label>
              <button type="button" class="btn btn-outline btn-sm" onclick="window._addPStep()">+ Add Step</button>
            </div>
            <div id="protocolStepsContainer"></div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveProtocolBtn">${isEdit ? "Update Protocol" : "Save Protocol"}</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";
    renderSteps();

    const form = document.getElementById("protocolForm");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("saveProtocolBtn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      try {
        const payload = {
          protocolCode: document.getElementById("pCode").value.trim().toUpperCase(),
          title: document.getElementById("pTitle").value.trim(),
          category: document.getElementById("pCategory").value,
          priority: document.getElementById("pPriority").value,
          triggerConditions: document.getElementById("pTriggers").value.trim(),
          escalationRole: document.getElementById("pEscalate").value.trim(),
          checklistItems: steps.map((s, i) => ({
            stepNumber: i + 1,
            action: s.action.trim(),
            roleRequired: s.roleRequired || "Resident",
            targetTimeMinutes: Number(s.targetTimeMinutes) || 5,
            isMandatory: true,
          })),
        };

        if (isEdit) {
          await api.updateProtocol(protocol._id, payload);
        } else {
          await api.createProtocol(payload);
        }

        modal.style.display = "none";
        if (onSaved) onSaved();
      } catch (err) {
        alert("Error saving protocol: " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? "Update Protocol" : "Save Protocol";
      }
    };
  },

  // 3. Modal for Excel Roster Upload & Interactive Preview
  renderExcelUploadModal(onImported) {
    const modalId = "excelUploadModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    let parsedData = null;

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>📥 Automated Excel Shift Roster Upload</h3>
          <button class="modal-close-btn" onclick="document.getElementById('${modalId}').style.display='none'">&times;</button>
        </div>
        <div style="padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: #e0f2fe; padding: 0.85rem; border-radius: 6px; border: 1px solid #bae6fd;">
            <div>
              <strong style="color: #0369a1;">Need the official spreadsheet template?</strong>
              <div style="font-size: 0.8rem; color: #0284c7;">Download pre-formatted .xlsx with all active staff IDs and validation columns.</div>
            </div>
            <button class="btn btn-primary btn-sm" id="downloadTemplateBtn">📥 Download Template (.xlsx)</button>
          </div>

          <div class="excel-dropzone" id="excelDropzone">
            <input type="file" id="excelFileInput" accept=".xlsx, .xls, .csv" style="display: none;">
            <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📊</div>
            <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem;">Drag & drop your Excel shift roster here</h4>
            <p style="font-size: 0.82rem; color: #64748b;">Supports .xlsx, .xls, and .csv files up to 10MB</p>
            <button type="button" class="btn btn-outline btn-sm" style="margin-top: 0.75rem;" onclick="document.getElementById('excelFileInput').click()">Browse Computer</button>
          </div>

          <div id="excelLoadingIndicator" style="display: none; text-align: center; padding: 1.5rem;">
            <div class="spinner" style="margin: 0 auto 0.75rem auto;"></div>
            <strong>Analyzing sheet rows and detecting clinical shift conflicts...</strong>
          </div>

          <div id="excelPreviewContainer" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700;">Pre-Import Validation Preview</h4>
              <div id="excelSummaryBadges" style="display: flex; gap: 0.5rem;"></div>
            </div>

            <div id="excelWarningAlert" style="display: none; padding: 0.6rem 0.85rem; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px; font-size: 0.8rem; margin-bottom: 0.75rem; color: #92400e;"></div>
            <div id="excelErrorAlert" style="display: none; padding: 0.6rem 0.85rem; background: #fef2f2; border: 1px solid #f87171; border-radius: 4px; font-size: 0.8rem; margin-bottom: 0.75rem; color: #b91c1c;"></div>

            <div style="max-height: 260px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 4px;">
              <table class="preview-table" id="excelPreviewTable">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Doctor / Staff</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Time Window</th>
                    <th>Ward Zone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="excelPreviewTbody"></tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').style.display='none'">Cancel</button>
              <button type="button" class="btn btn-primary" id="confirmImportBtn">✅ Confirm & Import to Schedule</button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.style.display = "flex";

    // Download template click handler
    document.getElementById("downloadTemplateBtn").onclick = async () => {
      try {
        const blob = await api.downloadExcelTemplate();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pediatric_shift_roster_template.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert("Failed to download template: " + err.message);
      }
    };

    const fileInput = document.getElementById("excelFileInput");
    const dropzone = document.getElementById("excelDropzone");

    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    };
    dropzone.ondragleave = () => dropzone.classList.remove("dragover");
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
      }
    };

    fileInput.onchange = (e) => {
      if (e.target.files.length) {
        handleFile(e.target.files[0]);
      }
    };

    const handleFile = async (file) => {
      const loading = document.getElementById("excelLoadingIndicator");
      const preview = document.getElementById("excelPreviewContainer");
      dropzone.style.display = "none";
      loading.style.display = "block";
      preview.style.display = "none";

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await api.uploadExcelShifts(formData);
        parsedData = res.data;
        renderPreview(parsedData);
      } catch (err) {
        alert("Upload error: " + err.message);
        dropzone.style.display = "block";
      } finally {
        loading.style.display = "none";
      }
    };

    const renderPreview = (data) => {
      const preview = document.getElementById("excelPreviewContainer");
      preview.style.display = "block";

      const badges = document.getElementById("excelSummaryBadges");
      badges.innerHTML = `
        <span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px;">${data.validCount} Valid</span>
        ${data.warningCount > 0 ? `<span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px;">${data.warningCount} Warnings</span>` : ""}
        ${data.errorCount > 0 ? `<span class="badge" style="background: #fee2e2; color: #991b1b; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 9999px;">${data.errorCount} Errors</span>` : ""}
      `;

      const warningAlert = document.getElementById("excelWarningAlert");
      if (data.warnings && data.warnings.length > 0) {
        warningAlert.style.display = "block";
        warningAlert.innerHTML = `<strong>⚠️ Warnings:</strong><br>${data.warnings.join("<br>")}`;
      } else {
        warningAlert.style.display = "none";
      }

      const errorAlert = document.getElementById("excelErrorAlert");
      if (data.errors && data.errors.length > 0) {
        errorAlert.style.display = "block";
        errorAlert.innerHTML = `<strong>❌ Critical Errors (These rows will be skipped):</strong><br>${data.errors.join("<br>")}`;
      } else {
        errorAlert.style.display = "none";
      }

      const tbody = document.getElementById("excelPreviewTbody");
      tbody.innerHTML = data.previewRows.map((r) => {
        const dateStr = new Date(r.shiftDate).toISOString().split("T")[0];
        const startStr = new Date(r.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const endStr = new Date(r.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const rowClass = r.hasOverlapWarning ? "row-warning" : "row-valid";

        return `
          <tr class="${rowClass}">
            <td>${r.rowNum}</td>
            <td><strong>${r.userName}</strong> <span style="font-size: 0.72rem; color: #64748b;">(${r.userId})</span></td>
            <td>${dateStr}</td>
            <td><span class="badge">${r.shiftType}</span></td>
            <td>${startStr} - ${endStr}</td>
            <td>${r.wardZone}</td>
            <td>${r.hasOverlapWarning ? "⚠️ Overlap Flagged" : "✅ Valid"}</td>
          </tr>
        `;
      }).join("");

      const confirmBtn = document.getElementById("confirmImportBtn");
      if (data.validCount === 0) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "No Valid Rows to Import";
      } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = `✅ Confirm & Import ${data.validCount} Shifts`;
        confirmBtn.onclick = async () => {
          confirmBtn.disabled = true;
          confirmBtn.textContent = "Importing...";
          try {
            await api.commitExcelShifts(data.previewRows);
            modal.style.display = "none";
            alert(`🎉 Success! ${data.validCount} shifts added to schedule.`);
            if (onImported) onImported();
          } catch (err) {
            alert("Import error: " + err.message);
            confirmBtn.disabled = false;
          }
        };
      }
    };
  },

  // 4. Modal for Assign / Edit Shift (Manual)
  async renderShiftModal(shift = null, onSaved) {
    const isEdit = !!shift;
    const modalId = "adminShiftModal";
    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = modalId;
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    // Load active staff directory for user select
    const staffRes = await api.getStaffProfiles();
    const staffList = staffRes.data?.profiles || [];

    const defaultShiftTimes = {
      Morning: { start: "07:00", end: "15:30" },
      Evening: { start: "15:00", end: "23:30" },
      Night: { start: "23:00", end: "07:30" },
      "On-Call": { start: "08:00", end: "08:00" },
    };

    const shiftDateStr = shift
      ? new Date(shift.shiftDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h3>${isEdit ? "✏️ Edit Shift Assignment" : "➕ Assign Clinical Shift"}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('${modalId}').style.display='none'">&times;</button>
        </div>
        <form id="manualShiftForm" style="padding: 1.25rem;">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Staff Member (Doctor / Nurse) *</label>
            <select id="sUser" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required>
              ${staffList.map((p) => {
                const u = p.user;
                const isSelected = shift && (shift.user?._id === u?._id || shift.user === u?._id);
                return `<option value="${u?._id}" ${isSelected ? "selected" : ""}>${u?.name} (${u?.userId}) - ${p.clinicalGrade}</option>`;
              }).join("")}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Shift Date *</label>
              <input type="date" id="sDate" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required value="${shiftDateStr}">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Shift Type *</label>
              <select id="sType" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                <option value="Morning" ${shift && shift.shiftType === "Morning" ? "selected" : ""}>Morning (07:00 - 15:30)</option>
                <option value="Evening" ${shift && shift.shiftType === "Evening" ? "selected" : ""}>Evening (15:00 - 23:30)</option>
                <option value="Night" ${shift && shift.shiftType === "Night" ? "selected" : ""}>Night (23:00 - 07:30)</option>
                <option value="On-Call" ${shift && shift.shiftType === "On-Call" ? "selected" : ""}>On-Call (24 hours)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Ward Zone</label>
              <select id="sWard" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                <option value="General Pediatric Ward">General Pediatric Ward</option>
                <option value="Pediatric HDU">Pediatric HDU</option>
                <option value="Isolation Unit">Isolation Unit</option>
                <option value="Neonatal Nursery">Neonatal Nursery</option>
              </select>
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Duty Role</label>
              <input type="text" id="sDutyRole" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${shift ? shift.dutyRole || "" : ""}" placeholder="e.g. Senior Resident">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Shift Notes / Coverage</label>
            <input type="text" id="sNotes" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${shift ? shift.notes || "" : ""}" placeholder="e.g. Covering beds 1-10 & emergency admissions">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveShiftBtn">${isEdit ? "Update Shift" : "Assign Shift"}</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";

    const form = document.getElementById("manualShiftForm");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("saveShiftBtn");
      saveBtn.disabled = true;

      try {
        const sType = document.getElementById("sType").value;
        const sDate = document.getElementById("sDate").value;
        const defaultTimes = defaultShiftTimes[sType] || defaultShiftTimes.Morning;

        const startIso = new Date(`${sDate}T${defaultTimes.start}:00`).toISOString();
        const endDay = sType === "Night" ? new Date(new Date(sDate).getTime() + 86400000).toISOString().split("T")[0] : sDate;
        const endIso = new Date(`${endDay}T${defaultTimes.end}:00`).toISOString();

        const payload = {
          user: document.getElementById("sUser").value,
          shiftDate: new Date(sDate).toISOString(),
          shiftType: sType,
          startTime: startIso,
          endTime: endIso,
          wardZone: document.getElementById("sWard").value,
          dutyRole: document.getElementById("sDutyRole").value.trim(),
          notes: document.getElementById("sNotes").value.trim(),
        };

        if (isEdit) {
          await api.updateShift(shift._id, payload);
        } else {
          await api.createShift(payload);
        }

        modal.style.display = "none";
        if (onSaved) onSaved();
      } catch (err) {
        alert("Error saving shift: " + err.message);
      } finally {
        saveBtn.disabled = false;
      }
    };
  },
};
