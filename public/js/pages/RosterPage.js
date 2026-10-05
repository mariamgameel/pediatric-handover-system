/**
 * RosterPage Component: Multi-Tier Ward Shift Roster, Automated Excel Import & Swap Management
 */
import { api } from "../api.js";
import { state } from "../state.js";
import { AdminModals } from "../components/AdminModals.js";

export const RosterPage = {
  shifts: [],
  swaps: [],
  selectedDate: "",
  selectedWard: "",

  async render(container, params) {
    return this.init(container);
  },

  async init(container) {
    this.container = container;
    this.renderLayout();
    await Promise.all([this.loadRoster(), this.loadSwaps()]);
  },

  renderLayout() {
    const isAdmin = state.currentUser && state.currentUser.role === "Admin";

    this.container.innerHTML = `
      <div class="content-wrapper" style="max-width: 1300px; margin: 0 auto; padding: 1.5rem;">
        <!-- Header & Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a;">Pediatric Ward Shift Roster & Rostering</h1>
            <p style="color: #64748b; font-size: 0.9rem;">Multi-tier duty coverage: Consultants on-call, Attendings, Residents, and Ward In-charge Nurses.</p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${
              isAdmin
                ? `
                <button class="btn btn-outline" id="rosterExcelImportBtn">📥 Import Shifts (Excel)</button>
                <button class="btn btn-primary" id="rosterAssignShiftBtn">➕ Assign Shift</button>
              `
                : ""
            }
          </div>
        </div>

        <!-- Filter Toolbar -->
        <div style="background: var(--surface); border: 1px solid var(--border-light); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
            <div>
              <label style="font-size: 0.8rem; font-weight: 700; color: #64748b; display: block; margin-bottom: 0.2rem;">Date Filter:</label>
              <input type="date" id="rosterDateFilter" class="form-control" style="padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: 700; color: #64748b; display: block; margin-bottom: 0.2rem;">Ward Zone:</label>
              <select id="rosterWardFilter" class="form-control" style="padding: 0.4rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;">
                <option value="">All Ward Zones</option>
                <option value="General Pediatric Ward">General Pediatric Ward</option>
                <option value="Pediatric HDU">Pediatric HDU</option>
                <option value="Isolation Unit">Isolation Unit</option>
                <option value="Neonatal Nursery">Neonatal Nursery</option>
              </select>
            </div>
            <button class="btn btn-outline btn-sm" id="clearRosterFiltersBtn" style="margin-top: 1.25rem;">Clear Filters</button>
          </div>

          <div>
            <button class="btn btn-outline btn-sm" id="refreshRosterBtn">🔄 Refresh Roster</button>
          </div>
        </div>

        <!-- Shift Roster Table -->
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Scheduled Ward Shifts</h3>
            <span id="rosterCountBadge" class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">0 Shifts</span>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;" id="rosterTable">
              <thead>
                <tr style="background: #f1f5f9; text-align: left; color: #475569; font-weight: 700;">
                  <th style="padding: 0.75rem 1rem;">Date</th>
                  <th style="padding: 0.75rem 1rem;">Shift</th>
                  <th style="padding: 0.75rem 1rem;">Clinician / Staff Member</th>
                  <th style="padding: 0.75rem 1rem;">Duty Role</th>
                  <th style="padding: 0.75rem 1rem;">Ward Zone</th>
                  <th style="padding: 0.75rem 1rem;">Time Window</th>
                  <th style="padding: 0.75rem 1rem;">Attendance</th>
                  <th style="padding: 0.75rem 1rem; text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="rosterTbody">
                <tr><td colspan="8" style="text-align: center; padding: 2.5rem;">Loading shift schedule...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Shift Swap Requests Panel -->
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm);">
          <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-light); background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">Doctor Shift Swap Requests</h3>
            <span id="swapsCountBadge" class="badge" style="background: #fef3c7; color: #92400e; font-weight: 700;">0 Requests</span>
          </div>
          <div id="swapsContainer" style="padding: 1.25rem;">
            <p style="color: #64748b; font-size: 0.85rem;">No active swap requests.</p>
          </div>
        </div>
      </div>
    `;

    // Event handlers
    if (isAdmin) {
      document.getElementById("rosterExcelImportBtn").onclick = () => {
        AdminModals.renderExcelUploadModal(() => this.loadRoster());
      };
      document.getElementById("rosterAssignShiftBtn").onclick = () => {
        AdminModals.renderShiftModal(null, () => this.loadRoster());
      };
    }

    document.getElementById("rosterDateFilter").onchange = (e) => {
      this.selectedDate = e.target.value;
      this.loadRoster();
    };

    document.getElementById("rosterWardFilter").onchange = (e) => {
      this.selectedWard = e.target.value;
      this.loadRoster();
    };

    document.getElementById("clearRosterFiltersBtn").onclick = () => {
      document.getElementById("rosterDateFilter").value = "";
      document.getElementById("rosterWardFilter").value = "";
      this.selectedDate = "";
      this.selectedWard = "";
      this.loadRoster();
    };

    document.getElementById("refreshRosterBtn").onclick = () => {
      this.loadRoster();
      this.loadSwaps();
    };
  },

  async loadRoster() {
    try {
      const params = {};
      if (this.selectedDate) params.date = this.selectedDate;
      if (this.selectedWard) params.wardZone = this.selectedWard;

      const res = await api.getRoster(params);
      this.shifts = res.data?.shifts || [];
      this.renderRosterTable();
    } catch (err) {
      document.getElementById("rosterTbody").innerHTML = `
        <tr><td colspan="8" style="color: #dc2626; text-align: center; padding: 2rem;">Failed to load roster: ${err.message}</td></tr>
      `;
    }
  },

  async loadSwaps() {
    try {
      const res = await api.getShiftSwaps();
      this.swaps = res.data?.swaps || [];
      this.renderSwaps();
    } catch (err) {
      console.warn("Could not load swaps:", err);
    }
  },

  renderRosterTable() {
    const tbody = document.getElementById("rosterTbody");
    const countBadge = document.getElementById("rosterCountBadge");
    if (!tbody) return;

    countBadge.textContent = `${this.shifts.length} Shifts`;

    if (this.shifts.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; padding: 3rem; color: #64748b;">No scheduled shifts found matching the current filters.</td></tr>
      `;
      return;
    }

    const currentUserId = state.currentUser?._id || state.currentUser?.id;
    const isAdmin = state.currentUser?.role === "Admin";

    tbody.innerHTML = this.shifts.map((s) => {
      const dateStr = new Date(s.shiftDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const startStr = new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const endStr = new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const isMyShift = String(s.user?._id) === String(currentUserId);

      let shiftBadge = "background: #e0f2fe; color: #0369a1;";
      if (s.shiftType === "Night") shiftBadge = "background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1;";
      else if (s.shiftType === "Evening") shiftBadge = "background: #fef3c7; color: #92400e;";
      else if (s.shiftType === "On-Call") shiftBadge = "background: #fee2e2; color: #b91c1c;";

      return `
        <tr style="border-bottom: 1px solid var(--border-light); ${isMyShift ? "background: #f0fdf4;" : ""}">
          <td style="padding: 0.75rem 1rem; font-weight: 700;">${dateStr}</td>
          <td style="padding: 0.75rem 1rem;">
            <span class="badge" style="padding: 0.2rem 0.55rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; ${shiftBadge}">${s.shiftType}</span>
          </td>
          <td style="padding: 0.75rem 1rem;">
            <strong>${s.user?.name || "Unassigned"}</strong>
            <div style="font-size: 0.75rem; color: #64748b;">ID: ${s.user?.userId || "N/A"} (${s.user?.role || "Staff"})</div>
          </td>
          <td style="padding: 0.75rem 1rem;">${s.dutyRole || s.user?.role || "Ward Doctor"}</td>
          <td style="padding: 0.75rem 1rem;"><span class="badge" style="background: #f1f5f9;">${s.wardZone || "General Ward"}</span></td>
          <td style="padding: 0.75rem 1rem; font-family: monospace;">${startStr} - ${endStr}</td>
          <td style="padding: 0.75rem 1rem;">
            ${
              s.checkInTime
                ? `<span style="color: #16a34a; font-weight: 700; font-size: 0.75rem;">✓ In at ${new Date(s.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>`
                : `<span style="color: #94a3b8; font-size: 0.75rem;">Not checked in</span>`
            }
          </td>
          <td style="padding: 0.75rem 1rem; text-align: right;">
            <div style="display: flex; gap: 0.4rem; justify-content: flex-end; align-items: center;">
              ${
                isMyShift && !s.checkInTime
                  ? `<button class="btn btn-primary btn-sm" onclick="window._checkInShift('${s._id}')">Check In</button>`
                  : ""
              }
              ${
                isMyShift && s.checkInTime && s.status !== "Completed"
                  ? `<button class="btn btn-outline btn-sm" onclick="window._checkOutShift('${s._id}')">Handover Signoff</button>`
                  : ""
              }
              ${
                isMyShift
                  ? `<button class="btn btn-outline btn-sm" onclick="window._openSwapModal('${s._id}')">Request Swap</button>`
                  : ""
              }
              ${
                isAdmin
                  ? `
                  <button class="action-icon-btn" title="Edit Shift" onclick="window._editShift('${s._id}')">✏️</button>
                  <button class="action-icon-btn" title="Cancel/Delete Shift" style="color: #dc2626;" onclick="window._deleteShift('${s._id}')">🗑️</button>
                `
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Global action helpers
    window._checkInShift = async (id) => {
      try {
        await api.checkInShift(id);
        await this.loadRoster();
        alert("Checked in successfully!");
      } catch (err) {
        alert("Check-in error: " + err.message);
      }
    };

    window._checkOutShift = async (id) => {
      if (!confirm("Confirm end of shift and handover signoff?")) return;
      try {
        await api.checkOutShift(id);
        await this.loadRoster();
        alert("Shift completed. Thank you for safe handover!");
      } catch (err) {
        alert("Check-out error: " + err.message);
      }
    };

    window._editShift = (id) => {
      const s = this.shifts.find((item) => item._id === id);
      if (s) AdminModals.renderShiftModal(s, () => this.loadRoster());
    };

    window._deleteShift = async (id) => {
      if (!confirm("Are you sure you want to cancel and delete this shift?")) return;
      try {
        await api.deleteShift(id);
        await this.loadRoster();
      } catch (err) {
        alert("Error deleting shift: " + err.message);
      }
    };

    window._openSwapModal = (shiftId) => {
      this.showSwapRequestModal(shiftId);
    };
  },

  renderSwaps() {
    const container = document.getElementById("swapsContainer");
    const badge = document.getElementById("swapsCountBadge");
    if (!container) return;

    badge.textContent = `${this.swaps.length} Requests`;

    if (this.swaps.length === 0) {
      container.innerHTML = `<p style="color: #64748b; font-size: 0.85rem;">No active shift swap requests.</p>`;
      return;
    }

    const isAdmin = state.currentUser?.role === "Admin";

    container.innerHTML = `
      <div style="display: grid; gap: 0.75rem;">
        ${this.swaps.map((sw) => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <strong>${sw.requestingUser?.name}</strong> wants to swap shift with <strong>${sw.targetUser?.name}</strong>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.2rem;">
                Reason: "${sw.reason}" | Status: <span class="badge" style="background: #fef3c7; color: #92400e;">${sw.status}</span>
              </div>
            </div>
            ${
              isAdmin && sw.status === "Pending_Approval"
                ? `
                <div style="display: flex; gap: 0.5rem;">
                  <button class="btn btn-primary btn-sm" onclick="window._reviewSwap('${sw._id}', 'Approved')">Approve Swap</button>
                  <button class="btn btn-outline btn-sm" style="color: #dc2626;" onclick="window._reviewSwap('${sw._id}', 'Rejected')">Reject</button>
                </div>
              `
                : ""
            }
          </div>
        `).join("")}
      </div>
    `;

    window._reviewSwap = async (id, status) => {
      try {
        await api.reviewShiftSwap(id, { status });
        await this.loadRoster();
        await this.loadSwaps();
        alert(`Shift swap ${status.toLowerCase()}!`);
      } catch (err) {
        alert("Error reviewing swap: " + err.message);
      }
    };
  },

  async showSwapRequestModal(shiftId) {
    let modal = document.getElementById("swapRequestModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "swapRequestModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    // Load staff to pick colleague
    const staffRes = await api.getStaffProfiles();
    const colleagues = (staffRes.data?.profiles || []).filter(
      (p) => String(p.user?._id) !== String(state.currentUser?._id || state.currentUser?.id)
    );

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h3>Request Shift Swap</h3>
          <button class="modal-close-btn" onclick="document.getElementById('swapRequestModal').style.display='none'">&times;</button>
        </div>
        <form id="swapReqForm" style="padding: 1.25rem;">
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Select Colleague to Swap With *</label>
            <select id="swapTargetUser" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px;" required>
              ${colleagues.map((p) => `<option value="${p.user?._id}">${p.user?.name} (${p.user?.userId}) - ${p.clinicalGrade}</option>`).join("")}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.35rem;">Reason for Swap Request *</label>
            <textarea id="swapReason" class="form-control" style="width: 100%; padding: 0.6rem; border: 1px solid #cbd5e1; border-radius: 4px; min-height: 70px;" required placeholder="e.g. Academic conference attendance, emergency personal leave..."></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('swapRequestModal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="submitSwapBtn">Submit Swap Request</button>
          </div>
        </form>
      </div>
    `;

    modal.style.display = "flex";

    document.getElementById("swapReqForm").onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById("submitSwapBtn");
      btn.disabled = true;

      try {
        await api.requestShiftSwap({
          originalShiftId: shiftId,
          targetUserId: document.getElementById("swapTargetUser").value,
          reason: document.getElementById("swapReason").value.trim(),
        });
        modal.style.display = "none";
        alert("Shift swap request sent for administrative review!");
        await this.loadSwaps();
      } catch (err) {
        alert("Error requesting swap: " + err.message);
      } finally {
        btn.disabled = false;
      }
    };
  },
};
