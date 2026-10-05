/**
 * Central API Client & Authentication Management
 */

export const api = {
  token: localStorage.getItem("ped_token") || null,

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("ped_token", token);
    } else {
      localStorage.removeItem("ped_token");
    }
  },

  async request(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(endpoint, { ...options, headers });
    
    // Support file blob downloads (e.g. Excel template)
    if (options.responseType === "blob") {
      if (!res.ok) {
        throw new Error("Failed to download file");
      }
      return res.blob();
    }

    const data = await res.json();

    if (!res.ok) {
      if (data.code === "SHIFT_ACCESS_BLOCKED") {
        if (window.app && window.app.showLockout) {
          window.app.showLockout(data.message);
        }
        throw new Error(data.message);
      }
      if (res.status === 401 && !endpoint.includes("/login")) {
        if (window.app && window.app.logout) {
          window.app.logout();
        }
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(data.message || "An error occurred");
    }

    return data;
  },

  // Guidelines APIs
  async getGuidelines(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/guidelines${query ? `?${query}` : ""}`);
  },

  async getGuideline(id) {
    return this.request(`/api/guidelines/${id}`);
  },

  async createGuideline(data) {
    return this.request("/api/guidelines", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateGuideline(id, data) {
    return this.request(`/api/guidelines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteGuideline(id) {
    return this.request(`/api/guidelines/${id}`, {
      method: "DELETE",
    });
  },

  // Protocols APIs
  async getProtocols(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/protocols${query ? `?${query}` : ""}`);
  },

  async getProtocol(id) {
    return this.request(`/api/protocols/${id}`);
  },

  async createProtocol(data) {
    return this.request("/api/protocols", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateProtocol(id, data) {
    return this.request(`/api/protocols/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteProtocol(id) {
    return this.request(`/api/protocols/${id}`, {
      method: "DELETE",
    });
  },

  async executeProtocol(id, data) {
    return this.request(`/api/protocols/${id}/execute`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Shift & Roster APIs
  async getRoster(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/shifts/roster${query ? `?${query}` : ""}`);
  },

  async createShift(data) {
    return this.request("/api/shifts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateShift(id, data) {
    return this.request(`/api/shifts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteShift(id) {
    return this.request(`/api/shifts/${id}`, {
      method: "DELETE",
    });
  },

  async checkInShift(id) {
    return this.request(`/api/shifts/check-in/${id}`, {
      method: "POST",
    });
  },

  async checkOutShift(id, data = {}) {
    return this.request(`/api/shifts/check-out/${id}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async requestShiftSwap(data) {
    return this.request("/api/shifts/swaps", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getShiftSwaps(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/shifts/swaps${query ? `?${query}` : ""}`);
  },

  async reviewShiftSwap(id, data) {
    return this.request(`/api/shifts/swaps/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async uploadExcelShifts(formData) {
    return this.request("/api/shifts/upload-excel", {
      method: "POST",
      body: formData,
    });
  },

  async commitExcelShifts(rows) {
    return this.request("/api/shifts/commit-excel", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  },

  async downloadExcelTemplate() {
    return this.request("/api/shifts/excel-template", {
      responseType: "blob",
    });
  },

  // Manpower & Staffing APIs
  async getLiveCoverage() {
    return this.request("/api/manpower/live-coverage");
  },

  async getStaffProfiles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/manpower/staff${query ? `?${query}` : ""}`);
  },

  async createStaffProfile(data) {
    return this.request("/api/manpower/staff", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateStaffProfile(id, data) {
    return this.request(`/api/manpower/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteStaffProfile(id) {
    return this.request(`/api/manpower/staff/${id}`, {
      method: "DELETE",
    });
  },

  async getLeaves(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/manpower/leaves${query ? `?${query}` : ""}`);
  },

  async requestLeave(data) {
    return this.request("/api/manpower/leaves", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async reviewLeave(id, data) {
    return this.request(`/api/manpower/leaves/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};
