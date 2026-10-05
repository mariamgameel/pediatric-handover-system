/**
 * Department Administration Page
 */

import { api } from "../api.js";
import { AdminView } from "../components/AdminView.js";

export const AdminPage = {
  async render(container) {
    container.innerHTML = `
      <section id="adminView" style="display: block;">
        <div class="toolbar">
          <h3 style="font-size: 1.1rem; font-weight: 800;">Hospital Department Administration</h3>
        </div>

        <div class="tabs-nav" style="margin-bottom: 1rem;">
          <button class="tab-btn active" data-admintab="users" onclick="app.switchAdminTab('users')">Staff &amp; User Accounts</button>
          <button class="tab-btn" data-admintab="shifts" onclick="app.switchAdminTab('shifts')">Shift Roster &amp; Access Controls</button>
          <button class="tab-btn" data-admintab="audit" onclick="app.switchAdminTab('audit')">Immutable Audit Trail</button>
        </div>

        <!-- Admin Tab 1: Staff Users -->
        <div id="adminTabUsers">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <p style="font-size: 0.82rem; color: var(--text-dim);">Only Admin can create user accounts, assign unique Staff IDs, and modify clinician roles/permissions.</p>
            <button class="btn btn-primary btn-sm" onclick="app.showModal('createUserModal')">Create Staff Account</button>
          </div>
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Roster Policy</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="adminUsersTableBody">
                <!-- Rendered Staff Rows -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Admin Tab 2: Shifts -->
        <div id="adminTabShifts" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <p style="font-size: 0.82rem; color: var(--text-dim);">Staff can only access patient charts during active shifts ± 45-minute handover buffer.</p>
            <button class="btn btn-primary btn-sm" onclick="app.showModal('assignShiftModal')">Assign Staff Shift</button>
          </div>
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Shift Type</th>
                  <th>Shift Start</th>
                  <th>Shift End</th>
                  <th>Buffer</th>
                  <th>Status</th>
                  <th>Assigned By</th>
                </tr>
              </thead>
              <tbody id="adminShiftsTableBody">
                <!-- Rendered Shifts -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Admin Tab 3: Audit Trail -->
        <div id="adminTabAudit" style="display: none;">
          <div style="margin-bottom: 0.75rem;">
            <p style="font-size: 0.82rem; color: var(--text-dim);">Immutable chronological audit trail of all patient views, status modifications, and management plan approvals.</p>
          </div>
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Clinician</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody id="adminAuditTableBody">
                <!-- Rendered Audit Trail -->
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  },

  async afterRender() {
    try {
      const res = await api.request("/api/users");
      AdminView.renderUsers(res.data.users);
    } catch (err) {
      console.error("Failed to load admin users:", err.message);
    }
  },
};
