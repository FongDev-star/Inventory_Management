import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  width: "18",
  height: "18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.7",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const BoxIcon = () => (
  <svg {...iconProps} width="24" height="24">
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5" />
    <path d="M12 13v8" />
  </svg>
);

const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const EyeIcon = ({ off }) => (
  <svg {...iconProps}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" />}
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isLoggingIn } = useAuthStore();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email.trim(), password);
    if (ok) navigate("/");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-base-200 px-5">
      {/* soft background glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/20 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-secondary/20 blur-3xl"></div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-base-300 bg-base-100 p-8 shadow-2xl sm:p-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/30">
            <BoxIcon />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm opacity-60">Sign in to continue</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center opacity-50">
              <MailIcon />
            </span>
            <input
              type="email"
              className="input h-12 w-full rounded-xl bg-base-200/60 pl-11"
              placeholder="Email address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center opacity-50">
              <LockIcon />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              className="input h-12 w-full rounded-xl bg-base-200/60 pl-11 pr-12"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center px-4 opacity-50 transition-opacity hover:opacity-100"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
        </div>

        <button
          className="btn btn-primary mt-7 h-12 w-full rounded-xl text-base"
          type="submit"
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </div>
  );
}