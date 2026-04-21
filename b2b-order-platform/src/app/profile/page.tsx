"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/image-upload";

type Tab = "personal" | "business" | "address" | "security";

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  role: "buyer" | "seller";
  companyName: string;
  abn: string;
  avatarUrl?: string;
  address: {
    streetName: string;
    cityName: string;
    postalZone: string;
    country: string;
  };
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("personal");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Personal fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Business fields
  const [companyName, setCompanyName] = useState("");
  const [abn, setAbn] = useState("");

  // Address fields
  const [streetName, setStreetName] = useState("");
  const [cityName, setCityName] = useState("");
  const [postalZone, setPostalZone] = useState("");
  const [country, setCountry] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone);
        setCompanyName(data.companyName);
        setAbn(data.abn);
        setStreetName(data.address.streetName);
        setCityName(data.address.cityName);
        setPostalZone(data.address.postalZone);
        setCountry(data.address.country);
      })
      .finally(() => setLoading(false));
  }, []);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveProfile(fields: Record<string, unknown>) {
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update password", "error");
        return;
      }
      showToast("Password updated successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-ink-muted text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-semantic-danger text-sm">Failed to load profile</p>
      </div>
    );
  }

  const isBuyer = profile.role === "buyer";
  const btnClass = isBuyer ? "btn-primary" : "btn-seller";

  const tabs: { key: Tab; label: string }[] = [
    { key: "personal", label: "Personal" },
    { key: "business", label: "Business" },
    { key: "address", label: "Address" },
    { key: "security", label: "Security" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink">Profile</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your account details</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
          toast.type === "success"
            ? "bg-semantic-success-muted border-emerald-300 text-semantic-success"
            : "bg-semantic-danger-muted border-red-200 text-semantic-danger"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-surface-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === tab.key
                  ? isBuyer
                    ? "text-accent-buyer border-b-2 border-accent-buyer"
                    : "text-accent-seller border-b-2 border-accent-seller"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Personal Tab */}
          {activeTab === "personal" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile({ name, email, phone });
              }}
              className="space-y-4"
            >
              <div className="pb-4 border-b border-surface-border mb-2">
                <label className="input-label mb-2 block">Avatar</label>
                <ImageUpload
                  kind="avatar"
                  value={profile.avatarUrl ?? null}
                  onChange={async (url) => {
                    setSaving(true);
                    try {
                      const res = await fetch("/api/profile", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ avatarUrl: url }),
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        showToast(data.error || "Failed to save avatar", "error");
                        return;
                      }
                      setProfile(data);
                      showToast(url ? "Avatar updated" : "Avatar removed", "success");
                    } catch {
                      showToast("Network error", "error");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  label="Avatar"
                />
              </div>
              <div>
                <label className="input-label">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
              </div>
              <div>
                <label className="input-label">Role</label>
                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isBuyer
                    ? "bg-accent-buyer/10 text-accent-buyer"
                    : "bg-accent-seller/10 text-accent-seller"
                }`}>
                  {isBuyer ? "Contractor" : "Supplier"}
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className={btnClass}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Business Tab */}
          {activeTab === "business" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile({ companyName, abn });
              }}
              className="space-y-4"
            >
              <div>
                <label className="input-label">Company Name</label>
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="input-label">ABN</label>
                <input type="text" required value={abn} onChange={(e) => setAbn(e.target.value)} className="input" placeholder="11 digit ABN" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className={btnClass}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Address Tab */}
          {activeTab === "address" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveProfile({
                  address: { streetName, cityName, postalZone, country },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="input-label">Street Name</label>
                <input type="text" required value={streetName} onChange={(e) => setStreetName(e.target.value)} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">City</label>
                  <input type="text" required value={cityName} onChange={(e) => setCityName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="input-label">Postal Code</label>
                  <input type="text" required value={postalZone} onChange={(e) => setPostalZone(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="input-label">Country</label>
                <input type="text" required value={country} onChange={(e) => setCountry(e.target.value)} className="input" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className={btnClass}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div>
                <label className="input-label">Current Password</label>
                <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" autoComplete="current-password" />
              </div>
              <div>
                <label className="input-label">New Password</label>
                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" autoComplete="new-password" />
              </div>
              <div>
                <label className="input-label">Confirm New Password</label>
                <input type="password" required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="input" autoComplete="new-password" />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={saving} className={btnClass}>
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
