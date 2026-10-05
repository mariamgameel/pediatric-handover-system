/**
 * Modals Component: Modal Open/Close Controls and Dynamic Form Helpers
 */

export const Modals = {
  show(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
  },

  toggleCriticalReasonField(statusSelectId, groupContainerId) {
    const statusVal = document.getElementById(statusSelectId).value;
    const groupEl = document.getElementById(groupContainerId);
    if (groupEl) {
      groupEl.style.display = statusVal === "Critical" ? "block" : "none";
    }
  },

  addMedicationRow() {
    const list = document.getElementById("planMedsList");
    if (!list) return;
    const row = document.createElement("div");
    row.className = "med-input-row";
    row.style = "display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;";
    row.innerHTML = `
      <input type="text" placeholder="Drug Name *" class="form-control med-name" style="flex: 2;" required>
      <input type="text" placeholder="Dose (e.g. 15 mg/kg)" class="form-control med-dose" style="flex: 1.5;">
      <select class="form-control med-route" style="flex: 1;">
        <option value="IV">IV</option>
        <option value="Oral">Oral</option>
        <option value="Inhalation">Inhalation</option>
        <option value="SC">SC</option>
        <option value="PR">PR</option>
      </select>
      <input type="text" placeholder="Freq (e.g. q8h)" class="form-control med-freq" style="flex: 1;">
      <label style="font-size: 0.72rem; display: flex; align-items: center; gap: 0.2rem; cursor: pointer;">
        <input type="checkbox" class="med-abx"> Abx
      </label>
      <button type="button" class="btn btn-outline btn-sm" onclick="this.parentElement.remove()" style="color: var(--critical);">✕</button>
    `;
    list.appendChild(row);
  },
};
