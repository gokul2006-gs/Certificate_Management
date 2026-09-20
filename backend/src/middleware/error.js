export function notFound(_req, res) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({
    error: message,
    detail: err.detail || undefined,
  });
}
