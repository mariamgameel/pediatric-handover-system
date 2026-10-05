/**
 * Patient Directory Page
 */

import { api } from "../api.js";
import { state } from "../state.js";
import { PatientsView } from "../components/PatientsView.js";

export const PatientsPage = {
  async render(container) {
    container.innerHTML = `
      <section id="patientsView" style="display: block;">
        <div class="toolbar">
          <div class="search-box">
            <input type="text" id="patientFilterSearch" placeholder="Search by name, bed, file #, diagnosis..." oninput="app.loadPatients()">
          </div>
          <div class="filter-group">
            <select class="filter-select" id="patientFilterStatus" onchange="app.loadPatients()">
              <option value="">All Statuses</option>
              <option value="Critical">Critical</option>
              <option value="Close Monitoring">Close Monitoring</option>
              <option value="Stable">Stable</option>
            </select>
            <select class="filter-select" id="patientFilterDischarge" onchange="app.loadPatients()">
              <option value="false">Active Inpatients</option>
              <option value="true">Discharged / Transferred</option>
            </select>
            <button class="btn btn-primary" onclick="app.showModal('addPatientModal')">Add Patient</button>
          </div>
        </div>

        <div class="patient-grid" id="patientsGrid">
          <!-- Rendered Patient Cards -->
        </div>
      </section>
    `;
  },

  async afterRender() {
    const search = document.getElementById("patientFilterSearch").value.trim();
    const status = document.getElementById("patientFilterStatus").value;
    const discharged = document.getElementById("patientFilterDischarge").value;

    let url = `/api/patients?discharged=${discharged}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${status}`;

    try {
      const res = await api.request(url);
      state.setPatientsCache(res.data.patients);
      PatientsView.renderGrid(res.data.patients);
    } catch (err) {
      console.error("Failed to load patients:", err.message);
    }
  },
};
