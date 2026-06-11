import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthService from "./AuthService";
import { RouteGuard } from "./RouteGuard";
import RouteLoading from "./RouteLoading";

function PublicRoute({ children }) {
  const guard = useMemo(() => new RouteGuard({ guestOnly: true }), []);
  const [result, setResult] = useState({ status: "loading" });

  useEffect(() => {
    let active = true;

    guard
      .check()
      .then((decision) => {
        if (!active) return;
        setResult(
          decision.allowed
            ? { status: "allowed" }
            : { status: "redirect", redirect: decision.redirect }
        );
      })
      .catch(() => {
        if (active) {
          AuthService.clearLocal();
          setResult({ status: "allowed" });
        }
      });

    return () => {
      active = false;
    };
  }, [guard]);

  if (result.status === "loading") {
    return <RouteLoading message="Loading portal..." />;
  }

  if (result.status === "redirect") {
    return <Navigate to={result.redirect} replace />;
  }

  return children;
}

export default PublicRoute;
