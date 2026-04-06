"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("buyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint =
      mode === "register" ? "/api/auth/register" : "/api/auth/login";

    const payload =
      mode === "register"
        ? { name, email, password, role }
        : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <svg className="mb-3 h-12 w-12" viewBox="0 0 40 40" fill="none">
            <path d="M4 36V12l10-8v32H4z" fill="#e55a2d" />
            <rect x="7" y="20" width="4" height="16" fill="white" />
            <path d="M18 36V8l10-4v32H18z" fill="#e55a2d" />
            <rect x="21" y="16" width="4" height="6" fill="white" />
            <rect x="21" y="26" width="4" height="10" fill="white" />
            <path d="M28 36V14l8 4v18H28z" fill="#e55a2d" />
          </svg>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#c4410a]">
            Ledgr
          </h1>
          <p className="text-xs text-ink-faint mt-1">
            Construction Supply Management
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === "register"
              ? "Set up your account to manage orders"
              : "Welcome back"}
          </p>
        </div>

        <div className="card p-6">
          {/* Mode toggle */}
          <div className="mb-6 flex rounded-lg bg-surface p-1">
            {(["register", "login"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {m === "register" ? "Register" : "Login"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="input-label mb-2 block">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("buyer")}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      role === "buyer"
                        ? "border-accent-primary bg-accent-primary-muted text-accent-primary"
                        : "border-surface-border text-ink-muted hover:text-ink"
                    }`}
                  >
                    Contractor
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("seller")}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      role === "seller"
                        ? "border-accent-primary bg-accent-primary-muted text-accent-primary"
                        : "border-surface-border text-ink-muted hover:text-ink"
                    }`}
                  >
                    Supplier
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "register"
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          {mode === "register" ? "Already have an account? " : "New here? "}
          <button
            type="button"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
            className="text-accent-primary hover:underline"
          >
            {mode === "register" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
