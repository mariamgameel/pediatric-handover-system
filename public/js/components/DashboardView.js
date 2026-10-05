/**
 * Dashboard View Component: Ward Census, Critical Shelf, Lab Results & Tasks
 */

export const DashboardView = {
  render(data) {
    const {
      patientCounts,
      criticalPatients,
      importantPendingResults,
      myPendingTasks,
      overdueTasks,
    } = data;

    // Numerical Counters
    document.getElementById("countCritical").textContent = patientCounts.critical;
    document.getElementById("countCloseMonitoring").textContent = patientCounts.closeMonitoring;
    document.getElementById("countStable").textContent = patientCounts.stable;
    document.getElementById("countTotalActive").textContent = patientCounts.totalActive;

    // Shelf Badges
    document.getElementById("criticalShelfBadge").textContent = `${criticalPatients.length} Critical`;
    document.getElementById("pendingResultsBadge").textContent = `${importantPendingResults.length} Pending`;
    document.getElementById("myTasksBadge").textContent = `${myPendingTasks.length} Active`;
    document.getElementById("overdueTasksBadge").textContent = `${overdueTasks.length} Overdue`;

    // 1. Critical Patients Shelf
    const critContainer = document.getElementById("criticalPatientsList");
    if (!criticalPatients || criticalPatients.length === 0) {
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

    // 2. Pending Results Shelf
    const resContainer = document.getElementById("pendingResultsList");
    if (!importantPendingResults || importantPendingResults.length === 0) {
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

    // 3. My Pending Tasks Shelf
    const myTaskContainer = document.getElementById("myTasksList");
    if (!myPendingTasks || myPendingTasks.length === 0) {
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

    // 4. Overdue Ward Tasks Shelf
    const overdueContainer = document.getElementById("overdueTasksList");
    if (!overdueTasks || overdueTasks.length === 0) {
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
  },
};
