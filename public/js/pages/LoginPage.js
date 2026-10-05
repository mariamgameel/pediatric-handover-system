/**
 * Login & Clinical Portal Landing Page
 */

export const LoginPage = {
  async render(container) {
    container.innerHTML = `
      <section id="loginView" class="landing-wrapper" style="display: block;">
        <header class="landing-nav-bar">
          <div class="landing-nav-inner">
            <div class="landing-brand">
              <span class="dept-tag">Pediatrics Department</span>
              <h1>Pediatric Handover &amp; Clinical Follow-up System</h1>
            </div>
            <nav class="landing-links">
              <a href="#clinical-pillars">Clinical Architecture</a>
              <a href="#governance-section">Leadership &amp; Governance</a>
              <a href="/api/docs" target="_blank" style="color: #38bdf8;">Swagger UI Docs ↗</a>
              <a href="#staff-portal" class="btn btn-primary btn-sm">Sign In to Shift</a>
            </nav>
          </div>
        </header>

        <div class="landing-hero">
          <div class="landing-hero-inner">
            <div>
              <div class="hero-pill-badge">
                <span>●</span> Inpatient Safety &amp; Shift Communication Platform
              </div>
              <h1 class="hero-headline">Purpose-Built Pediatric Inpatient Handover &amp; Clinical Follow-up</h1>
              <p class="hero-subtitle">
                A high-reliability, zero-bloat clinical communication platform engineered specifically for hospital pediatric inpatient units. Eliminates manual handover rewriting, prevents missed rapid deterioration, and enforces strict shift-based access governance.
              </p>
              <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <a href="#staff-portal" class="btn btn-primary" style="padding: 0.65rem 1.25rem; font-size: 0.9rem;">Sign In to Shift</a>
                <a href="/api/docs" target="_blank" class="btn btn-outline" style="background: transparent; color: #ffffff; border-color: #475569; padding: 0.65rem 1.25rem; font-size: 0.9rem;">Open Swagger UI Docs ↗</a>
              </div>

              <div class="hero-stats-row">
                <div class="hero-stat">
                  <span class="hero-stat-value">100%</span>
                  <span class="hero-stat-label">Append-Only Vitals</span>
                </div>
                <div class="hero-stat">
                  <span class="hero-stat-value">45 min</span>
                  <span class="hero-stat-label">Handover Buffer</span>
                </div>
                <div class="hero-stat">
                  <span class="hero-stat-value">1-Click</span>
                  <span class="hero-stat-label">Deterioration Escalation</span>
                </div>
                <div class="hero-stat">
                  <span class="hero-stat-value">Zero</span>
                  <span class="hero-stat-label">EMR Bloat / Overwrite</span>
                </div>
              </div>
            </div>

            <!-- Staff Portal Card -->
            <div class="landing-portal-card" id="staff-portal">
              <div class="portal-title-row">
                <h2>Clinician Portal Sign-In</h2>
                <a href="/api/docs" target="_blank" style="font-size: 0.75rem; color: var(--primary); font-weight: 700; text-decoration: none;">Swagger API ↗</a>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 1.25rem;">
                Authorized Hospital Pediatrics Staff Only
              </p>

              <div id="loginError" style="display: none; padding: 0.65rem; background: var(--critical-bg); border: 1px solid var(--critical-border); color: var(--critical); border-radius: var(--radius-sm); font-size: 0.82rem; margin-bottom: 1rem;"></div>

              <form id="loginForm" onsubmit="app.handleLogin(event)">
                <div class="form-group">
                  <label>Hospital Staff Email</label>
                  <input type="email" class="form-control" id="loginEmail" required autofocus placeholder="staff@hospital.org">
                </div>
                <div class="form-group" style="margin-bottom: 1.25rem;">
                  <label>Password</label>
                  <input type="password" class="form-control" id="loginPassword" required placeholder="Enter password">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.65rem;">Sign In to Active Shift</button>
              </form>

              <div class="quick-demo-accounts">
                <div class="demo-title">Quick Demo Login (Click to Auto-fill):</div>
                <div class="demo-pills-grid">
                  <button type="button" class="demo-btn admin-pill" onclick="app.quickFillLogin('admin@hospital.org', 'Password123!')">
                    Admin (Amira Fouad)
                  </button>
                  <button type="button" class="demo-btn" onclick="app.quickFillLogin('consultant@hospital.org', 'Password123!')">
                    Consultant (Dr. Mariam)
                  </button>
                  <button type="button" class="demo-btn" onclick="app.quickFillLogin('specialist@hospital.org', 'Password123!')">
                    Specialist (Dr. Tariq)
                  </button>
                  <button type="button" class="demo-btn" onclick="app.quickFillLogin('resident@hospital.org', 'Password123!')">
                    Resident (Dr. Omar)
                  </button>
                  <button type="button" class="demo-btn" style="border-color: var(--critical-border); color: var(--critical);" onclick="app.quickFillLogin('offshift.doc@hospital.org', 'Password123!')">
                    Off-Shift Doctor (Lockout Test)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },
};
