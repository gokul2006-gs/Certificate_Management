import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  ChevronDown,
  Database,
  FileUp,
  GraduationCap,
  LogOut,
  Menu,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import api, { getCsrfToken } from "../services/api";

const adminLinks = [
  { to: "/admin-dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/students", label: "Students", icon: Users },
  { to: "/upload-certificate", label: "Certificates", icon: FileUp },
  { to: "/database-connection", label: "Database Connection", icon: Database },
];

const studentLinks = [
  { to: "/student-dashboard", label: "My Certificate", icon: Award },
];

function Layout({ children, role = "admin" }) {
  const navigate = useNavigate();
  const links = role === "admin" ? adminLinks : studentLinks;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await getCsrfToken();
    await api.post("/accounts/logout/");
    localStorage.clear();
    navigate(role === "admin" ? "/admin" : "/");
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:w-72">
        <div className="border-b border-white/10 px-4 py-4 lg:px-5 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-500 text-slate-950">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm text-cyan-200">Tech S Cube</p>
                <h1 className="text-lg font-semibold leading-tight">Certificate Portal</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-200 lg:hidden"
            >
              <Menu size={18} />
              Menu
              <ChevronDown className={`transition ${menuOpen ? "rotate-180" : ""}`} size={16} />
            </button>
          </div>
        </div>

        <nav className={`${menuOpen ? "block" : "hidden"} px-4 py-3 lg:block lg:space-y-2 lg:py-4`}>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                onClick={() => setMenuOpen(false)}
                to={item.to}
                className={({ isActive }) =>
                  `mb-2 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition last:mb-0 lg:mb-0 ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden px-4 py-5 lg:block">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 text-cyan-200">
              <QrCode size={20} />
              <span className="text-sm font-medium">QR Verification Ready</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Every uploaded certificate receives a public verification link.
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={`${menuOpen ? "flex" : "hidden"} m-4 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white lg:flex`}
        >
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-72 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

export default Layout;

export function PageHeader({ title, eyebrow, children }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            <GraduationCap className="shrink-0" size={16} />
            <span className="break-words">{eyebrow}</span>
          </p>
        )}
        <h2 className="break-words text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}
