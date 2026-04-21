"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function safeNext(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

type Role = "buyer" | "seller";

function scorePassword(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  const clamped = Math.min(score, 4);
  if (!pw) return { score: 0, label: "", color: "var(--ink-4)" };
  if (clamped <= 1) return { score: 25, label: "Weak", color: "var(--danger)" };
  if (clamped === 2) return { score: 50, label: "Fair", color: "var(--warn)" };
  if (clamped === 3) return { score: 75, label: "Good", color: "var(--accent)" };
  return { score: 100, label: "Strong", color: "var(--accent)" };
}

export default function RegisterPage() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/");
  const initialRole: Role = params.get("role") === "seller" ? "seller" : "buyer";

  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("AU");
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Guest-order claim banner — placeholder wiring. In the future, fetch
  // /api/orders/guest?email= count and stash in state. Until then, render
  // the banner only when there's a non-zero guestOrderCount.
  const guestOrderCount = 0;

  const strength = scorePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms and Privacy policy");
      return;
    }
    setLoading(true);
    const endpoint = role === "seller" ? "/api/auth/register?role=seller" : "/api/auth/register";
    const payload = {
      name: [firstName, lastName].filter(Boolean).join(" ").trim(),
      email,
      password,
      role,
      companyName,
      abn,
      phone,
      address: {
        streetName: [building, street].filter(Boolean).join(" ").trim(),
        cityName: suburb,
        postalZone: postcode,
        country,
      },
    };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
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
        {/* Left editorial panel */}
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
              Create an account
            </div>
            <h2 className="mt-[18px] mb-[18px] max-w-[400px] font-display text-[44px] font-bold leading-[1] tracking-[-.028em] text-paper">
              Independent shops in one checkout.
            </h2>
            <p className="m-0 max-w-[380px] text-[14.5px] leading-[1.6] text-[#9aa0a9]">
              Browse stores run by the people who make the products. One cart per shop, one
              checkout per order, one tracking link per email — and the option to have the
              things you reorder delivered on repeat.
            </p>
          </div>

          <div />
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center bg-paper-2 px-6 py-12 sm:px-[48px] sm:py-[48px]">
          <div className="w-full max-w-[520px]">
            <div className="text-[11px] font-medium uppercase tracking-[.12em] text-ink-3">
              Create your account
            </div>
            <h1 className="mt-2 mb-1.5 font-display text-[28px] font-semibold tracking-[-.022em] text-ink">
              Join Ledgr
            </h1>
            <p className="mb-[22px] text-[13px] leading-[1.55] text-ink-3">
              Pick the account type — you can switch later from your profile.
            </p>

            {/* Role toggle */}
            <ToggleGroup
              type="single"
              value={role}
              onValueChange={(v) => v && setRole(v as Role)}
              className="mb-[22px] grid w-full grid-cols-2 gap-[3px] rounded-[10px] border border-line bg-paper-2 p-[3px]"
            >
              <ToggleGroupItem
                value="buyer"
                aria-label="Buyer"
                className="flex h-auto flex-col items-center gap-[3px] rounded-[7px] px-[14px] py-[10px] text-[13px] font-medium text-ink-2 hover:bg-transparent data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,.06)]"
              >
                <span>Buyer</span>
                <span className="text-[11px] font-normal text-ink-3">
                  Shop independent stores
                </span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="seller"
                aria-label="Seller"
                className="flex h-auto flex-col items-center gap-[3px] rounded-[7px] px-[14px] py-[10px] text-[13px] font-medium text-ink-2 hover:bg-transparent data-[state=on]:bg-paper data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_3px_rgba(0,0,0,.06)]"
              >
                <span>Seller</span>
                <span className="text-[11px] font-normal text-ink-3">
                  Run your own store
                </span>
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Guest-order claim banner (placeholder — shows only when count > 0) */}
            {guestOrderCount > 0 && (
              <div className="mb-[18px] flex items-start gap-[10px] rounded-[10px] border border-accent bg-accent-soft px-[14px] py-3 text-[12.5px] leading-[1.5] text-[#0a4a34]">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  We found <strong className="font-display font-semibold">{guestOrderCount} guest orders</strong> tied to{" "}
                  <strong className="font-display font-semibold">{email || "this email"}</strong>. Finish registering and we&apos;ll
                  link them to your account automatically.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-[14px]">
              <div>
                <Label htmlFor="reg-email" className="mb-[7px]">
                  Email
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-password" className="mb-[7px]">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="new-password"
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
                  {password && (
                    <div className="mt-[6px] flex items-center gap-2 text-[11px] text-ink-3">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${strength.score}%`, background: strength.color }}
                        />
                      </div>
                      <span
                        className="font-mono text-[10.5px]"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-confirm" className="mb-[7px]">
                    Confirm
                  </Label>
                  <Input
                    id="reg-confirm"
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={showPw ? "" : "font-mono tracking-[.1em]"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reg-first" className="mb-[7px]">
                    First name
                  </Label>
                  <Input
                    id="reg-first"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reg-last" className="mb-[7px]">
                    Last name
                  </Label>
                  <Input
                    id="reg-last"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reg-phone" className="mb-[7px]">
                  Phone
                </Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Business details (optional) */}
              <div className="mt-[18px] border-t border-line-2 pt-[18px]">
                <div className="mb-1.5 font-display text-[13.5px] font-semibold tracking-[-.005em] text-ink">
                  Business details{" "}
                  <span className="text-[12px] font-normal text-ink-4">(optional)</span>
                </div>
                <p className="mb-[14px] text-[12px] text-ink-3">
                  Fill these in if you&apos;ll occasionally order on behalf of a company.
                  Required for tax invoices.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="reg-company" className="mb-[7px]">
                      Company
                    </Label>
                    <Input
                      id="reg-company"
                      placeholder="e.g. Ledgr Pty Ltd"
                      autoComplete="organization"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-abn" className="mb-[7px]">
                      ABN
                    </Label>
                    <Input
                      id="reg-abn"
                      className="font-mono"
                      placeholder="00 000 000 000"
                      value={abn}
                      onChange={(e) => setAbn(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Default delivery address (optional) */}
              <div className="mt-[18px] border-t border-line-2 pt-[18px]">
                <div className="mb-1.5 font-display text-[13.5px] font-semibold tracking-[-.005em] text-ink">
                  Default delivery address{" "}
                  <span className="text-[12px] font-normal text-ink-4">(optional)</span>
                </div>
                <p className="mb-[14px] text-[12px] text-ink-3">
                  Pre-fills at checkout. You can change it per-order.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="reg-building" className="mb-[7px]">
                      Building / unit
                    </Label>
                    <Input
                      id="reg-building"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-street" className="mb-[7px]">
                      Street
                    </Label>
                    <Input
                      id="reg-street"
                      autoComplete="street-address"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="reg-suburb" className="mb-[7px]">
                      Suburb
                    </Label>
                    <Input
                      id="reg-suburb"
                      autoComplete="address-level2"
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-postcode" className="mb-[7px]">
                      Postcode
                    </Label>
                    <Input
                      id="reg-postcode"
                      autoComplete="postal-code"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-country" className="mb-[7px]">
                      Country
                    </Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="reg-country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="NZ">New Zealand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <label className="mt-[14px] flex cursor-pointer items-start gap-[10px] text-[12.5px] leading-[1.5] text-ink-2">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <span>
                  I agree to Ledgr&apos;s{" "}
                  <Link
                    href="/terms"
                    className="text-ink underline underline-offset-2 hover:text-hot"
                  >
                    Terms of use
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-ink underline underline-offset-2 hover:text-hot"
                  >
                    Privacy policy
                  </Link>
                  .
                </span>
              </label>

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
                {loading ? "Creating account…" : "Create account"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-ink-3">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-ink underline underline-offset-[3px] hover:text-hot"
              >
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
