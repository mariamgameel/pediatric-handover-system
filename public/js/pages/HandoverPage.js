/**
 * Shift Handover Workspace Page
 */

import { api } from "../api.js";
import { HandoverView } from "../components/HandoverView.js";

export const HandoverPage = {
  async render(container) {
    container.innerHTML = `
      <section id="handoverView" style="display: block;">
        <div class="toolbar">
          <h3 style="font-size: 1.1rem; font-weight: 800;">Ward Shift Handover Workspace</h3>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary" onclick="app.loadWardHandoverSheet()">Refresh Ward Sheet</button>
          </div>
        </div>

        <p style="font-size: 0.82rem; color: var(--text-dim); margin-bottom: 1rem;">
          Structured clinical summaries auto-compiled in real time. Eliminates error-prone manual retyping while highlighting critical warnings and unreviewed results.
        </p>

        <div id="wardHandoverCards">
          <!-- Rendered Handover Cards for each active patient -->
        </div>
      </section>
    `;
  },

  async afterRender() {
    try {
      const res = await api.request("/api/handovers/ward-sheet");
      HandoverView.renderWardSheet(res.data.wardHandovers);
    } catch (err) {
      console.error("Failed to load handover sheet:", err.message);
    }
  },
};
