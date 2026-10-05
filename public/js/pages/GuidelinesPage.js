/**
 * GuidelinesPage Component: Pediatric Department Guidelines & Interactive Dosing Calculator
 */
import { api } from "../api.js";
import { state } from "../state.js";
import { AdminModals } from "../components/AdminModals.js";

export const GuidelinesPage = {
  activeCategory: "",
  searchQuery: "",
  patientWeightKg: 10,
  guidelines: [],

  async render(container, params) {
    return this.init(container);
  },

  async init(container) {
    this.container = container;
    this.renderLayout();
    await this.loadGuidelines();
  },

  renderLayout() {
    const isAdminOrConsultant = state.currentUser && ["Admin", "Consultant"].includes(state.currentUser.role);

    this.container.innerHTML = `
      <div class="content-wrapper" style="max-width: 1300px; margin: 0 auto; padding: 1.5rem;">
        <!-- Page Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a;">Pediatric Department Clinical Guidelines</h1>
            <p style="color: #64748b; font-size: 0.9rem;">Peer-reviewed clinical pathways, resuscitation bundles, and weight-based pediatric dosing formulas.</p>
          </div>
          <div>
            ${
              isAdminOrConsultant
                ? `<button class="btn btn-primary" id="addGuidelineBtn">➕ Add Clinical Guideline</button>`
                : ""
            }
          </div>
        </div>

        <!-- Interactive Weight-Based Dosing Calculator Bar -->
        <div class="calculator-box">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <strong style="color: #0369a1; font-size: 0.95rem;">⚡ Real-Time Pediatric Dose Calculator</strong>
              <div style="font-size: 0.8rem; color: #0284c7;">Enter patient weight to dynamically calculate exact milligram doses across all active guidelines:</div>
            </div>
            <div class="calc-input-group">
              <label style="font-weight: 700; font-size: 0.85rem;">Patient Weight:</label>
              <input type="number" id="calcWeightInput" class="form-control" style="width: 90px; padding: 0.4rem 0.6rem; text-align: center; font-weight: 800; border-radius: 4px; border: 1px solid #0284c7;" min="0.5" max="100" step="0.5" value="${this.patientWeightKg}">
              <span style="font-weight: 700; color: #0369a1;">kg</span>
              <button class="btn btn-primary btn-sm" id="applyDoseWeightBtn">Calculate Doses</button>
            </div>
          </div>
        </div>

        <!-- Filters & Search Toolbar -->
        <div style="display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1.25rem;">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;" id="categoryFilterContainer">
            <button class="btn btn-sm btn-outline filter-cat-btn active" data-cat="">All Categories</button>
            <button class="btn btn-sm btn-outline filter-cat-btn" data-cat="Emergency_PICU">Emergency & PICU</button>
            <button class="btn btn-sm btn-outline filter-cat-btn" data-cat="Respiratory">Respiratory</button>
            <button class="btn btn-sm btn-outline filter-cat-btn" data-cat="Endocrinology_Metabolic">Metabolic / DKA</button>
            <button class="btn btn-sm btn-outline filter-cat-btn" data-cat="Neonatology">Neonatology</button>
            <button class="btn btn-sm btn-outline filter-cat-btn" data-cat="Neurology">Neurology</button>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="guidelineSearchInput" placeholder="Search by condition or drug..." class="form-control" style="padding: 0.45rem 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; min-width: 250px;">
          </div>
        </div>

        <!-- Guidelines Grid Mount Point -->
        <div id="guidelinesGridMount">
          <div style="text-align: center; padding: 3rem;">
            <div class="spinner" style="margin: 0 auto 1rem auto;"></div>
            <p>Loading clinical guidelines...</p>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    if (isAdminOrConsultant) {
      document.getElementById("addGuidelineBtn").onclick = () => {
        AdminModals.renderGuidelineModal(null, () => this.loadGuidelines());
      };
    }

    document.getElementById("applyDoseWeightBtn").onclick = () => {
      const w = parseFloat(document.getElementById("calcWeightInput").value);
      if (!isNaN(w) && w > 0) {
        this.patientWeightKg = w;
        this.renderGuidelinesCards();
      }
    };

    document.getElementById("guidelineSearchInput").oninput = (e) => {
      this.searchQuery = e.target.value.trim();
      this.renderGuidelinesCards();
    };

    const filterBtns = this.container.querySelectorAll(".filter-cat-btn");
    filterBtns.forEach((btn) => {
      btn.onclick = () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeCategory = btn.getAttribute("data-cat");
        this.loadGuidelines();
      };
    });
  },

  async loadGuidelines() {
    try {
      const params = {};
      if (this.activeCategory) params.category = this.activeCategory;
      if (this.searchQuery) params.search = this.searchQuery;

      const res = await api.getGuidelines(params);
      this.guidelines = res.data?.guidelines || [];
      this.renderGuidelinesCards();
    } catch (err) {
      document.getElementById("guidelinesGridMount").innerHTML = `
        <div class="alert alert-danger" style="margin-top: 1rem;">
          Failed to load guidelines: ${err.message}
        </div>
      `;
    }
  },

  renderGuidelinesCards() {
    const mount = document.getElementById("guidelinesGridMount");
    if (!mount) return;

    let filtered = this.guidelines;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.summary.toLowerCase().includes(q) ||
          g.dosageFormulas?.some((d) => d.drug.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      mount.innerHTML = `
        <div style="text-align: center; padding: 3.5rem; background: var(--surface); border-radius: 8px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📖</div>
          <h3 style="font-size: 1.1rem; color: #475569;">No clinical guidelines found</h3>
          <p style="font-size: 0.85rem; color: #64748b;">Try adjusting your category filter or search keywords.</p>
        </div>
      `;
      return;
    }

    const isAdmin = state.currentUser && state.currentUser.role === "Admin";
    const isAdminOrConsultant = state.currentUser && ["Admin", "Consultant"].includes(state.currentUser.role);
    const weight = this.patientWeightKg;

    mount.innerHTML = `
      <div class="guideline-grid">
        ${filtered.map((g) => {
          let catClass = "";
          if (g.category === "Emergency_PICU") catClass = "emergency";
          else if (g.category === "Neonatology") catClass = "neonatology";
          else if (g.category === "Respiratory") catClass = "respiratory";
          else if (g.category === "Neurology") catClass = "neurology";

          return `
            <div class="guideline-card" id="card-${g._id}">
              <div>
                <div class="guideline-header">
                  <span class="category-tag ${catClass}">${g.category.replace(/_/g, " ")}</span>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">v${g.version}</span>
                    ${
                      isAdminOrConsultant
                        ? `<button class="action-icon-btn" title="Edit Guideline" onclick="window._editGuideline('${g._id}')">✏️</button>`
                        : ""
                    }
                    ${
                      isAdmin
                        ? `<button class="action-icon-btn" title="Delete Guideline" style="color: #dc2626;" onclick="window._deleteGuideline('${g._id}')">🗑️</button>`
                        : ""
                    }
                  </div>
                </div>

                <h3 class="guideline-title">${g.title}</h3>
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.65rem;">
                  Target: <strong>${g.targetAgeGroup.replace(/_/g, " ")}</strong>
                </div>
                <p class="guideline-summary">${g.summary}</p>

                <!-- Dosing Quick Readouts for current weight -->
                ${
                  g.dosageFormulas && g.dosageFormulas.length > 0
                    ? `
                    <div style="margin-bottom: 0.75rem;">
                      <div style="font-size: 0.72rem; font-weight: 700; color: #0369a1; margin-bottom: 0.35rem;">
                        MEDICATION CALCULATOR (${weight} kg):
                      </div>
                      <div class="dosage-badge-list">
                        ${g.dosageFormulas.map((d) => {
                          const calculatedStr = this.calculateSingleDose(d, weight);
                          return `
                            <span class="dosage-chip" title="${d.dose} (${d.route})">
                              💊 ${d.drug}: <strong>${calculatedStr}</strong>
                            </span>
                          `;
                        }).join("")}
                      </div>
                    </div>
                  `
                    : ""
                }
              </div>

              <div class="guideline-footer">
                <div>By: <strong>${g.author?.name || "Department Staff"}</strong></div>
                <button class="btn btn-outline btn-sm" onclick="window._openGuidelineDetails('${g._id}')">Full Protocol ↗</button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    // Global helpers for clicks inside cards
    window._editGuideline = (id) => {
      const g = this.guidelines.find((item) => item._id === id);
      if (g) AdminModals.renderGuidelineModal(g, () => this.loadGuidelines());
    };

    window._deleteGuideline = async (id) => {
      if (!confirm("Are you sure you want to delete this clinical guideline?")) return;
      try {
        await api.deleteGuideline(id);
        await this.loadGuidelines();
      } catch (err) {
        alert("Error deleting guideline: " + err.message);
      }
    };

    window._openGuidelineDetails = (id) => {
      const g = this.guidelines.find((item) => item._id === id);
      if (g) this.showGuidelineDrawer(g);
    };
  },

  calculateSingleDose(formula, weightKg) {
    const doseText = formula.dose || "";
    // Check if formula has mg/kg or mL/kg
    const mgKgMatch = doseText.match(/([0-9\.]+)\s*(mg|mcg|mL|units|g)\/kg/i);
    if (mgKgMatch) {
      const perKgVal = parseFloat(mgKgMatch[1]);
      const unit = mgKgMatch[2];
      const total = (perKgVal * weightKg).toFixed(1);
      return `${total} ${unit} (${formula.route})`;
    }
    return `${doseText} (${formula.route})`;
  },

  showGuidelineDrawer(guideline) {
    let modal = document.getElementById("guidelineDetailModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "guidelineDetailModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <div>
            <span class="category-tag">${guideline.category.replace(/_/g, " ")}</span>
            <h2 style="font-size: 1.3rem; font-weight: 800; margin-top: 0.35rem;">${guideline.title}</h2>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('guidelineDetailModal').style.display='none'">&times;</button>
        </div>
        <div style="padding: 1.5rem;">
          <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 0.85rem 1rem; border-radius: 4px; margin-bottom: 1.25rem;">
            <strong>Summary:</strong> ${guideline.summary}
          </div>

          <div style="margin-bottom: 1.5rem; line-height: 1.6; font-size: 0.9rem;" class="markdown-body">
            ${this.renderMarkdown(guideline.contentMarkdown)}
          </div>

          ${
            guideline.dosageFormulas && guideline.dosageFormulas.length > 0
              ? `
              <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Weight-Based Medication Formulations</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; border: 1px solid #e2e8f0;">
                  <thead style="background: #f1f5f9;">
                    <tr>
                      <th style="padding: 0.5rem; text-align: left; border: 1px solid #e2e8f0;">Drug</th>
                      <th style="padding: 0.5rem; text-align: left; border: 1px solid #e2e8f0;">Formula</th>
                      <th style="padding: 0.5rem; text-align: left; border: 1px solid #e2e8f0;">Route</th>
                      <th style="padding: 0.5rem; text-align: left; border: 1px solid #e2e8f0;">Calculated (${this.patientWeightKg} kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${guideline.dosageFormulas.map((d) => `
                      <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e2e8f0; font-weight: 700;">${d.drug}</td>
                        <td style="padding: 0.5rem; border: 1px solid #e2e8f0;">${d.dose}</td>
                        <td style="padding: 0.5rem; border: 1px solid #e2e8f0;">${d.route}</td>
                        <td style="padding: 0.5rem; border: 1px solid #e2e8f0; color: #0284c7; font-weight: 700;">
                          ${this.calculateSingleDose(d, this.patientWeightKg)}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `
              : ""
          }

          ${
            guideline.references && guideline.references.length > 0
              ? `
              <div style="font-size: 0.8rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <strong>Clinical References:</strong>
                <ul style="margin-left: 1.25rem; margin-top: 0.35rem;">
                  ${guideline.references.map((r) => `<li>${r}</li>`).join("")}
                </ul>
              </div>
            `
              : ""
          }
        </div>
      </div>
    `;

    modal.style.display = "flex";
  },

  renderMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/^### (.*$)/gim, '<h3 style="font-weight: 700; margin: 1rem 0 0.5rem 0;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="font-weight: 700; margin: 1.25rem 0 0.5rem 0;">$1</h2>')
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/^\- (.*$)/gim, '<li style="margin-left: 1.25rem;">$1</li>')
      .replace(/\n$/gim, "<br />")
      .replace(/\n/g, "<br>");
  },
};
