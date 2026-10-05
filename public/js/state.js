/**
 * Global Reactive Application State
 */

export const state = {
  currentUser: null,
  activePatientId: null,
  currentPatientData: null,
  allPatientsCache: [],
  alertsList: [],
  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notify() {
    this.listeners.forEach((listener) => listener(this));
  },

  setCurrentUser(user) {
    this.currentUser = user;
    this.notify();
  },

  setActivePatient(patientId, patientData = null) {
    this.activePatientId = patientId;
    this.currentPatientData = patientData;
    this.notify();
  },

  setPatientsCache(patients) {
    this.allPatientsCache = patients;
    this.notify();
  },
};
