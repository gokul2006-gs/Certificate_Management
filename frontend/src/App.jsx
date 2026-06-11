import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./navigation/ProtectedRoute";
import { APP_ROUTES } from "./navigation/appRoutes";

function wrapRoute(route) {
  const Page = route.element;

  if (route.access === "open" || route.access === "guest") {
    return <Page />;
  }

  return (
    <ProtectedRoute role={route.role}>
      <Page />
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
