"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart-context";
import {
  CheckoutHeader,
  CheckoutProgress,
} from "@/components/ledgr/checkout-chrome";
import { OrderSummary } from "@/components/ledgr/order-summary";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "guest" | "signin" | "register";

function deriveMonogram(name: string | null | undefined): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || name.slice(0, 2).toUpperCase();
}

function itemKey(i: CartItem) {
  return `${i.productId}-${i.variantId}`;
}

export default function CheckoutDetailsPage() {
  const cart = useCart();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("guest");
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    buildingUnit: "",
    streetName: "",
    cityName: "",
    postalZone: "",
    country: "AU",
    note: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cart.items.length === 0) router.push("/cart");
  }, [cart.items.length, router]);

  useEffect(() => {
    fetch("/api/buyer/me")
      .then(async (r) => {
        const profile = await r.json();
        if (!profile) return;
        const [firstName, ...rest] = (profile.name ?? "").split(" ");
        setForm((f) => ({
          ...f,
          email: f.email || profile.email || "",
          firstName: f.firstName || firstName || "",
          lastName: f.lastName || rest.join(" ") || "",
          phone: f.phone || profile.phone || "",
          streetName: f.streetName || profile.address?.streetName || "",
          cityName: f.cityName || profile.address?.cityName || "",
          postalZone: f.postalZone || profile.address?.postalZone || "",
          country: f.country || profile.address?.country || "AU",
        }));
        setMode("signin");
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  if (cart.items.length === 0) return null;

  const subtotal = cart.items.reduce(
    (s, i) => s + i.quantity * i.unitPriceSnapshot,
    0
  );
  const currency = cart.items[0]?.currency ?? "AUD";
  const monogram = deriveMonogram(cart.storeName);
  const shopName = cart.storeName ?? "Your shop";

  async function submit() {
    setBusy(true);
    setErr(null);
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ");
    const streetName = form.buildingUnit
      ? `${form.buildingUnit} ${form.streetName}`.trim()
      : form.streetName;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.quantity,
          unitPriceSnapshot: i.unitPriceSnapshot,
        })),
        buyer: {
          email: form.email,
          name: fullName,
          phone: form.phone,
          address: {
            streetName,
            cityName: form.cityName,
            postalZone: form.postalZone,
            country: form.country,
          },
        },
        note: form.note,
        asGuest: mode === "guest",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.message || data.error);
      setBusy(false);
      return;
    }
    const qs = new URLSearchParams({
      pi: data.paymentIntentId,
      orderId: data.orderId,
      total: String(data.total),
      currency: data.currency,
    });
    if (data.guestAccessToken) qs.set("t", data.guestAccessToken);
    router.push(`/checkout/payment?${qs.toString()}`);
  }

  const summaryItems = cart.items.map((i) => ({
    key: itemKey(i),
    name: i.name,
    variantLabel: i.variantLabel,
    quantity: i.quantity,
    unitPrice: i.unitPriceSnapshot,
    imageUrl: i.imageUrl,
  }));

  return (
    <main className="min-h-screen bg-paper-2 py-6 px-4">
      <div className="max-w-[1200px] mx-auto bg-paper border border-line rounded-[12px] overflow-hidden">
        <CheckoutHeader shop={{ monogram, name: shopName }} />
        <CheckoutProgress current={2} />

        <div className="grid grid-cols-[1.4fr_1fr] gap-9 px-7 pb-12 pt-3 items-start">
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-[26px] tracking-[-.022em] text-ink m-0">
              Your details
            </h1>
            <p className="text-[13px] text-ink-3 mt-[6px] mb-6">
              Where should {shopName} send the order?
            </p>

            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-6">
              <TabsList>
                <TabsTrigger value="guest">Checkout as guest</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Contact */}
            <section className="border border-line rounded-[10px] p-5 mb-[18px] bg-paper">
              <div className="font-display font-semibold text-[15px] tracking-[-.01em] mb-[14px]">
                Contact
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
            </section>

            {/* Delivery address */}
            <section className="border border-line rounded-[10px] p-5 mb-[18px] bg-paper">
              <div className="font-display font-semibold text-[15px] tracking-[-.01em] mb-[14px]">
                Delivery address
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="buildingUnit">Building / unit</Label>
                  <Input
                    id="buildingUnit"
                    placeholder="optional"
                    value={form.buildingUnit}
                    onChange={(e) =>
                      setForm({ ...form, buildingUnit: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="streetName">Street address</Label>
                  <Input
                    id="streetName"
                    value={form.streetName}
                    onChange={(e) =>
                      setForm({ ...form, streetName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="cityName">Suburb / city</Label>
                  <Input
                    id="cityName"
                    value={form.cityName}
                    onChange={(e) =>
                      setForm({ ...form, cityName: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="postalZone">Postal code</Label>
                  <Input
                    id="postalZone"
                    value={form.postalZone}
                    onChange={(e) =>
                      setForm({ ...form, postalZone: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => setForm({ ...form, country: v })}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="NZ">New Zealand</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Note */}
            <section className="border border-line rounded-[10px] p-5 mb-[18px] bg-paper">
              <div className="font-display font-semibold text-[15px] tracking-[-.01em] mb-[14px]">
                Note for the shop{" "}
                <span className="text-ink-4 font-normal text-[12px]">
                  (optional)
                </span>
              </div>
              <Textarea
                placeholder={`Anything ${shopName} should know — gift wrap, buzzer code, etc.`}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </section>

            {err && (
              <p className="text-danger text-[12.5px] mt-3 mb-3">{err}</p>
            )}

            <div className="flex justify-between items-center mt-[22px] gap-3">
              <Link
                href="/cart"
                className="text-ink-3 text-[13px] hover:text-ink transition-colors"
              >
                ← Back to cart
              </Link>
              <Button type="button" size="lg" disabled={busy} onClick={submit}>
                Continue to payment →
              </Button>
            </div>
          </div>

          <OrderSummary
            shop={{ monogram, name: shopName }}
            items={summaryItems}
            subtotal={subtotal}
            shippingHint="Calculated at payment"
            total={subtotal}
            currency={currency}
          />
        </div>
      </div>
    </main>
  );
}
