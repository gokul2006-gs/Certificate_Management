import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  Database,
  FileUp,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "../navigation/AuthContext";

const adminLinks = [
  { to: "/admin-dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/students", label: "Students", icon: Users },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/upload-certificate", label: "Certificates", icon: FileUp },
  { to: "/database-connection", label: "Database", icon: Database },
];

const studentLinks = [
  { to: "/student-dashboard", label: "My Certificate", icon: Award },
];

function Layout({ children, role = "admin" }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const links = role === "admin" ? adminLinks : studentLinks;
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("cm-theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("cm-theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    const loginPath = await logout(role);
    navigate(loginPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 transition-colors lg:flex dark:bg-slate-950">
      <aside className="glass-panel-dark text-white lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="border-b border-white/5 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/20">
                <ShieldCheck size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-300">Tech S Cube</p>
                <h1 className="text-sm font-bold tracking-tight text-white">Certificate Portal</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/5 lg:hidden"
            >
              <Menu size={16} />
              <ChevronDown className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} size={14} />
            </button>
          </div>
        </div>

        <nav id="primary-navigation" aria-label="Primary navigation" className={`${menuOpen ? "block" : "hidden"} px-3 py-5 lg:block lg:flex-1 lg:space-y-1 lg:overflow-y-auto`}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                onClick={() => setMenuOpen(false)}
                to={item.to}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-primary-500/15 text-primary-200 ring-1 ring-inset ring-primary-400/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`
                }
              >
                <Icon size={18} className="stroke-[2]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/5 px-4 py-5 lg:block">
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3.5">
            <div className="flex items-center gap-2 text-primary-300">
              <QrCode size={16} />
              <span className="text-[11px] font-semibold">Secure QR verification</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Each credential is protected by a unique verification signature.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-white/5 p-3">
          <button
            type="button"
            onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={handleLogout}
            className={`${menuOpen ? "flex" : "hidden"} h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 lg:flex`}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

export default Layout;

export function PageHeader({ title, eyebrow, children }) {
  return (
    <div className="mb-7 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-400">
            <GraduationCap className="shrink-0 text-primary-500" size={14} />
            <span className="break-words">{eyebrow}</span>
          </p>
        )}
        <h2 className="break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[28px]">{title}</h2>
      </div>
      {children}
    </div>
  );
}
