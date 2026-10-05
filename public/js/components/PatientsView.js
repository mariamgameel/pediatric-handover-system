/**
 * Patients Directory View Component: Directory Grid, Search, & Patient Cards
 */

export const PatientsView = {
  renderGrid(patients) {
    const grid = document.getElementById("patientsGrid");
    if (!patients || patients.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-dim);">No patients matching your criteria.</div>`;
      return;
    }

    grid.innerHTML = patients.map((p) => {
      const borderClass = p.status === "Critical" 
        ? "border-critical" 
        : p.status === "Close Monitoring" 
        ? "border-close-monitoring" 
        : "border-stable";

      const ageText = p.age.years > 0 
        ? `${p.age.years}y ${p.age.months}m` 
        : `${p.age.months}m ${p.age.days}d`;

      const doctorName = p.lastUpdatedBy 
        ? `${p.lastUpdatedBy.name} (${p.lastUpdatedBy.userId})` 
        : (p.responsibleDoctor ? `${p.responsibleDoctor.name} (${p.responsibleDoctor.userId})` : "Unassigned");

      return `
        <div class="patient-card ${borderClass}" onclick="app.openPatientProfile('${p._id}')">
          <div class="card-header-flex">
            <div>
              <span class="card-bed">${p.bedNumber}</span>
              <div class="card-name">${p.name}</div>
            </div>
            <span class="badge-status status-${p.status.replace(/\s+/g, '-')}">${p.status}</span>
          </div>
          <div class="card-meta">
            Age: ${ageText} | Wt: ${p.weight} kg | File: ${p.fileNumber}
          </div>
          <div class="card-diagnosis">
            ${p.mainDiagnosis}
          </div>
          ${p.status === "Critical" && p.statusReason ? `
            <div style="font-size: 0.72rem; color: var(--critical); font-weight: 700; margin-bottom: 0.5rem;">
              Critical: ${p.statusReason}
            </div>
          ` : ""}
          <div class="card-footer">
            <span>Doctor: ${doctorName}</span>
            <span>Touch: ${new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      `;
    }).join("");
  },
};
