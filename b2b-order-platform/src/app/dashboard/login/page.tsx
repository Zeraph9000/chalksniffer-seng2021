"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export default function SellerLoginPage() {
  return (
    <Suspense>
      <SellerLoginPageInner />
    </Suspense>
  );
}

function SellerLoginPageInner() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login?role=seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
    <div className="relative min-h-screen bg-paper">
      <Link
        href="/"
        className="absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-paper px-3 py-1.5 text-[12.5px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-[13px] w-[13px]" />
        Back to Marketplace
      </Link>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        <div
          className="relative hidden flex-col justify-between gap-8 overflow-hidden bg-ink px-[52px] py-[44px] text-[#e7e9ec] lg:flex"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(224,90,43,.14) 0 180px, transparent 200px), radial-gradient(rgba(255,255,255,.04) 1px, transparent 1.5px)",
            backgroundSize: "auto, 16px 16px",
          }}
        >
          <div className="relative">
            <BrandLockup variant="light" size="md" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-[10px] text-[11.5px] font-medium uppercase tracking-[.14em] text-hot">
              <span className="inline-block h-px w-[18px] bg-hot" />
              Seller sign in
            </div>
            <h2 className="mt-[18px] mb-[18px] max-w-[400px] font-display text-[44px] font-bold leading-[1] tracking-[-.028em] text-paper">
              Your store, your checkout.
            </h2>
            <p className="m-0 max-w-[380px] text-[14.5px] leading-[1.6] text-[#9aa0a9]">
              Manage products, orders, and recurring deliveries across every channel — from
              one dashboard.
            </p>
          </div>

          <div />
        </div>

        <div className="flex items-center justify-center bg-paper-2 px-6 py-12 sm:px-[48px] sm:py-[48px]">
          <div className="w-full max-w-[400px]">
            <div className="text-[11px] font-medium uppercase tracking-[.12em] text-ink-3">
              Seller sign in
            </div>
            <h1 className="mt-2 mb-1.5 font-display text-[28px] font-semibold tracking-[-.022em] text-ink">
              Sign in to your store
            </h1>
            <p className="mb-[26px] text-[13px] leading-[1.55] text-ink-3">
              Use your Ledgr seller credentials to reach the store dashboard.
            </p>

            <form onSubmit={handleSubmit} className="space-y-[14px]">
              <div>
                <Label htmlFor="seller-email" className="mb-[7px]">
                  Email
                </Label>
                <Input
                  id="seller-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-[7px] flex items-center justify-between">
                  <Label htmlFor="seller-password" className="mb-0">
                    Password
                  </Label>
                  <Link
                    href="/dashboard/login/forgot"
                    className="text-[11.5px] font-medium text-ink-3 hover:text-hot"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="seller-password"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={showPw ? "" : "font-mono tracking-[.1em]"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-3 hover:text-ink"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="mt-2 h-[46px] w-full"
              >
                {loading ? "Signing in…" : "Sign in"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="my-[22px] mb-[18px] flex items-center gap-[14px] text-[12px] text-ink-4">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <p className="text-center text-[13px] text-ink-3">
              New seller?{" "}
              <Link
                href="/register?role=seller"
                className="font-medium text-ink underline underline-offset-[3px] hover:text-hot"
              >
                Create a store →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
