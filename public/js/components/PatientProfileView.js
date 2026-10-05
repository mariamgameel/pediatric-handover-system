/**
 * Patient Profile Workspace Component: Identity, Vitals, SOAP Notes, Problems & Tabs
 */

export const PatientProfileView = {
  renderProfileHeader(patient, latestVitals) {
    document.getElementById("profileBed").textContent = patient.bedNumber;
    document.getElementById("profileName").textContent = patient.name;
    const statusBadge = document.getElementById("profileStatusBadge");
    statusBadge.textContent = patient.status;
    statusBadge.className = `badge-status status-${patient.status.replace(/\s+/g, '-')}`;

    const ageText = patient.age.years > 0 
      ? `${patient.age.years}y ${patient.age.months}m` 
      : `${patient.age.months}m ${patient.age.days}d`;
    document.getElementById("profileMeta").textContent = `Age: ${ageText} | Weight: ${patient.weight} kg | File: ${patient.fileNumber} | ID: ${patient.patientId}`;
    document.getElementById("profileDiagnosis").textContent = patient.mainDiagnosis;
    document.getElementById("profileAllergies").textContent = patient.allergies ? patient.allergies.join(", ") : "NKDA";

    const critRow = document.getElementById("profileCriticalReasonRow");
    if (patient.status === "Critical" && patient.statusReason) {
      critRow.style.display = "block";
      document.getElementById("profileCriticalReason").textContent = patient.statusReason;
    } else {
      critRow.style.display = "none";
    }

    // Latest Vitals Ribbon
    if (latestVitals) {
      document.getElementById("statTemp").textContent = latestVitals.temperature ? `${latestVitals.temperature}°C` : "--";
      document.getElementById("statHR").textContent = latestVitals.heartRate ? `${latestVitals.heartRate} bpm` : "--";
      document.getElementById("statRR").textContent = latestVitals.respiratoryRate ? `${latestVitals.respiratoryRate} bpm` : "--";
      document.getElementById("statBP").textContent = latestVitals.bloodPressure?.systolic ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}` : "--";
      document.getElementById("statSpO2").textContent = latestVitals.spO2 ? `${latestVitals.spO2}%` : "--";
      document.getElementById("statGCS").textContent = latestVitals.gcs || "--";
      document.getElementById("statO2").textContent = latestVitals.oxygenSupport?.mode || "Room Air";
      document.getElementById("statIV").textContent = latestVitals.ivFluids || "None";
    } else {
      ["statTemp", "statHR", "statRR", "statBP", "statSpO2", "statGCS", "statO2", "statIV"].forEach((id) => {
        document.getElementById(id).textContent = "--";
      });
    }
  },

  renderWhatChangedBanner(deltaData) {
    const container = document.getElementById("whatChangedContainer");
    if (!deltaData || deltaData.isFirstVisit || deltaData.changeCount === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    container.className = `delta-banner ${deltaData.hasCriticalChange ? "has-critical" : ""}`;

    const itemsHtml = deltaData.changes.slice(0, 4).map((c) => `
      <div style="font-size: 0.78rem; margin-top: 0.2rem;">
        • <strong>${c.title}</strong>: ${c.details ? c.details.substring(0, 90) : ""} (${new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
      </div>
    `).join("");

    container.innerHTML = `
      <div style="flex: 1;">
        <div class="delta-title">
          ${deltaData.hasCriticalChange ? "CRITICAL CLINICAL UPDATES" : "Clinical Updates"} Since Your Last Visit (${new Date(deltaData.lastViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
        </div>
        ${itemsHtml}
      </div>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('whatChangedContainer').style.display='none'">Dismiss</button>
    `;
  },

  renderVitalsTable(vitals) {
    const tbody = document.getElementById("vitalsTableBody");
    if (!vitals || vitals.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-dim);">No vitals recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = vitals.map((v) => {
      const bpStr = v.bloodPressure?.systolic ? `${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}` : "--";
      const doc = v.recordedBy ? `${v.recordedBy.name} (${v.recordedBy.userId})` : "Clinician";
      return `
        <tr>
          <td>${new Date(v.recordedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td style="font-weight: 700;">${v.temperature ? `${v.temperature}°C` : "--"}</td>
          <td>${v.heartRate || "--"}</td>
          <td>${v.respiratoryRate || "--"}</td>
          <td>${bpStr}</td>
          <td style="font-weight: 700; color: ${v.spO2 < 92 ? "var(--critical)" : "inherit"};">${v.spO2 ? `${v.spO2}%` : "--"}</td>
          <td>${v.gcs || "--"}</td>
          <td>${v.oxygenSupport?.mode || "Room Air"}</td>
          <td>${v.ivFluids || "None"}</td>
          <td>${doc}</td>
        </tr>
      `;
    }).join("");
  },

  renderProblemsList(problems) {
    const container = document.getElementById("problemsList");
    if (!problems || problems.length === 0) {
      container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No active or resolved problems listed.</p>`;
      return;
    }

    container.innerHTML = problems.map((p) => {
      const isResolved = p.status === "Resolved";
      return `
        <div style="background: var(--surface); border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 0.65rem; border-left: 4px solid ${isResolved ? "var(--success)" : "var(--warning)"};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span class="badge-status ${isResolved ? "status-Discharged" : "status-Close-Monitoring"}">${p.status}</span>
              <strong style="font-size: 0.95rem; margin-left: 0.5rem; color: #0f172a;">${p.title}</strong>
            </div>
            ${!isResolved ? `<button class="btn btn-outline btn-sm" onclick="app.promptResolveProblem('${p._id}')">Resolve Problem</button>` : ""}
          </div>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.35rem;">${p.description || "No additional description."}</p>
          ${isResolved && p.resolutionInfo ? `
            <div style="font-size: 0.75rem; color: var(--success); font-weight: 600; margin-top: 0.35rem; background: var(--success-bg); padding: 0.35rem 0.5rem; border-radius: var(--radius-sm);">
              Resolved by ${p.resolutionInfo.resolvedBy?.name || "Doctor"} on ${new Date(p.resolutionInfo.resolvedAt).toLocaleDateString()}: "${p.resolutionInfo.resolutionNote}"
            </div>
          ` : ""}
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.35rem;">
            Started: ${new Date(p.startDate || p.createdAt).toLocaleDateString()} by ${p.createdBy?.name || "Clinician"} (${p.createdBy?.userId || ""})
          </div>
        </div>
      `;
    }).join("");
  },

  renderInvestigationsTable(list, currentUser) {
    const tbody = document.getElementById("investigationsTableBody");
    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">No investigations on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((inv) => {
      let actionBtn = "";
      if (inv.status === "Requested" || inv.status === "Pending") {
        actionBtn = `<button class="btn btn-outline btn-sm" onclick="app.showEnterResultModal('${inv._id}')">Enter Result</button>`;
      } else if (inv.status === "Result Available") {
        if (currentUser && ["Specialist", "Consultant", "Admin"].includes(currentUser.role)) {
          actionBtn = `<button class="btn btn-primary btn-sm" onclick="app.promptReviewResult('${inv._id}')">Formally Review</button>`;
        } else {
          actionBtn = `<span style="font-size: 0.72rem; color: var(--text-dim);">Awaiting Senior Review</span>`;
        }
      } else {
        actionBtn = `<span style="font-size: 0.75rem; color: var(--success); font-weight: 700;">Verified</span>`;
      }

      const isUnreviewed = inv.status === "Result Available";

      return `
        <tr style="${isUnreviewed ? "background: #fffbeb;" : ""}">
          <td style="font-weight: 700;">${inv.name}</td>
          <td>${inv.type}</td>
          <td>${new Date(inv.requestedAt || inv.createdAt).toLocaleDateString()}</td>
          <td>
            <span class="badge-status ${inv.status === "Reviewed" ? "status-Discharged" : inv.status === "Result Available" ? "status-Critical" : "status-Stable"}">
              ${inv.status}
            </span>
          </td>
          <td>
            ${inv.result ? `
              <div style="font-weight: 600; color: ${inv.isAbnormal ? "var(--critical)" : "inherit"};">
                ${inv.result} ${inv.isAbnormal ? "[ABNORMAL]" : ""}
              </div>
            ` : `<span style="color: var(--text-dim);">Pending test</span>`}
          </td>
          <td>${inv.reviewedBy ? `${inv.reviewedBy.name} (${inv.reviewedBy.userId})` : "--"}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join("");
  },

  renderManagementPlans(plans) {
    const container = document.getElementById("managementPlansStack");
    if (!plans || plans.length === 0) {
      container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No formal management plan created yet.</p>`;
      return;
    }

    container.innerHTML = plans.map((mp) => {
      const isCurrent = !mp.isSuperseded;
      return `
        <div style="background: var(--surface); border: 1px solid ${isCurrent ? "var(--primary)" : "var(--border-light)"}; border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 0.85rem; opacity: ${isCurrent ? 1 : 0.75};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <div style="font-weight: 700; font-size: 0.95rem;">
              Version ${mp.version} ${isCurrent ? '<span class="badge-status status-Stable" style="margin-left: 0.5rem;">Current Active Plan</span>' : '<span style="color: var(--text-dim); font-size: 0.75rem;">(Superseded)</span>'}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim);">
              By ${mp.createdBy?.name || "Clinician"} (${mp.authorRole}) • ${new Date(mp.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
          <div style="font-size: 0.88rem; line-height: 1.5; color: #1e293b; margin-bottom: 0.65rem;">
            ${mp.plan}
          </div>
          ${mp.medications && mp.medications.length > 0 ? `
            <div style="margin-top: 0.5rem; background: #f8fafc; padding: 0.5rem; border-radius: var(--radius-sm);">
              <strong style="font-size: 0.78rem;">Medications:</strong>
              <ul style="margin: 0.25rem 0 0 1.25rem; font-size: 0.78rem;">
                ${mp.medications.map((m) => `<li><strong>${m.name}</strong> ${m.dosage || ""} ${m.route || ""} ${m.frequency || ""} ${m.isAntibiotic ? '<span style="color: var(--critical); font-weight: 700;">[Antibiotic]</span>' : ""}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          <div style="margin-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 1.5rem; flex-wrap: wrap;">
            ${mp.ivFluids ? `<span><strong>IV Fluids:</strong> ${mp.ivFluids}</span>` : ""}
            ${mp.oxygenSupport ? `<span><strong>O2:</strong> ${mp.oxygenSupport}</span>` : ""}
            ${mp.supportiveCare ? `<span><strong>Supportive:</strong> ${mp.supportiveCare}</span>` : ""}
          </div>
        </div>
      `;
    }).join("");
  },

  renderTasksList(tasks) {
    const container = document.getElementById("tasksListContainer");
    if (!tasks || tasks.length === 0) {
      container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No pending or overdue tasks for this patient.</p>`;
      return;
    }

    container.innerHTML = tasks.map((t) => {
      const isOverdue = t.status === "Overdue";
      const isDone = t.status === "Completed";
      return `
        <div style="background: ${isOverdue ? "#fffafa" : "var(--surface)"}; border: 1px solid ${isOverdue ? "var(--critical-border)" : "var(--border-light)"}; border-radius: var(--radius-sm); padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600; font-size: 0.85rem; color: ${isOverdue ? "var(--critical)" : "inherit"};">
              ${t.description}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.2rem;">
              Priority: <strong>${t.priority}</strong> | Due: ${new Date(t.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | Assigned to: ${t.assignedTo?.name || "Unassigned"}
            </div>
          </div>
          <div>
            ${!isDone ? `<button class="btn btn-primary btn-sm" onclick="app.handleCompleteTask('${t._id}', '${t.patient ? t.patient._id : ""}')">Complete</button>` : '<span style="font-size: 0.75rem; color: var(--success); font-weight: 700;">Completed</span>'}
          </div>
        </div>
      `;
    }).join("");
  },

  renderTimeline(updates) {
    const container = document.getElementById("timelineUpdatesList");
    if (!updates || updates.length === 0) {
      container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem;">No clinical SOAP notes or deterioration reports yet.</p>`;
      return;
    }

    container.innerHTML = updates.map((u) => {
      return `
        <div style="background: var(--surface); border: 1px solid ${u.isDeterioration ? "var(--critical)" : "var(--border-light)"}; border-radius: var(--radius-sm); padding: 0.85rem; margin-bottom: 0.65rem; border-left: 4px solid ${u.isDeterioration ? "var(--critical)" : "var(--primary)"};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>${u.type}</strong>
            <span style="font-size: 0.72rem; color: var(--text-dim);">${new Date(u.recordedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div style="font-size: 0.85rem; margin-top: 0.35rem; line-height: 1.4;">${u.details}</div>
          ${u.isDeterioration ? `
            <div style="margin-top: 0.5rem; background: var(--critical-bg); border: 1px solid var(--critical-border); padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--critical);">
              <strong>Deterioration Trigger:</strong> ${u.deteriorationData?.triggerReason || "Acute change"} | <strong>Escalation:</strong> ${u.deteriorationData?.escalationLevel || "Senior staff notified"}
              ${u.deteriorationData?.immediateActionTaken ? `<div><strong>Action Taken:</strong> ${u.deteriorationData.immediateActionTaken}</div>` : ""}
            </div>
          ` : ""}
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.35rem;">
            Recorded by: ${u.recordedBy?.name || "Clinician"} (${u.recordedBy?.userId || ""})
          </div>
        </div>
      `;
    }).join("");
  },
};
