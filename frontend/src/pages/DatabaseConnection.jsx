import { useState } from "react";
import { Database, HardDrive, RefreshCw } from "lucide-react";
import Layout, { PageHeader } from "../components/Layout";
import api from "../services/api";

function DatabaseConnection() {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setStatus(null);
    setMessage("");

    try {
      const response = await api.get("/accounts/db-connection/");
      setStatus(response.data.status || "connected");
      setMessage(response.data.message || "Database connection is healthy.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to connect to the database. Verify the MONGODB_URI connection string."
      );
    } finally {
      setLoading(false);
    }
  };

  const panelStyles = status === "connected"
    ? "bg-emerald-50/70 border-emerald-200/50 text-emerald-800"
    : status === "error"
      ? "bg-rose-50/70 border-rose-200/50 text-rose-800"
      : "bg-slate-50/80 border-slate-200/50 text-slate-500";

  return (
    <Layout role="admin">
      <PageHeader title="Database Status" eyebrow="Diagnostics & health" />

      <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-base font-bold tracking-tight text-slate-800">Test database connectivity</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Check the integrity of the connection to the MongoDB replica set or cluster. This confirms that credentials, network paths, and access policies are valid.
            </p>
          </div>

          <button
            type="button"
            onClick={testConnection}
            disabled={loading}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-850 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition duration-200 shadow-md shadow-slate-950/15"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Testing..." : "Trigger Status Check"}
          </button>
        </div>

        {/* Diagnostics status card */}
        <div className={`rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${panelStyles}`}>
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl transition-all duration-300 ${
              loading ? "animate-pulse" : ""
            } ${
              status === "connected" ? "bg-emerald-100 text-emerald-600 animate-float" :
              status === "error" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
            }`}>
              {status === "connected" ? <Database size={18} /> : <HardDrive size={18} />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Connection</p>
              <h4 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-800 font-display">
                {status === "connected" ? "Operational" : status === "error" ? "Disrupted" : "Not Audited"}
              </h4>
            </div>
          </div>

          {message && (
            <div className="mt-5 border-t border-slate-200/50 pt-4 text-xs font-semibold leading-relaxed text-slate-600">
              {message}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

export default DatabaseConnection;
