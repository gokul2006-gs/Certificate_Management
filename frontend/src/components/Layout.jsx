import { useState } from "react";
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
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import api, { getCsrfToken, clearCsrfCache } from "../services/api";

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
  const links = role === "admin" ? adminLinks : studentLinks;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post("/accounts/logout/");
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      clearCsrfCache();
      localStorage.clear();
      navigate(role === "admin" ? "/admin" : "/");
    }
  };

  return (
    <div className="min-h-screen lg:flex bg-slate-50/50">
      {/* Sidebar Navigation */}
      <aside className="glass-panel-dark text-white lg:fixed lg:inset-y-0 lg:w-72 lg:flex lg:flex-col lg:z-30">
        {/* Portal Branding */}
        <div className="border-b border-white/5 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-primary-500 to-cyan-400 text-slate-950 shadow-lg shadow-primary-500/20">
                <ShieldCheck size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary-400">Tech S Cube</p>
                <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Verification Portal
                </h1>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5 lg:hidden transition duration-200"
            >
              <Menu size={16} />
              Menu
              <ChevronDown className={`transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`} size={14} />
            </button>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav className={`${menuOpen ? "block" : "hidden"} px-4 py-4 lg:block lg:flex-1 lg:space-y-1.5 overflow-y-auto`}>
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                onClick={() => setMenuOpen(false)}
                to={item.to}
                className={({ isActive }) =>
                  `mb-1.5 flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold active:scale-[0.97] transition-all duration-200 last:mb-0 lg:mb-0 ${
                    isActive
                      ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-600/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:translate-x-1"
                  }`
                }
              >
                <Icon size={18} className="stroke-[2]" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Info Card widget */}
        <div className="hidden px-5 py-6 lg:block border-t border-white/5">
          <div className="rounded-xl border border-white/5 bg-white/3 p-4">
            <div className="flex items-center gap-2 text-primary-300">
              <QrCode size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Secure QR Core</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Every certificate has a unique, cryptographically signed verification signature.
            </p>
          </div>
        </div>

        {/* Logout Section */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className={`w-full ${menuOpen ? "flex" : "hidden"} items-center justify-center gap-2.5 rounded-xl border border-white/10 hover:border-red-500/20 px-4 py-3 text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 lg:flex transition duration-205 active:scale-[0.97]`}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area with remount key for page transition animation */}
      <main key={window.location.pathname} className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:ml-72 lg:px-10 animate-fade-in-up">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export default Layout;

export function PageHeader({ title, eyebrow, children }) {
  return (
    <div className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary-600">
            <GraduationCap className="shrink-0 text-primary-500" size={15} />
            <span className="break-words">{eyebrow}</span>
          </p>
        )}
        <h2 className="break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl font-display">{title}</h2>
      </div>
      {children}
    </div>
  );
}
