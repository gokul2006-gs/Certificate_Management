import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./AuthService";
import { RouteGuard } from "./RouteGuard";
import RouteLoading from "./RouteLoading";

function ProtectedRoute({ children, role }) {
  const guard = useMemo(() => new RouteGuard({ requiredRole: role }), [role]);
  const [result, setResult] = useState({ status: "loading" });

  useEffect(() => {
    let active = true;

    guard
      .check()
      .then((decision) => {
        if (!active) return;
        setResult(
          decision.allowed
            ? { status: "authorized" }
            : { status: "denied", redirect: decision.redirect }
        );
      })
      .catch(() => {
        if (active) {
          AuthService.clearAll();
          setResult({
            status: "denied",
            redirect: AuthService.getLoginPath(role),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [guard, role]);

  if (result.status === "loading") {
    return <RouteLoading />;
  }

  if (result.status === "denied") {
    AuthService.clearAll();
    return <Navigate to={result.redirect} replace />;
  }

  return children;
}

export default ProtectedRoute;
