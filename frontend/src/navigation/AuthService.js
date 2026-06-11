import { getDashboardPath, getLoginPath } from "./authPaths";

class AuthService {
  static STORAGE_KEYS = {
    role: "role",
    studentId: "student_id",
  };

  static async fetchSession() {
    const { default: api } = await import("../services/api");
    const response = await api.get("/accounts/session/");
    return response.data;
  }

  static syncFromSession(session) {
    if (!session?.authenticated) {
      this.clearLocal();
      return session;
    }

    localStorage.setItem(this.STORAGE_KEYS.role, session.role);
    if (session.student_id) {
      localStorage.setItem(this.STORAGE_KEYS.studentId, session.student_id);
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.studentId);
    }

    return session;
  }

  static clearLocal() {
    localStorage.removeItem(this.STORAGE_KEYS.role);
    localStorage.removeItem(this.STORAGE_KEYS.studentId);
  }

  static clearAll() {
    localStorage.clear();
  }

  static getRole() {
    return localStorage.getItem(this.STORAGE_KEYS.role);
  }

  static getStudentId() {
    return localStorage.getItem(this.STORAGE_KEYS.studentId);
  }

  static getLoginPath(requiredRole) {
    return getLoginPath(requiredRole);
  }

  static getDashboardPath(role) {
    return getDashboardPath(role);
  }
}

export { isPublicPath } from "./authPaths";

export default AuthService;
