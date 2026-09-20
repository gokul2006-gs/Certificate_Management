function RouteLoading({ message = "Checking session..." }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">{message}</p>
    </main>
  );
}

export default RouteLoading;
