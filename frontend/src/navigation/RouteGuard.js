import AuthService from "./AuthService";

export class RouteGuard {
  constructor({ requiredRole = null, guestOnly = false } = {}) {
    this.requiredRole = requiredRole;
    this.guestOnly = guestOnly;
  }

  evaluate(session) {
    const authenticated = Boolean(session?.authenticated);

    if (this.guestOnly) {
      if (!authenticated) {
        return { allowed: true };
      }

      return {
        allowed: false,
        redirect: AuthService.getDashboardPath(session.role),
      };
    }

    if (!authenticated) {
      return {
        allowed: false,
        redirect: AuthService.getLoginPath(this.requiredRole),
      };
    }

    if (this.requiredRole === "admin" && session.role !== "admin") {
      return {
        allowed: false,
        redirect: "/",
      };
    }

    if (this.requiredRole === "student") {
      if (session.role !== "student" || !session.student_id) {
        return {
          allowed: false,
          redirect: "/",
        };
      }
    }

    return { allowed: true };
  }

  async check() {
    const session = await AuthService.fetchSession();
    AuthService.syncFromSession(session);
    return this.evaluate(session);
  }
}
