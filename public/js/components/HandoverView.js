/**
 * Shift Handover Component: Ward Handover Sheet, Clinical Snapshots & Digital Sign-off
 */

export const HandoverView = {
  renderWardSheet(handovers) {
    const container = document.getElementById("wardHandoverCards");
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
                Diagnosis: <strong>${p.mainDiagnosis}</strong> | Allergies: <strong style="color: var(--critical);">${p.allergies ? p.allergies.join(", ") : "NKDA"}</strong>
              </div>
            </div>

            <div style="text-align: right;">
              <span class="badge-status ${isVerbalRequired ? "status-Critical" : "status-Stable"}" style="font-size: 0.8rem; padding: 0.35rem 0.65rem;">
                ${h.recommendedStatus}
              </span>
              <div style="margin-top: 0.5rem;">
                <button class="btn btn-primary btn-sm" onclick="app.submitShiftHandover('${p.id || p._id}', '${h.recommendedStatus}')">Sign Shift Handover</button>
                <button class="btn btn-outline btn-sm" onclick="app.openPatientProfile('${p.id || p._id}')">Open Workspace</button>
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
  },
};
