import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AuthService from "./AuthService";

const AuthContext = createContext(null);

export class AuthController {
  async loadSession() {
    const session = await AuthService.fetchSession();
    return AuthService.syncFromSession(session);
  }

  isAdmin(session) {
    return Boolean(session?.authenticated && session.role === "admin");
  }

  isStudent(session) {
    return Boolean(
      session?.authenticated && session.role === "student" && session.student_id
    );
  }

  isGuest(session) {
    return !session?.authenticated;
  }
}

export function AuthProvider({ children }) {
  const controller = useMemo(() => new AuthController(), []);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const nextSession = await controller.loadSession();
    setSession(nextSession);
    return nextSession;
  }, [controller]);

  useEffect(() => {
    let active = true;

    controller
      .loadSession()
      .then((nextSession) => {
        if (active) {
          setSession(nextSession);
        }
      })
      .catch(() => {
        if (active) {
          AuthService.clearLocal();
          setSession({ authenticated: false });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [controller]);

  const value = useMemo(
    () => ({
      session,
      loading,
      controller,
      refreshSession,
      setSession,
    }),
    [session, loading, controller, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
