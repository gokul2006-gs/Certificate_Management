import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./AuthService";
import { useAuth } from "./AuthContext";
import { RouteGuard } from "./RouteGuard";
import RouteLoading from "./RouteLoading";

function PublicRoute({ children }) {
  const { session, loading, refreshSession } = useAuth();
  const guard = useMemo(() => new RouteGuard({ guestOnly: true }), []);
  const [result, setResult] = useState({ status: "loading" });

  useEffect(() => {
    let active = true;

    const verifyGuestAccess = async () => {
      try {
        const currentSession = session ?? (await refreshSession());
        const decision = guard.evaluate(currentSession);

        if (!active) return;

        setResult(
          decision.allowed
            ? { status: "allowed" }
            : { status: "redirect", redirect: decision.redirect }
        );
      } catch {
        if (active) {
          AuthService.clearLocal();
          setResult({ status: "allowed" });
        }
      }
    };

    if (!loading) {
      verifyGuestAccess();
    }

    return () => {
      active = false;
    };
  }, [guard, session, loading, refreshSession]);

  if (loading || result.status === "loading") {
    return <RouteLoading message="Loading portal..." />;
  }

  if (result.status === "redirect") {
    return <Navigate to={result.redirect} replace />;
  }

  return children;
}

export default PublicRoute;
