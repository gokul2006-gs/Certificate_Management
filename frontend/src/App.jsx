import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";

import ProtectedRoute from "./navigation/ProtectedRoute";
import RouteLoading from "./navigation/RouteLoading";
import { APP_ROUTES } from "./navigation/appRoutes";

function wrapRoute(route) {
  const Page = route.element;
  const pageContent = (
    <Suspense fallback={<RouteLoading message="Loading page..." />}>
      <Page />
    </Suspense>
  );

  if (route.access === "open" || route.access === "guest") {
    return pageContent;
  }

  return (
    <ProtectedRoute role={route.role}>
      {pageContent}
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {APP_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={wrapRoute(route)}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
