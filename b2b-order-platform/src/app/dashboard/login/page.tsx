"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export default function SellerLoginPage() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/dashboard");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [streetName, setStreetName] = useState("");
  const [cityName, setCityName] = useState("");
  const [postalZone, setPostalZone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "register" ? "/api/auth/register?role=seller" : "/api/auth/login?role=seller";
    const payload =
      mode === "register"
        ? {
            name, email, password, role: "seller",
            companyName, abn, phone,
            address: { streetName, cityName, postalZone, country: "AU" },
          }
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
      window.location.href = next;
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <svg className="mb-3 h-12 w-12" viewBox="0 0 40 40" fill="none">
            <path d="M4 36V12l10-8v32H4z" fill="#d4531e" />
            <rect x="7" y="20" width="4" height="16" fill="white" />
            <path d="M18 36V8l10-4v32H18z" fill="#d4531e" />
            <rect x="21" y="16" width="4" height="6" fill="white" />
            <rect x="21" y="26" width="4" height="10" fill="white" />
            <path d="M28 36V14l8 4v18H28z" fill="#d4531e" />
          </svg>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#d4531e]">Ledgr</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {mode === "register" ? "Create your seller account" : "Seller sign in"}
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-6 flex rounded-lg bg-surface p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-2 text-sm font-medium ${
                  mode === m ? "bg-white text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {m === "register" ? "Register" : "Login"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="input-label">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" />
                </div>
              </>
            )}
            <div>
              <label className="input-label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete={mode === "register" ? "new-password" : "current-password"} />
            </div>

            {mode === "register" && (
              <>
                <fieldset className="rounded-lg border border-surface-border p-4">
                  <legend className="text-sm font-medium text-ink px-1">Business Details</legend>
                  <div className="mt-2 space-y-3">
                    <div>
                      <label className="input-label">Company Name</label>
                      <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input mt-1" autoComplete="organization" />
                    </div>
                    <div>
                      <label className="input-label">ABN</label>
                      <input type="text" required value={abn} onChange={(e) => setAbn(e.target.value)} className="input mt-1" placeholder="11 digit ABN" />
                    </div>
                  </div>
                </fieldset>
                <fieldset className="rounded-lg border border-surface-border p-4">
                  <legend className="text-sm font-medium text-ink px-1">Business Address</legend>
                  <div className="mt-2 space-y-3">
                    <div>
                      <label className="input-label">Street Address</label>
                      <input type="text" required value={streetName} onChange={(e) => setStreetName(e.target.value)} className="input mt-1" autoComplete="street-address" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">City</label>
                        <input type="text" required value={cityName} onChange={(e) => setCityName(e.target.value)} className="input mt-1" autoComplete="address-level2" />
                      </div>
                      <div>
                        <label className="input-label">Postal Code</label>
                        <input type="text" required value={postalZone} onChange={(e) => setPostalZone(e.target.value)} className="input mt-1" autoComplete="postal-code" />
                      </div>
                    </div>
                  </div>
                </fieldset>
              </>
            )}

            {error && (
              <p className="rounded-lg bg-semantic-danger-muted border border-red-200 px-3 py-2 text-sm text-semantic-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
              {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
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
        <p className="mt-6 text-center text-xs text-ink-faint">
          Shopping? <a className="underline" href="/login">Buyer sign in</a>
        </p>
      </div>
    </div>
  );
}
