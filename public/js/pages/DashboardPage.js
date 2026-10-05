/**
 * Ward Dashboard Page
 */

import { api } from "../api.js";
import { DashboardView } from "../components/DashboardView.js";

export const DashboardPage = {
  async render(container) {
    container.innerHTML = `
      <section id="dashboardView" style="display: block;">
        <!-- Counters Row -->
        <div class="metrics-row">
          <div class="metric-card critical">
            <span class="metric-label">Critical Patients</span>
            <span class="metric-value" id="countCritical" style="color: var(--critical);">0</span>
          </div>
          <div class="metric-card warning">
            <span class="metric-label">Close Monitoring</span>
            <span class="metric-value" id="countCloseMonitoring" style="color: var(--warning);">0</span>
          </div>
          <div class="metric-card stable">
            <span class="metric-label">Stable Inpatients</span>
            <span class="metric-value" id="countStable" style="color: var(--stable);">0</span>
          </div>
          <div class="metric-card primary">
            <span class="metric-label">Total Active Beds</span>
            <span class="metric-value" id="countTotalActive" style="color: var(--primary);">0</span>
          </div>
        </div>

        <!-- Quick Action Toolbar -->
        <div class="toolbar">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="app.showModal('addPatientModal')">Add Inpatient</button>
            <button class="btn btn-critical" onclick="app.showQuickDeteriorationModal()">Record Deterioration</button>
            <button class="btn btn-outline" onclick="app.navigate('handover')">Ward Handover Sheet</button>
          </div>
          <div class="search-box">
            <input type="text" id="dashboardSearchInput" placeholder="Quick search patient by name, bed, file number..." oninput="app.handleDashboardSearch(event)">
          </div>
        </div>

        <!-- Dashboard Grid: Critical Patients Shelf & Action Queues -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
          
          <!-- Critical Patients Panel -->
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--critical);">Critical Patients (Priority Review)</h3>
              <span class="badge-status status-Critical" id="criticalShelfBadge">0 Critical</span>
            </div>
            <div id="criticalPatientsList">
              <p style="color: var(--text-dim); font-size: 0.82rem;">No critical patients at this time.</p>
            </div>
          </div>

          <!-- Important Pending Results Panel -->
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">Unreviewed Lab / Radiology Results</h3>
              <span class="badge-status status-Close-Monitoring" id="pendingResultsBadge">0 Pending</span>
            </div>
            <div id="pendingResultsList">
              <p style="color: var(--text-dim); font-size: 0.82rem;">No unreviewed results.</p>
            </div>
          </div>

          <!-- My Tasks Queue -->
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">My Clinical Tasks</h3>
              <span class="badge-status status-Stable" id="myTasksBadge">0 Active</span>
            </div>
            <div id="myTasksList">
              <p style="color: var(--text-dim); font-size: 0.82rem;">No pending tasks assigned to you.</p>
            </div>
          </div>

          <!-- Overdue Department Tasks -->
          <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem; box-shadow: var(--shadow-sm);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--critical);">Overdue Tasks</h3>
              <span class="badge-status status-Critical" id="overdueTasksBadge">0 Overdue</span>
            </div>
            <div id="overdueTasksList">
              <p style="color: var(--text-dim); font-size: 0.82rem;">No overdue tasks in the ward.</p>
            </div>
          </div>

        </div>
      </section>
    `;
  },

  async afterRender() {
    try {
      const res = await api.request("/api/dashboard");
      DashboardView.render(res.data);
    } catch (err) {
      console.error("Dashboard page load failed:", err.message);
    }
  },
};
