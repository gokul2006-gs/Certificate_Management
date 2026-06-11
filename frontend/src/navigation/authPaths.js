export function getLoginPath(requiredRole) {
  return requiredRole === "admin" ? "/admin" : "/";
}

export function getDashboardPath(role) {
  return role === "admin" ? "/admin-dashboard" : "/student-dashboard";
}

export function isPublicPath(pathname) {
  return (
    pathname === "/" ||
    pathname === "/admin" ||
    /^\/verify\/[^/]+$/.test(pathname)
  );
}
