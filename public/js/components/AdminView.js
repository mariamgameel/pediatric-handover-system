/**
 * Admin Console Component: User Management, Shift Schedules & Audit Logs
 */

export const AdminView = {
  renderUsers(users) {
    const tbody = document.getElementById("adminUsersTableBody");
    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim);">No staff users found.</td></tr>`;
      return;
    }

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
            <button class="btn btn-outline btn-sm" onclick="app.adminChangeUserRole('${u._id || u.id}', '${u.role}')">Role</button>
            <button class="btn btn-outline btn-sm" onclick="app.adminToggleUserStatus('${u._id || u.id}', '${u.status}')">${u.status === "Active" ? "Deactivate" : "Activate"}</button>
            <button class="btn btn-outline btn-sm" onclick="app.adminGrantShiftOverride('${u._id || u.id}')">Override Shift</button>
          </div>
        </td>
      </tr>
    `).join("");
  },

  renderShifts(shifts, users) {
    const tbody = document.getElementById("adminShiftsTableBody");
    if (!shifts || shifts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No scheduled shifts.</td></tr>`;
      return;
    }

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

    // Populate user select in assign shift modal
    const sel = document.getElementById("shiftUserSelect");
    if (sel && users) {
      sel.innerHTML = users.map((u) => `<option value="${u._id || u.id}">${u.name} (${u.userId} - ${u.role})</option>`).join("");
    }
  },

  renderAuditLogs(logs) {
    const tbody = document.getElementById("adminAuditTableBody");
    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No audit logs recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((l) => `
      <tr>
        <td>${new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td style="font-weight: 700;">${l.userName} (${l.userId})</td>
        <td><span class="badge-status status-Stable">${l.action}</span></td>
        <td>${l.entity}</td>
        <td>${l.details || "--"}</td>
        <td style="font-family: monospace; font-size: 0.75rem;">${l.ipAddress || "Internal"}</td>
      </tr>
    `).join("");
  },
};
