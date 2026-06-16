import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LogIn, Eye, EyeOff } from "lucide-react";
import api, { formatApiError } from "../services/api";
import { useAuth } from "../navigation/AuthContext";

function AdminLogin() {
	const navigate = useNavigate();
	const { refreshSession } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const handleLogin = async (event) => {
		event.preventDefault();
		setLoading(true);
		setError("");

		try {
			await api.post("/accounts/login/", {
				role: "admin",
				username,
				password,
			});

			await refreshSession();
			navigate("/admin-dashboard", { replace: true });
		} catch (err) {
			setError(formatApiError(err, "Login failed"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16 bg-slate-50/30">
			<div className="w-full max-w-md animate-scale-in">
				<div className="mb-8 text-center animate-fade-in-down">
					<div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white shadow-xl">
						<ShieldCheck size={32} className="stroke-[1.75]" />
					</div>
					<p className="text-xs font-bold uppercase tracking-widest text-primary-600">Tech S Cube Admin</p>
					<h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl font-display">Administrator Console</h1>
				</div>

				<form onSubmit={handleLogin} className="glass-panel w-full rounded-2xl p-8 shadow-xl transition-all duration-500 border border-white/60">
					<h2 className="mb-6 text-lg font-bold tracking-tight text-slate-800">Administrator sign in</h2>

					{error && (
						<div className="mb-6 rounded-xl bg-red-50 border border-red-200/50 p-4 text-sm text-red-700">
							<p className="font-semibold">Sign-in Error</p>
							<p className="mt-0.5 text-xs text-red-600/90">{error}</p>
						</div>
					)}

					<label className="mb-4 block">
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Username</span>
						<input
							value={username}
							required
							onChange={(e) => setUsername(e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-primary-500 focus:bg-white transition-all duration-300"
							placeholder="admin"
						/>
					</label>

					<label className="mb-6 block">
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Password</span>
						<div className="relative">
							<input
								type={showPassword ? "text" : "password"}
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 pr-12 outline-none focus:border-primary-500 focus:bg-white transition-all duration-300"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-600 transition-colors duration-200"
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
							</button>
						</div>
					</label>

					<button
						disabled={loading}
						className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition duration-300 shadow-md shadow-slate-950/10"
					>
						<LogIn size={16} className={loading ? "animate-pulse" : ""} />
						{loading ? "Signing in..." : "Sign in"}
					</button>

					<div className="mt-6 border-t border-slate-100 pt-5 text-center">
						<Link to="/" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 transition-all duration-200">
							Student access
						</Link>
					</div>
				</form>
			</div>
		</main>
	);
}

export default AdminLogin;

