/**
 * Client-Side Router for Pages + Components Architecture
 * Supports clean hash routing with route guards and dynamic page mounting
 */

import { state } from "./state.js";
import { api } from "./api.js";

export class Router {
  constructor(routes, mountElementId = "app-root") {
    this.routes = routes;
    this.mountElementId = mountElementId;
    this.currentRoute = null;

    window.addEventListener("hashchange", () => this.handleRouting());
    window.addEventListener("DOMContentLoaded", () => this.handleRouting());
  }

  getMountPoint() {
    return document.getElementById(this.mountElementId);
  }

  navigate(path) {
    window.location.hash = path.startsWith("#") ? path : `#${path}`;
  }

  async handleRouting() {
    const rawHash = window.location.hash.slice(1) || "/dashboard";
    const path = rawHash.startsWith("/") ? rawHash : `/${rawHash}`;

    // Auth Guard
    if (!api.token && path !== "/login") {
      this.navigate("/login");
      return;
    }

    if (api.token && path === "/login") {
      this.navigate("/dashboard");
      return;
    }

    // Match route (support dynamic parameters like /patient/:id)
    let matchedRoute = null;
    let params = {};

    for (const route of this.routes) {
      const paramNames = [];
      const regexPattern = route.path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        paramNames.push(name);
        return "([^/]+)";
      });

      const regex = new RegExp(`^${regexPattern}$`);
      const match = path.match(regex);

      if (match) {
        matchedRoute = route;
        paramNames.forEach((name, idx) => {
          params[name] = match[idx + 1];
        });
        break;
      }
    }

    if (!matchedRoute) {
      console.warn(`Route not found for path: ${path}, redirecting to dashboard`);
      this.navigate("/dashboard");
      return;
    }

    // Role Guard
    if (matchedRoute.roleRequired) {
      if (state.currentUser && state.currentUser.role !== matchedRoute.roleRequired) {
        alert("Access denied: You do not have permission to access this page.");
        this.navigate("/dashboard");
        return;
      }
    }

    const container = this.getMountPoint();
    if (!container) return;

    this.currentRoute = matchedRoute;

    // Render Page Component
    try {
      container.innerHTML = "";
      await matchedRoute.page.render(container, params);
      if (matchedRoute.page.afterRender) {
        await matchedRoute.page.afterRender(params);
      }
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(`Error rendering page at ${path}:`, err);
      container.innerHTML = `<div style="padding: 2rem; color: var(--critical);">Failed to render page: ${err.message}</div>`;
    }

    // Update active nav button state
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const targetView = btn.dataset.view;
      const isActive = path.includes(targetView);
      btn.classList.toggle("active", isActive);
    });
  }
}
