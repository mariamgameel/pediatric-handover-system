/**
 * ManpowerPage Component: Ward Manpower, Safe Staffing Ratios & Clinical Staff Registry
 */
import { api } from "../api.js";
import { state } from "../state.js";

export const ManpowerPage = {
  coverageData: null,
  staffProfiles: [],
  leaves: [],
  searchQuery: "",

  async render(container, params) {
    return this.init(container);
  },

  async init(container) {
    this.container = container;
    this.renderLayout();
    await Promise.all([this.loadCoverage(), this.loadStaffProfiles(), this.loadLeaves()]);
  },

  renderLayout() {
    const isAdmin = state.currentUser && state.currentUser.role === "Admin";

    this.container.innerHTML = `
      <div class="content-wrapper" style="max-width: 1300px; margin: 0 auto; padding: 1.5rem;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a;">Pediatric Ward Manpower & Safe Staffing</h1>
            <p style="color: #64748b; font-size: 0.9rem;">Real-time nurse-to-patient staffing ratios, active on-duty coverage, and clinical staff directory.</p>
          </div>
          <div>
            ${
              isAdmin
                ? `<button class="btn btn-primary" id="addStaffProfileBtn">➕ Register Staff Member</button>`
                : ""
            }
          </div>
        </div>

        <!-- Safe Staffing Ratio Engine Banner -->
        <div id="coverageMetricsMount">
          <div style="text-align: center; padding: 1.5rem; background: var(--surface); border-radius: 8px;">
            <p>Calculating live ward staffing ratios...</p>
          </div>
        </div>

        <!-- Live On-Duty Team Bar -->
        <div id="onDutyTeamMount" style="margin-bottom: 2rem;"></div>

        <!-- Staff Registry Toolbar & Search -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a;">Clinical Staff Directory & Bleep Registry</h2>
          <div>
            <input type="text" id="staffSearchInput" placeholder="Search by name, bleep, or subspecialty..." class="form-control" style="padding: 0.45rem 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; min-width: 280px;">
          </div>
        </div>

        <!-- Staff Directory Table -->
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;" id="staffTable">
              <thead>
                <tr style="background: #f1f5f9; text-align: left; color: #475569; font-weight: 700;">
                  <th style="padding: 0.75rem 1rem;">Code</th>
                  <th style="padding: 0.75rem 1rem;">Staff Name</th>
                  <th style="padding: 0.75rem 1rem;">Clinical Grade</th>
                  <th style="padding: 0.75rem 1rem;">Subspecialty</th>
                  <th style="padding: 0.75rem 1rem;">Bleep / Pager</th>
                  <th style="padding: 0.75rem 1rem;">Extension</th>
                  <th style="padding: 0.75rem 1rem;">Certifications</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Status</th>
                </tr>
              </thead>
              <tbody id="staffTbody">
                <tr><td colspan="8" style="text-align: center; padding: 2rem;">Loading staff directory...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Leave Requests Section -->
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Staff Leave & Absence Management</h3>
            <button class="btn btn-outline btn-sm" id="requestLeaveBtn">+ Request Leave</button>
          </div>
          <div id="leavesContainer" style="padding: 1.25rem;">
            <p style="color: #64748b; font-size: 0.85rem;">No active leave requests.</p>
          </div>
        </div>
      </div>
    `;

    if (isAdmin) {
      document.getElementById("addStaffProfileBtn").onclick = () => {
        this.showStaffProfileModal(null);
      };
    }

    document.getElementById("requestLeaveBtn").onclick = () => {
      this.showLeaveRequestModal();
    };

    document.getElementById("staffSearchInput").oninput = (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderStaffTable();
    };
  },

  async loadCoverage() {
    try {
      const res = await api.getLiveCoverage();
      this.coverageData = res.data;
      this.renderCoverage();
    } catch (err) {
      console.warn("Could not load live coverage:", err);
    }
  },

  async loadStaffProfiles() {
    try {
      const res = await api.getStaffProfiles();
      this.staffProfiles = res.data?.profiles || [];
      this.renderStaffTable();
    } catch (err) {
      document.getElementById("staffTbody").innerHTML = `
        <tr><td colspan="8" style="color: #dc2626; text-align: center; padding: 2rem;">Failed to load staff profiles: ${err.message}</td></tr>
      `;
    }
  },

  async loadLeaves() {
    try {
      const res = await api.getLeaves();
      this.leaves = res.data?.leaves || [];
      this.renderLeaves();
    } catch (err) {
      console.warn("Could not load leaves:", err);
    }
  },

  renderCoverage() {
    const mount = document.getElementById("coverageMetricsMount");
    const onDutyMount = document.getElementById("onDutyTeamMount");
    if (!mount || !this.coverageData) return;

    const { wardCensus, coverageCounts, staffingRatios, onDutyStaff } = this.coverageData;
    const isSafe = staffingRatios.isSafe;

    mount.innerHTML = `
      <div class="ratio-banner-grid">
        <div class="ratio-metric-card ${isSafe ? "safe" : "critical"}">
          <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Nurse-to-Patient Ratio</span>
          <div class="ratio-num">${staffingRatios.nurseToPatient}</div>
          <span style="font-size: 0.78rem; font-weight: 700; margin-top: 0.35rem; color: ${isSafe ? "#16a34a" : "#dc2626"};">
            ${staffingRatios.nurseRatioStatus}
          </span>
        </div>

        <div class="ratio-metric-card safe">
          <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Doctor Coverage Ratio</span>
          <div class="ratio-num">${staffingRatios.doctorToPatient}</div>
          <span style="font-size: 0.78rem; font-weight: 700; margin-top: 0.35rem; color: #2563eb;">
            ${coverageCounts.totalDoctors} Active Doctors on Ward
          </span>
        </div>

        <div class="ratio-metric-card safe">
          <span style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Active Ward Census</span>
          <div class="ratio-num">${wardCensus.totalActivePatients} <span style="font-size: 0.9rem; font-weight: 600; color: #64748b;">Inpatients</span></div>
          <span style="font-size: 0.78rem; font-weight: 700; margin-top: 0.35rem; color: #d97706;">
            ${wardCensus.criticalPatients} Critical / Close Monitoring
          </span>
        </div>
      </div>
    `;

    // Render live on-duty staff bar
    const allStaffOnDuty = [
      ...(onDutyStaff.consultants || []),
      ...(onDutyStaff.specialists || []),
      ...(onDutyStaff.residents || []),
      ...(onDutyStaff.nurses || []),
    ];

    if (onDutyStaff && allStaffOnDuty.length > 0) {
      onDutyMount.innerHTML = `
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem 1.25rem;">
          <h4 style="font-size: 0.9rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem;">
            🟢 Clinicians Currently On Active Duty (${allStaffOnDuty.length} on-shift):
          </h4>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            ${allStaffOnDuty.map((s) => `
              <div style="display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.4rem 0.75rem; border-radius: 6px;">
                <span style="font-weight: 700; font-size: 0.85rem;">${s.name}</span>
                <span class="badge" style="font-size: 0.7rem; background: #e0f2fe; color: #0369a1;">${s.dutyRole}</span>
                <span class="bleep-pill" title="Click to copy bleep" onclick="navigator.clipboard.writeText('${s.bleepNumber}'); alert('Copied bleep ${s.bleepNumber}');">
                  📟 ${s.bleepNumber}
                </span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }
  },

  renderStaffTable() {
    const tbody = document.getElementById("staffTbody");
    if (!tbody) return;

    let filtered = this.staffProfiles;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.user?.name?.toLowerCase().includes(q) ||
          p.staffCode?.toLowerCase().includes(q) ||
          p.bleepNumber?.toLowerCase().includes(q) ||
          p.pediatricSubspecialty?.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b;">No staff members matched your search.</td></tr>
      `;
      return;
    }

    const isAdmin = state.currentUser?.role === "Admin";

    tbody.innerHTML = filtered.map((p) => {
      const certBadges = (p.certifications || []).map((c) => {
        const isExpiringSoon = new Date(c.validUntil) < new Date(Date.now() + 90 * 86400000);
        return `<span class="badge" style="font-size: 0.7rem; ${isExpiringSoon ? "background: #fef3c7; color: #92400e;" : "background: #dcfce7; color: #166534;"}">${c.name}</span>`;
      }).join(" ");

      return `
        <tr style="border-bottom: 1px solid var(--border-light);">
          <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 700; color: #0284c7;">${p.staffCode}</td>
          <td style="padding: 0.75rem 1rem;">
            <strong>${p.user?.name || "Staff Member"}</strong>
            <div style="font-size: 0.72rem; color: #64748b;">${p.user?.email || ""}</div>
          </td>
          <td style="padding: 0.75rem 1rem;"><span class="badge" style="background: #f1f5f9;">${p.clinicalGrade.replace(/_/g, " ")}</span></td>
          <td style="padding: 0.75rem 1rem;">${p.pediatricSubspecialty || "General Pediatrics"}</td>
          <td style="padding: 0.75rem 1rem;">
            ${p.bleepNumber ? `<span class="bleep-pill" onclick="navigator.clipboard.writeText('${p.bleepNumber}'); alert('Copied ${p.bleepNumber}');">📟 ${p.bleepNumber}</span>` : "-"}
          </td>
          <td style="padding: 0.75rem 1rem; font-family: monospace;">${p.phoneExtension || "-"}</td>
          <td style="padding: 0.75rem 1rem;">${certBadges || '<span style="color: #94a3b8; font-size: 0.75rem;">None</span>'}</td>
          <td style="padding: 0.75rem 1rem; text-align: right;">
            <div style="display: flex; gap: 0.35rem; justify-content: flex-end; align-items: center;">
              <span class="badge" style="background: #dcfce7; color: #166534;">${p.activeStatus}</span>
              ${
                isAdmin
                  ? `
                  <button class="action-icon-btn" title="Edit Profile" onclick="window._editStaff('${p._id}')">✏️</button>
                  <button class="action-icon-btn" title="Delete Profile" style="color: #dc2626;" onclick="window._deleteStaff('${p._id}')">🗑️</button>
                `
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    }).join("");

    window._editStaff = (id) => {
      const p = this.staffProfiles.find((item) => item._id === id);
      if (p) this.showStaffProfileModal(p);
    };

    window._deleteStaff = async (id) => {
      if (!confirm("Are you sure you want to remove this staff profile?")) return;
      try {
        await api.deleteStaffProfile(id);
        await this.loadStaffProfiles();
      } catch (err) {
        alert("Error deleting staff profile: " + err.message);
      }
    };
  },

  renderLeaves() {
    const container = document.getElementById("leavesContainer");
    if (!container) return;

    if (this.leaves.length === 0) {
      container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem;">No active leave requests.</p>`;
      return;
    }

    const isAdmin = state.currentUser?.role === "Admin";

    container.innerHTML = `
      <div style="display: grid; gap: 0.75rem;">
        ${this.leaves.map((l) => {
          const start = new Date(l.startDate).toLocaleDateString();
          const end = new Date(l.endDate).toLocaleDateString();
          return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <strong>${l.user?.name}</strong>: <span class="badge" style="background: #e0f2fe; color: #0369a1;">${l.leaveType}</span>
                <span style="font-size: 0.8rem; color: #475569; margin-left: 0.5rem;">${start} to ${end}</span>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">
                  Status: <strong>${l.status}</strong> ${l.notes ? `| Note: "${l.notes}"` : ""}
                </div>
              </div>
              ${
                isAdmin && l.status === "Pending"
                  ? `
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="window._reviewLeave('${l._id}', 'Approved')">Approve</button>
                    <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="window._reviewLeave('${l._id}', 'Rejected')">Reject</button>
                  </div>
                `
                  : ""
              }
            </div>
          `;
        }).join("")}
      </div>
    `;

    window._reviewLeave = async (id, status) => {
      try {
        await api.reviewLeave(id, { status });
        await this.loadLeaves();
        alert(`Leave request ${status.toLowerCase()}!`);
      } catch (err) {
        alert("Error reviewing leave: " + err.message);
      }
    };
  },

  async showStaffProfileModal(profile = null) {
    const isEdit = !!profile;
    let modal = document.getElementById("staffProfileModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "staffProfileModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    // Load users to select
    const usersRes = await api.request("/api/users");
    const users = usersRes.data?.users || [];

    const grades = [
      "Consultant",
      "Associate_Specialist",
      "Senior_Registrar",
      "Resident_PGY3",
      "Resident_PGY1_2",
      "Nurse_Supervisor",
      "Staff_Nurse",
      "Clinical_Pharmacist",
    ];

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 650px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>${isEdit ? "✏️ Edit Staff Profile" : "➕ Register New Staff Member"}</h3>
          <button class="modal-close-btn" onclick="document.getElementById('staffProfileModal').style.display='none'">&times;</button>
        </div>
        <form id="staffProfileForm" style="padding: 1.25rem;">
          ${
            !isEdit
              ? `
              <div class="form-group" style="margin-bottom: 1rem;">
                <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Link to User Account *</label>
                <select id="spUserId" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required>
                  ${users.map((u) => `<option value="${u._id}">${u.name} (${u.userId}) - ${u.role}</option>`).join("")}
                </select>
              </div>
            `
              : ""
          }

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Staff Code *</label>
              <input type="text" id="spCode" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required value="${profile ? profile.staffCode : "PED-STF-"}" placeholder="PED-STF-042">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Clinical Grade *</label>
              <select id="spGrade" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                ${grades.map((g) => `<option value="${g}" ${profile && profile.clinicalGrade === g ? "selected" : ""}>${g.replace(/_/g, " ")}</option>`).join("")}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Bleep / Pager Number</label>
              <input type="text" id="spBleep" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${profile ? profile.bleepNumber || "" : ""}" placeholder="e.g. #2001">
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Speed-Dial Extension</label>
              <input type="text" id="spExt" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${profile ? profile.phoneExtension || "" : ""}" placeholder="Ext. 4501">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Pediatric Subspecialty</label>
            <input type="text" id="spSub" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" value="${profile ? profile.pediatricSubspecialty || "" : ""}" placeholder="e.g. Pediatric Pulmonology & PICU">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('staffProfileModal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveStaffBtn">${isEdit ? "Update Profile" : "Register Staff"}</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";

    document.getElementById("staffProfileForm").onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById("saveStaffBtn");
      saveBtn.disabled = true;

      try {
        const payload = {
          staffCode: document.getElementById("spCode").value.trim().toUpperCase(),
          clinicalGrade: document.getElementById("spGrade").value,
          bleepNumber: document.getElementById("spBleep").value.trim(),
          phoneExtension: document.getElementById("spExt").value.trim(),
          pediatricSubspecialty: document.getElementById("spSub").value.trim(),
        };

        if (isEdit) {
          await api.updateStaffProfile(profile._id, payload);
        } else {
          payload.user = document.getElementById("spUserId").value;
          await api.createStaffProfile(payload);
        }

        modal.style.display = "none";
        alert("Staff profile saved successfully!");
        await this.loadStaffProfiles();
      } catch (err) {
        alert("Error saving staff profile: " + err.message);
      } finally {
        saveBtn.disabled = false;
      }
    };
  },

  showLeaveRequestModal() {
    let modal = document.getElementById("leaveReqModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "leaveReqModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h3>Request Staff Leave</h3>
          <button class="modal-close-btn" onclick="document.getElementById('leaveReqModal').style.display='none'">&times;</button>
        </div>
        <form id="leaveReqForm" style="padding: 1.25rem;">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Leave Type *</label>
            <select id="leaveType" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
              <option value="Annual">Annual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Study_Academic">Study / Academic Leave</option>
              <option value="Compassionate">Compassionate</option>
              <option value="Compensatory_Rest">Compensatory Rest</option>
            </select>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Start Date *</label>
              <input type="date" id="leaveStart" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required>
            </div>
            <div>
              <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">End Date *</label>
              <input type="date" id="leaveEnd" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Notes</label>
            <textarea id="leaveNotes" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px; min-height: 60px;" placeholder="Covering arrangements or reason..."></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('leaveReqModal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submitLeaveBtn">Submit Request</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";

    document.getElementById("leaveReqForm").onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById("submitLeaveBtn");
      btn.disabled = true;

      try {
        await api.requestLeave({
          leaveType: document.getElementById("leaveType").value,
          startDate: document.getElementById("leaveStart").value,
          endDate: document.getElementById("leaveEnd").value,
          notes: document.getElementById("leaveNotes").value.trim(),
        });

        modal.style.display = "none";
        alert("Leave request submitted for review!");
        await this.loadLeaves();
      } catch (err) {
        alert("Error requesting leave: " + err.message);
      } finally {
        btn.disabled = false;
      }
    };
  },
};
