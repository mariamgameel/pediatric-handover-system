/**
 * Header Component: User Badge, Shift Status, Navigation & Alerts
 */

export const Header = {
  render(currentUser) {
    if (!currentUser) {
      document.getElementById("appHeader").style.display = "none";
      return;
    }

    document.getElementById("appHeader").style.display = "block";
    document.getElementById("headerUserName").textContent = currentUser.name;
    document.getElementById("headerUserMeta").textContent = `ID: ${currentUser.userId} | Role: ${currentUser.role}`;

    const shiftContainer = document.getElementById("shiftIndicatorContainer");
    if (currentUser.role === "Admin" || currentUser.shiftExempt) {
      shiftContainer.innerHTML = `<span class="shift-pill shift-exempt">Shift Exempt (24/7)</span>`;
    } else {
      shiftContainer.innerHTML = `<span class="shift-pill shift-active">Active Shift</span>`;
    }

    // Toggle admin nav button
    const adminBtn = document.getElementById("adminNavBtn");
    if (adminBtn) {
      adminBtn.style.display = currentUser.role === "Admin" ? "inline-block" : "none";
    }

    // Role-dependent UI controls (Specialist/Consultant/Admin for management plan)
    const addPlanBtn = document.getElementById("addPlanBtn");
    if (addPlanBtn) {
      if (["Specialist", "Consultant", "Admin"].includes(currentUser.role)) {
        addPlanBtn.style.display = "inline-block";
      } else {
        addPlanBtn.style.display = "none";
      }
    }
  },

  updateAlertBadge(count) {
    const badge = document.getElementById("alertsCountBadge");
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
  },
};
