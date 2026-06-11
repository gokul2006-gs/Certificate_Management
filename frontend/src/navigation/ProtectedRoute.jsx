import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./AuthService";
import { useAuth } from "./AuthContext";
import { RouteGuard } from "./RouteGuard";
import RouteLoading from "./RouteLoading";

function ProtectedRoute({ children, role }) {
  const { session, loading, controller, refreshSession } = useAuth();
  const guard = useMemo(() => new RouteGuard({ requiredRole: role }), [role]);
  const [result, setResult] = useState({ status: "loading" });

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      try {
        const currentSession = session ?? (await refreshSession());
        const decision = guard.evaluate(currentSession);

        if (!active) return;

        setResult(
          decision.allowed
            ? { status: "authorized" }
            : { status: "denied", redirect: decision.redirect }
        );
      } catch {
        if (active) {
          AuthService.clearAll();
          setResult({
            status: "denied",
            redirect: AuthService.getLoginPath(role),
          });
        }
      }
    };

    if (!loading) {
      verifyAccess();
    }

    return () => {
      active = false;
    };
  }, [guard, role, session, loading, refreshSession, controller]);

  if (loading || result.status === "loading") {
    return <RouteLoading />;
  }

  if (result.status === "denied") {
    AuthService.clearAll();
    return <Navigate to={result.redirect} replace />;
  }

  return children;
}

export default ProtectedRoute;
