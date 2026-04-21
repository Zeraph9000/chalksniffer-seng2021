"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Copy,
  Upload,
  Trash,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { transformedImageUrl } from "@/lib/image-url";
import type { StoreStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type StoreFormState = {
  storeId: string;
  userId: string;
  slug: string;
  storeName: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  location: string;
  category: string;
  status: StoreStatus;
};

const CATEGORIES = [
  "Pantry & Grocery",
  "Coffee & Tea",
  "Home & Kitchen",
  "Apparel",
  "Stationery & Print",
  "Flowers & Plants",
];

const STATUS_OPTIONS: {
  value: StoreStatus;
  chipClass: string;
  chipLabel: string;
  title: string;
  body: string;
}[] = [
  {
    value: "active",
    chipClass: "bg-accent-soft text-accent",
    chipLabel: "Active",
    title: "Open for orders",
    body: "Default. Buyers can browse and check out.",
  },
  {
    value: "paused",
    chipClass: "bg-warn-bg text-warn",
    chipLabel: "Paused",
    title: "Temporarily not accepting orders",
    body: "Storefront stays live. Cart is disabled.",
  },
  {
    value: "closed",
    chipClass: "bg-s-cancelled-bg text-s-cancelled-fg",
    chipLabel: "Closed",
    title: "Storefront hidden from Ledgr",
    body: "Not in marketplace or search. Existing orders stay accessible.",
  },
];

const EMPTY_FORM: StoreFormState = {
  storeId: "",
  userId: "",
  slug: "",
  storeName: "",
  description: "",
  logoUrl: "",
  bannerUrl: "",
  location: "",
  category: "",
  status: "active",
};

function monogramFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export interface StoreEditFormProps {
  initial: StoreFormState | null;
}

export function StoreEditForm({ initial }: StoreEditFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<StoreFormState>(initial ?? EMPTY_FORM);
  const [baseline, setBaseline] = React.useState<StoreFormState>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const isNew = !initial;
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://ledgr.app";
  const publicSlug = form.slug || (initial?.storeId ?? "");
  const liveUrl = publicSlug ? `${origin}/store/${publicSlug}` : null;

  async function save() {
    setSaving(true);
    try {
      const url = isNew ? "/api/stores" : `/api/stores/${form.storeId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          description: form.description,
          slug: form.slug || undefined,
          logoUrl: form.logoUrl || undefined,
          bannerUrl: form.bannerUrl || undefined,
          location: form.location || undefined,
          category: form.category || undefined,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || data.error || "Failed to save");
        return;
      }
      const s = await res.json();
      const next: StoreFormState = {
        storeId: s.storeId,
        userId: s.userId,
        slug: s.slug ?? "",
        storeName: s.storeName ?? "",
        description: s.description ?? "",
        logoUrl: s.logoUrl ?? "",
        bannerUrl: s.bannerUrl ?? "",
        location: s.location ?? "",
        category: s.category ?? "",
        status: s.status,
      };
      setForm(next);
      setBaseline(next);
      toast.success("Store saved");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setForm(baseline);
  }

  async function copyLink() {
    if (!liveUrl) return;
    try {
      await navigator.clipboard.writeText(liveUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Unable to copy");
    }
  }

  async function handleUpload(
    file: File,
    kind: "logo" | "banner"
  ): Promise<string | null> {
    const data = new FormData();
    data.append("file", file);
    data.append("kind", kind);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? "Upload failed");
        return null;
      }
      return body.url as string;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      return null;
    }
  }

  async function onDelete() {
    if (!initial) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/stores/${initial.storeId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? data.error ?? "Failed to delete store");
        return;
      }
      toast.success("Store deleted");
      setDeleteDialogOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete store");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 bg-paper border-b border-line px-8 py-6 z-10 flex justify-between items-end gap-4">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-[-.02em] m-0">
            Store
          </h1>
          <p className="text-[13px] text-ink-3 mt-[3px]">
            How your storefront appears to buyers — update and publish instantly.
          </p>
        </div>
        {liveUrl ? (
          <Button asChild variant="ghost">
            <Link href={liveUrl} target="_blank" rel="noopener noreferrer">
              View live
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="max-w-[960px] mx-auto px-8 py-7 pb-32 flex flex-col gap-[18px]">
        {/* Public URL banner */}
        <section className="bg-paper border border-line rounded-[14px] px-6 py-5 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-3 font-medium">
              Public storefront URL
            </div>
            <div className="font-mono text-[15px] mt-1 text-ink flex items-center gap-1.5 flex-wrap">
              <span className="text-ink-3">ledgr.app/store/</span>
              <span className="text-ink font-medium">
                {form.slug || initial?.storeId || "your-slug"}
              </span>
              {!isNew && form.status === "active" ? (
                <span className="ml-2 font-sans text-[10.5px] bg-accent-soft text-accent px-2 py-0.5 rounded-full font-medium tracking-[0.02em] inline-flex items-center gap-1.5">
                  <span className="w-[5px] h-[5px] bg-accent rounded-full" />
                  Live
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={copyLink} disabled={!liveUrl}>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </Button>
            <Button asChild size="md" disabled={!liveUrl}>
              {liveUrl ? (
                <Link href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Open
                </Link>
              ) : (
                <span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Open
                </span>
              )}
            </Button>
          </div>
        </section>

        {/* Store details card */}
        <SectionCard
          accent="var(--ink)"
          title="Store details"
          subtitle="Shown on the storefront, in search, and on invoices."
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Store name" htmlFor="storeName">
              <Input
                id="storeName"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                placeholder="e.g. Honey House Provisions"
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="slug"
              hint="Lowercase letters, numbers, and dashes only. Changing this breaks existing links."
            >
              <div className="flex border border-line rounded-md overflow-hidden bg-paper focus-within:border-ink focus-within:ring-[3px] focus-within:ring-ink/[0.08] transition-colors">
                <span className="px-3 flex items-center bg-paper-2 border-r border-line text-ink-3 font-mono text-[12.5px] h-[42px]">
                  ledgr.app/store/
                </span>
                <input
                  id="slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-")
                        .replace(/-+/g, "-"),
                    })
                  }
                  pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                  minLength={2}
                  maxLength={64}
                  placeholder="honey-house"
                  className="flex-1 h-[42px] px-3 border-0 font-mono text-[13px] font-medium bg-transparent text-ink outline-none"
                />
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="category">
              <Select
                value={form.category || undefined}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Location"
              htmlFor="location"
              hint="Where you ship from — shown on the storefront header."
            >
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Marrickville, NSW"
              />
            </Field>
          </div>
        </SectionCard>

        {/* Brand card */}
        <SectionCard
          accent="var(--brand)"
          title="Brand"
          subtitle="Description, logo, and banner buyers see on the storefront."
        >
          <Field
            label="Description"
            htmlFor="description"
            hint="Up to 280 characters. Plain text, no links."
          >
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value.slice(0, 280) })
              }
              maxLength={280}
              placeholder="Tell buyers what makes your store special."
            />
          </Field>

          <Field
            label="Logo"
            hint="Square PNG or SVG, 512×512+. Appears on the storefront header, order emails, and invoices."
          >
            <ImageLogoField
              value={form.logoUrl}
              monogram={monogramFrom(form.storeName || "?")}
              onChange={(url) => setForm({ ...form, logoUrl: url })}
              upload={(f) => handleUpload(f, "logo")}
            />
          </Field>

          <Field label="Banner" hint="Wide, at least 1600×360. Shown behind your store name on the storefront.">
            <ImageBannerField
              value={form.bannerUrl}
              onChange={(url) => setForm({ ...form, bannerUrl: url })}
              upload={(f) => handleUpload(f, "banner")}
            />
          </Field>
        </SectionCard>

        {/* Status card */}
        <SectionCard
          accent="var(--accent)"
          title="Store status"
          subtitle="Controls whether the shop accepts new orders."
        >
          <div role="radiogroup" aria-label="Store status" className="grid grid-cols-3 gap-2.5">
            {STATUS_OPTIONS.map((opt) => {
              const selected = form.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setForm({ ...form, status: opt.value })}
                  className={cn(
                    "text-left border rounded-[10px] px-4 py-3.5 cursor-pointer flex flex-col gap-1 transition-colors",
                    selected
                      ? "border-ink bg-paper-2"
                      : "border-line bg-paper hover:border-ink-4"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 shrink-0 transition-colors",
                        selected
                          ? "border-ink bg-ink shadow-[inset_0_0_0_3px_var(--paper-2)]"
                          : "border-line"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10.5px] font-medium px-2 py-0.5 rounded-full tracking-[0.02em]",
                        opt.chipClass
                      )}
                    >
                      {opt.chipLabel}
                    </span>
                  </div>
                  <div className="font-display font-semibold text-[13px] tracking-[-.005em] mt-1.5 text-ink">
                    {opt.title}
                  </div>
                  <div className="text-[11.5px] text-ink-3 leading-[1.5]">{opt.body}</div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Danger zone */}
        {!isNew ? (
          <section className="bg-paper border border-danger rounded-[14px] overflow-hidden">
            <header className="px-[22px] py-4 bg-danger-soft border-b border-danger/20">
              <div className="font-display font-semibold text-[15px] tracking-[-.01em] text-danger">
                Danger zone
              </div>
            </header>
            <div className="flex justify-between items-center px-[22px] py-4 gap-4">
              <div className="text-[13px] text-ink-2 max-w-[500px] leading-[1.55]">
                <strong className="font-display font-semibold text-ink">
                  Delete this store.
                </strong>{" "}
                All products, orders, invoices, and recurring templates linked to{" "}
                {form.storeName || "this store"} will be permanently removed. Buyers with
                outstanding orders will keep access to their order detail, but the store
                page itself will 404. Cannot be undone.
              </div>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="danger">Delete store…</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this store?</DialogTitle>
                  </DialogHeader>
                  <div className="px-[22px] py-[18px]">
                    <DialogDescription>
                      This action permanently deletes {form.storeName || "this store"} and
                      cannot be undone.
                    </DialogDescription>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button variant="danger" onClick={onDelete} disabled={deleting}>
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </section>
        ) : null}
      </div>

      {/* Unsaved changes bar */}
      {dirty ? (
        <UnsavedChangesBar
          onDiscard={discard}
          onSave={save}
          saving={saving}
          isNew={isNew}
        />
      ) : null}
    </>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? (
        <span className="text-[11.5px] text-ink-4 mt-0.5">{hint}</span>
      ) : null}
    </div>
  );
}

function SectionCard({
  accent,
  title,
  subtitle,
  children,
}: {
  accent: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-paper border border-line rounded-[14px] overflow-hidden">
      <header className="px-[22px] py-[18px] border-b border-line-2 flex items-center gap-2.5">
        <span
          aria-hidden
          className="w-[3px] self-stretch rounded-[2px]"
          style={{ background: accent }}
        />
        <div>
          <div className="font-display font-semibold text-[15px] tracking-[-.01em] text-ink">
            {title}
          </div>
          <div className="text-[12px] text-ink-3 mt-0.5">{subtitle}</div>
        </div>
      </header>
      <div className="px-[22px] py-[22px] flex flex-col gap-4">{children}</div>
    </section>
  );
}

function ImageLogoField({
  value,
  monogram,
  onChange,
  upload,
}: {
  value: string;
  monogram: string;
  onChange: (url: string) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const preview = value ? transformedImageUrl(value, "logo") : null;
  return (
    <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
      <div className="w-20 h-20 rounded-[12px] bg-brand text-brand-ink grid place-items-center font-display font-bold text-[30px] tracking-[-.025em] overflow-hidden">
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          monogram
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Replace"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="text-danger border-line hover:bg-danger-soft hover:text-danger"
          >
            <Trash className="h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setUploading(true);
          try {
            const url = await upload(f);
            if (url) onChange(url);
          } finally {
            setUploading(false);
          }
        }}
      />
    </div>
  );
}

function ImageBannerField({
  value,
  onChange,
  upload,
}: {
  value: string;
  onChange: (url: string) => void;
  upload: (file: File) => Promise<string | null>;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const preview = value ? transformedImageUrl(value, "banner") : null;
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="w-full h-[140px] rounded-[12px] relative overflow-hidden"
        style={
          preview
            ? undefined
            : {
                background:
                  "radial-gradient(circle at 15% 25%, rgba(0,0,0,.04) 1px, transparent 1.5px) 0 0/22px 22px, radial-gradient(ellipse 260px 160px at 85% 60%, rgba(107,74,20,.35), transparent 75%), var(--brand-soft)",
              }
        }
      >
        {preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : null}
        <div className="absolute right-3.5 bottom-3.5 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-[30px] px-2.5 rounded-[6px] text-[11.5px] font-medium bg-white/[0.92] text-ink inline-flex items-center gap-1.5 hover:bg-white"
          >
            <Upload className="h-3 w-3" strokeWidth={1.6} />
            {uploading ? "Uploading…" : "Replace"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-[30px] px-2.5 rounded-[6px] text-[11.5px] font-medium bg-white/[0.92] text-danger inline-flex items-center gap-1.5 hover:bg-white"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setUploading(true);
          try {
            const url = await upload(f);
            if (url) onChange(url);
          } finally {
            setUploading(false);
          }
        }}
      />
    </div>
  );
}

function UnsavedChangesBar({
  onDiscard,
  onSave,
  saving,
  isNew,
}: {
  onDiscard: () => void;
  onSave: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  return (
    <div className="fixed bottom-4 left-[256px] right-12 bg-ink text-white px-5 py-3 rounded-[12px] flex justify-between items-center gap-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)] z-20">
      <div className="text-[13px] flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-hot" />
        You have unsaved changes.
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="h-[34px] px-3.5 rounded-[7px] font-display font-semibold text-[12.5px] bg-transparent text-[#c7cad0] border border-white/[0.18] hover:text-white hover:bg-white/[0.06] disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-[34px] px-3.5 rounded-[7px] font-display font-semibold text-[12.5px] bg-white text-ink inline-flex items-center gap-1.5 hover:bg-[#f5f5f5] disabled:opacity-70"
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              {isNew ? "Create store" : "Save changes"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
