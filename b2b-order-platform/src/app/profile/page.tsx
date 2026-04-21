"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Box,
  Lock,
  MapPin,
  ShoppingCart,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { MarketplaceTopNav } from "@/components/ledgr/marketplace-top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  role: "buyer" | "seller";
  companyName: string;
  abn: string;
  avatarUrl?: string;
  createdAt?: string;
  address: {
    streetName: string;
    cityName: string;
    postalZone: string;
    country: string;
  };
};

type Stats = {
  ordersPlaced: number;
  activeRecurring: number;
  shopsOrderedFrom: number;
};

type SidebarKey =
  | "personal"
  | "addresses"
  | "business"
  | "security"
  | "notifications";

const sidebarItems: { key: SidebarKey; label: string; Icon: typeof UserIcon }[] = [
  { key: "personal", label: "Personal", Icon: UserIcon },
  { key: "addresses", label: "Addresses", Icon: MapPin },
  { key: "business", label: "Business details", Icon: Box },
  { key: "security", label: "Security", Icon: Lock },
  { key: "notifications", label: "Notifications", Icon: Bell },
];

function splitName(full: string): [string, string] {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0], ""];
  return [parts[0], parts.slice(1).join(" ")];
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function formatJoined(raw: string | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function formatJoinedShort(raw: string | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats] = useState<Stats>({ ordersPlaced: 0, activeRecurring: 0, shopsOrderedFrom: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [active, setActive] = useState<SidebarKey>("personal");

  // Personal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Business
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");

  // Address
  const [building, setBuilding] = useState("");
  const [street, setStreet] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("AU");

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/login?next=/profile";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(data);
        const [f, l] = splitName(data.name || "");
        setFirstName(f);
        setLastName(l);
        setPhone(data.phone || "");
        setCompanyName(data.companyName || "");
        setAbn(data.abn || "");
        // Heuristic: split streetName into building + street if possible.
        const sn = data.address?.streetName || "";
        const m = sn.match(/^(\S+)\s+(.+)$/);
        if (m && /\d/.test(m[1])) {
          setBuilding(m[1]);
          setStreet(m[2]);
        } else {
          setBuilding("");
          setStreet(sn);
        }
        setSuburb(data.address?.cityName || "");
        setPostcode(data.address?.postalZone || "");
        setCountry(data.address?.country || "AU");
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveFields(fields: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save", "error");
        return;
      }
      setProfile(data);
      showToast("Changes saved", "success");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  const navUser = useMemo(
    () => (profile ? { name: profile.name, avatar: profile.avatarUrl ?? null } : undefined),
    [profile]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-2">
        <MarketplaceTopNav active="profile" user={navUser} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[13px] text-ink-3">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-paper-2">
        <MarketplaceTopNav active="profile" user={navUser} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[13px] text-danger">Failed to load profile</p>
        </div>
      </div>
    );
  }

  const isBuyer = profile.role === "buyer";

  return (
    <div className="min-h-screen bg-paper-2">
      <MarketplaceTopNav active="profile" user={navUser} />

      {toast && (
        <div
          className={cn(
            "fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-md border px-4 py-2 text-[13px] shadow-sm",
            toast.type === "success"
              ? "border-accent/30 bg-accent-soft text-[#0a4a34]"
              : "border-danger/40 bg-danger-soft text-danger"
          )}
        >
          {toast.message}
        </div>
      )}

      <div className="bg-paper-2 px-6 py-8">
        <div className="mx-auto max-w-[1100px]">
          {/* Account header card */}
          <div className="mb-6 overflow-hidden rounded-[14px] border border-line bg-paper">
            <div
              className="relative flex items-center gap-[22px] px-9 py-11"
              style={{
                background:
                  "radial-gradient(circle at 95% 0%, rgba(224,90,43,.18) 0 220px, transparent 240px), linear-gradient(180deg, #151719 0%, #0c0d10 100%)",
              }}
            >
              <div
                className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-paper font-display text-[26px] font-bold tracking-[-.02em] text-ink"
                style={{
                  border: "3px solid rgba(255,255,255,.12)",
                  boxShadow: "0 4px 14px rgba(0,0,0,.25)",
                }}
              >
                {initials(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="mb-1.5 font-display text-[24px] font-semibold tracking-[-.02em] text-paper">
                  {profile.name || "Unnamed"}
                </h1>
                <div className="flex flex-wrap items-center gap-[10px] text-[12.5px] text-[rgba(255,255,255,.7)]">
                  <span className="inline-flex items-center gap-1.5 font-display text-[13px] font-semibold tracking-[-.005em] text-hot">
                    <ShoppingCart className="h-[14px] w-[14px]" />
                    {isBuyer ? "Buyer" : "Seller"}
                  </span>
                  <span className="text-[rgba(255,255,255,.35)]">·</span>
                  <span>{profile.email}</span>
                  <span className="text-[rgba(255,255,255,.35)]">·</span>
                  <span>Joined {formatJoinedShort(profile.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-8 border-t border-line-2 bg-paper px-9 py-3.5">
              <Stat value={stats.ordersPlaced} label="Orders placed" />
              <Stat value={stats.activeRecurring} label="Active recurring" />
              <Stat value={stats.shopsOrderedFrom} label="Shops ordered from" />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[240px_1fr]">
            {/* Sidebar */}
            <nav className="sticky top-4 rounded-[12px] border border-line bg-paper p-2">
              {sidebarItems.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[8px] px-3 py-[9px] text-left text-[13px] font-medium transition-colors",
                    active === key
                      ? "bg-paper-2 text-ink [&_svg]:text-ink"
                      : "text-ink-2 hover:bg-paper-2 hover:text-ink [&_svg]:text-ink-3 hover:[&_svg]:text-ink"
                  )}
                >
                  <Icon className="h-[15px] w-[15px]" />
                  {label}
                </button>
              ))}
              <div className="my-1.5 mx-2.5 h-px bg-line-2" />
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-[9px] text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft [&_svg]:text-danger"
              >
                <Trash2 className="h-[15px] w-[15px]" />
                Delete account
              </button>
            </nav>

            {/* Content */}
            <div className="flex min-w-0 flex-col gap-5">
              {/* Account identity */}
              <SectionCard accentColor="var(--ink)" title="Account identity" subtitle="Managed by Ledgr — some fields redirect to verification.">
                <div className="flex flex-col gap-0 px-[22px] py-5">
                  <RoRow k="Email">
                    <span className="font-mono text-ink">{profile.email}</span>
                    <Link
                      href="#"
                      className="text-[11.5px] text-ink-3 underline underline-offset-[3px] hover:text-hot"
                    >
                      Change email
                    </Link>
                  </RoRow>
                  <RoRow k="Role">
                    <span>{isBuyer ? "Buyer" : "Seller"}</span>
                    {isBuyer && (
                      <Link
                        href="/dashboard"
                        className="text-[11.5px] text-ink-3 underline underline-offset-[3px] hover:text-hot"
                      >
                        Become a seller
                      </Link>
                    )}
                  </RoRow>
                  <RoRow k="Joined">
                    <span>{formatJoined(profile.createdAt)}</span>
                  </RoRow>
                </div>
              </SectionCard>

              {/* Personal details */}
              <SectionCard accentColor="var(--accent)" title="Personal details">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
                    saveFields({ name, phone });
                  }}
                >
                  <div className="flex flex-col gap-3.5 px-[22px] py-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="p-first" className="mb-1.5">
                          First name
                        </Label>
                        <Input
                          id="p-first"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-last" className="mb-1.5">
                          Last name
                        </Label>
                        <Input
                          id="p-last"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="p-phone" className="mb-1.5">
                        Phone
                      </Label>
                      <Input
                        id="p-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <CardFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const [f, l] = splitName(profile.name || "");
                        setFirstName(f);
                        setLastName(l);
                        setPhone(profile.phone || "");
                      }}
                    >
                      Discard
                    </Button>
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </SectionCard>

              {/* Business details */}
              <SectionCard
                accentColor="var(--hot)"
                title="Business details"
                subtitle="Optional — required on tax invoices if you're ordering for a company."
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveFields({ companyName, abn });
                  }}
                >
                  <div className="flex flex-col gap-3.5 px-[22px] py-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="p-company" className="mb-1.5">
                          Company
                        </Label>
                        <Input
                          id="p-company"
                          placeholder="—"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-abn" className="mb-1.5">
                          ABN
                        </Label>
                        <Input
                          id="p-abn"
                          className="font-mono"
                          placeholder="00 000 000 000"
                          value={abn}
                          onChange={(e) => setAbn(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <CardFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompanyName(profile.companyName || "");
                        setAbn(profile.abn || "");
                      }}
                    >
                      Discard
                    </Button>
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </SectionCard>

              {/* Default delivery address */}
              <SectionCard
                accentColor="#3d4c7a"
                title="Default delivery address"
                subtitle="Pre-fills at checkout. Override per-order as needed."
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveFields({
                      address: {
                        streetName: [building, street].filter(Boolean).join(" ").trim(),
                        cityName: suburb,
                        postalZone: postcode,
                        country,
                      },
                    });
                  }}
                >
                  <div className="flex flex-col gap-3.5 px-[22px] py-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="p-building" className="mb-1.5">
                          Building / unit
                        </Label>
                        <Input
                          id="p-building"
                          value={building}
                          onChange={(e) => setBuilding(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-street" className="mb-1.5">
                          Street
                        </Label>
                        <Input
                          id="p-street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="p-suburb" className="mb-1.5">
                          Suburb
                        </Label>
                        <Input
                          id="p-suburb"
                          value={suburb}
                          onChange={(e) => setSuburb(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-postcode" className="mb-1.5">
                          Postcode
                        </Label>
                        <Input
                          id="p-postcode"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="p-country" className="mb-1.5">
                          Country
                        </Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger id="p-country">
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
                  <CardFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const sn = profile.address?.streetName || "";
                        const m = sn.match(/^(\S+)\s+(.+)$/);
                        if (m && /\d/.test(m[1])) {
                          setBuilding(m[1]);
                          setStreet(m[2]);
                        } else {
                          setBuilding("");
                          setStreet(sn);
                        }
                        setSuburb(profile.address?.cityName || "");
                        setPostcode(profile.address?.postalZone || "");
                        setCountry(profile.address?.country || "AU");
                      }}
                    >
                      Discard
                    </Button>
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </SectionCard>

              {/* Danger zone */}
              <div className="overflow-hidden rounded-[12px] border border-danger bg-paper">
                <div className="flex items-center justify-between border-b border-danger/20 bg-danger-soft px-[22px] py-[18px]">
                  <div className="font-display text-[14.5px] font-semibold tracking-[-.01em] text-danger">
                    Danger zone
                  </div>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 px-[22px] py-4 sm:flex-row sm:items-center">
                  <div className="max-w-[440px] text-[13px] leading-[1.55] text-ink-2">
                    <strong className="font-display font-semibold text-ink">
                      Delete your Ledgr account.
                    </strong>{" "}
                    All orders, recurring templates, and guest links will be permanently
                    removed. This cannot be undone.
                  </div>
                  <Button variant="danger" size="sm">
                    Delete account…
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-display text-[20px] font-semibold tracking-[-.015em] text-ink">
        {value}
      </div>
      <div className="text-[10.5px] font-medium uppercase tracking-[.1em] text-ink-3">
        {label}
      </div>
    </div>
  );
}

function SectionCard({
  accentColor,
  title,
  subtitle,
  children,
}: {
  accentColor: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
      <div className="flex items-center justify-between border-b border-line-2 px-[22px] py-[18px]">
        <div className="flex items-center">
          <div
            className="mr-2.5 self-stretch rounded-sm"
            style={{ width: 3, background: accentColor }}
          />
          <div>
            <div className="font-display text-[14.5px] font-semibold tracking-[-.01em] text-ink">
              {title}
            </div>
            {subtitle && <div className="mt-0.5 text-[12px] text-ink-3">{subtitle}</div>}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2 border-t border-line-2 bg-paper-2 px-[22px] py-3.5">
      {children}
    </div>
  );
}

function RoRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-line-2 py-2.5 text-[13px] first:border-t-0 first:pt-0">
      <span className="text-[11px] font-medium uppercase tracking-[.1em] text-ink-3">{k}</span>
      <span className="flex items-center gap-2.5 text-ink">{children}</span>
    </div>
  );
}
