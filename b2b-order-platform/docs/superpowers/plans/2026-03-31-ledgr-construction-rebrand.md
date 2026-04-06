# Ledgr Construction Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the B2B order platform to "Ledgr — Construction Supply Management" and add 5 construction-specific features: material categories with unit presets, site selector, priority flags, supplier directory, and construction-themed copy.

**Architecture:** All changes are frontend-only. A new `src/lib/construction-data.ts` file holds static data (material categories, unit mappings, supplier directory, sample sites). The order creation form gains category/site/priority selectors that auto-fill fields. All branding text changes are in-place edits to existing components.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, lucide-react

---

## File Structure

```
src/
├── lib/
│   └── construction-data.ts          # NEW — static data for categories, units, suppliers, sites
├── components/
│   └── sidebar.tsx                    # MODIFY — rename to Ledgr, update copy
├── app/
│   ├── login/page.tsx                 # MODIFY — rename to Ledgr, update tagline
│   ├── dashboard/page.tsx             # MODIFY — construction copy, greeting
│   ├── orders/
│   │   ├── page.tsx                   # MODIFY — construction empty state copy
│   │   └── create/page.tsx            # MODIFY — material categories, unit presets, site, priority, supplier directory
│   ├── despatch/page.tsx              # MODIFY — "Site Deliveries" copy
│   ├── invoices/page.tsx              # MODIFY — construction empty state copy
│   └── components/empty-state.tsx     # NO CHANGE — copy changes happen at page level
```

---

### Task 1: Construction Static Data

**Files:**
- Create: `src/lib/construction-data.ts`

- [ ] **Step 1: Create the construction data file**

```typescript
// src/lib/construction-data.ts

export type MaterialCategory = {
  id: string;
  label: string;
  defaultUnit: string;
  icon: string; // lucide icon name for future use
};

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: "concrete", label: "Concrete & Cement", defaultUnit: "m³", icon: "box" },
  { id: "steel", label: "Steel & Rebar", defaultUnit: "t", icon: "construction" },
  { id: "timber", label: "Timber & Framing", defaultUnit: "lm", icon: "trees" },
  { id: "aggregates", label: "Aggregates & Sand", defaultUnit: "t", icon: "mountain" },
  { id: "bricks", label: "Bricks & Blocks", defaultUnit: "EA", icon: "layout-grid" },
  { id: "fixtures", label: "Fixtures & Fittings", defaultUnit: "EA", icon: "wrench" },
  { id: "roofing", label: "Roofing & Cladding", defaultUnit: "m²", icon: "home" },
  { id: "electrical", label: "Electrical", defaultUnit: "EA", icon: "zap" },
  { id: "plumbing", label: "Plumbing", defaultUnit: "EA", icon: "droplets" },
  { id: "ppe", label: "PPE & Safety", defaultUnit: "EA", icon: "hard-hat" },
  { id: "tools", label: "Tools & Equipment", defaultUnit: "EA", icon: "hammer" },
  { id: "other", label: "Other", defaultUnit: "EA", icon: "package" },
];

export type Priority = {
  id: string;
  label: string;
  color: string; // tailwind color class
};

export const PRIORITIES: Priority[] = [
  { id: "urgent", label: "Urgent", color: "text-red-600 bg-red-50 border-red-200" },
  { id: "standard", label: "Standard", color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "scheduled", label: "Scheduled", color: "text-ink-muted bg-surface border-surface-border" },
];

export type Supplier = {
  name: string;
  specialty: string;
};

export const SUPPLIER_DIRECTORY: Supplier[] = [
  { name: "Boral Australia", specialty: "Concrete & Aggregates" },
  { name: "BlueScope Steel", specialty: "Steel & Roofing" },
  { name: "Bunnings Trade", specialty: "General Building Supplies" },
  { name: "CSR Building Products", specialty: "Timber & Panels" },
  { name: "Adelaide Brighton Cement", specialty: "Cement & Lime" },
  { name: "Dulux Trade", specialty: "Paints & Coatings" },
  { name: "Reece Plumbing", specialty: "Plumbing & HVAC" },
  { name: "Middy's Electrical", specialty: "Electrical Supplies" },
  { name: "SafetyQuip", specialty: "PPE & Safety Equipment" },
  { name: "Hilti Australia", specialty: "Tools & Fasteners" },
];

export const SAMPLE_SITES = [
  "Barangaroo South Tower",
  "Westfield Parramatta Extension",
  "Sydney Metro Station Fit-out",
  "Darling Harbour Residential",
  "North Shore Hospital Wing B",
];
```

- [ ] **Step 2: Verify file compiles**

Run: `cd /Users/parhamsepasgozar/Documents/SENG2021/chalksniffer-seng2021/b2b-order-platform && npx tsc --noEmit src/lib/construction-data.ts`

---

### Task 2: Rebrand — Sidebar, Login, Metadata

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update sidebar logo**

In `src/components/sidebar.tsx`, change the logo from:
```tsx
<Link href="/dashboard" className="text-lg font-bold text-ink">
  B2B Orders
</Link>
```
To:
```tsx
<Link href="/dashboard" className="flex flex-col">
  <span className="text-lg font-bold text-ink">Ledgr</span>
  <span className="text-[10px] text-ink-faint">Construction Supply</span>
</Link>
```

- [ ] **Step 2: Update sidebar CTA labels**

Change `ctaLabel` from:
```tsx
const ctaLabel = isBuyer ? "Create Order" : "Create Despatch";
```
To:
```tsx
const ctaLabel = isBuyer ? "New Order" : "New Despatch";
```

- [ ] **Step 3: Update sidebar nav label for despatch**

Change the despatch nav item label from `"Despatch"` to `"Site Deliveries"`.

- [ ] **Step 4: Update login page branding**

In `src/app/login/page.tsx`, change:
```tsx
<h1 className="text-2xl font-bold text-ink">B2B Orders</h1>
```
To:
```tsx
<h1 className="text-2xl font-bold text-ink">Ledgr</h1>
<p className="text-xs text-ink-faint mt-1">Construction Supply Management</p>
```

And change the subtitle from generic to construction:
```tsx
{mode === "register" ? "Create your account to get started" : "Welcome back"}
```
To:
```tsx
{mode === "register" ? "Set up your account to manage orders" : "Welcome back"}
```

Also change the role labels from "Buyer"/"Seller" to "Contractor"/"Supplier".

- [ ] **Step 5: Update page metadata**

In `src/app/layout.tsx`, change:
```tsx
title: "B2B Order Management",
description: "Unified B2B order-to-cash platform",
```
To:
```tsx
title: "Ledgr — Construction Supply Management",
description: "Order, track, and invoice construction materials",
```

---

### Task 3: Dashboard — Construction Copy & Greeting

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard heading and stat labels**

Change heading from:
```tsx
{isBuyer ? "Buyer Dashboard" : "Seller Dashboard"}
```
To:
```tsx
{isBuyer ? "Contractor Dashboard" : "Supplier Dashboard"}
```

Change subtitle from:
```tsx
{isBuyer ? "Place orders, track deliveries, and review invoices." : "Fulfil orders, manage despatches, and generate invoices."}
```
To:
```tsx
{isBuyer ? "Order materials, track site deliveries, and manage invoices." : "Fulfil material orders, manage despatches, and invoice contractors."}
```

Change stat card labels from:
```
Total Orders / Active / Delivered / Invoiced
```
To:
```
Total Orders / In Transit / Delivered to Site / Invoiced
```

- [ ] **Step 2: Update empty state copy**

Change empty state from:
```tsx
{isBuyer ? "Create your first order to get started" : "Orders from buyers will appear here"}
```
To:
```tsx
{isBuyer ? "Place your first material order to get started" : "Material orders from contractors will appear here"}
```

Change `actionLabel` from `"Create Order"` to `"New Material Order"`.

- [ ] **Step 3: Add session name to greeting**

Fetch `session.name` and display a greeting. After the `setRole(session.role)` line, add:
```tsx
setUserName(session.name);
```

Add state: `const [userName, setUserName] = useState("");`

Update heading to:
```tsx
<h1 className="text-2xl font-bold text-ink">
  {userName ? `G'day, ${userName}` : (isBuyer ? "Contractor Dashboard" : "Supplier Dashboard")}
</h1>
```

---

### Task 4: Order Create — Material Categories & Unit Presets

**Files:**
- Modify: `src/app/orders/create/page.tsx`

- [ ] **Step 1: Add material category selector above line items**

Import the construction data:
```tsx
import { MATERIAL_CATEGORIES } from "@/lib/construction-data";
```

Add a `<select>` for material category at the top of each line item row. When a category is selected, auto-set the `unitCode` field to the category's `defaultUnit`.

Replace the current line item form type:
```tsx
type LineItemForm = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitCode: string;
  priceAmount: number;
  currencyID: string;
  category: string; // NEW
};
```

Update `emptyLineItem()`:
```tsx
function emptyLineItem(): LineItemForm {
  return { id: "", name: "", description: "", quantity: 1, unitCode: "EA", priceAmount: 0, currencyID: "AUD", category: "" };
}
```

Add a category select as the first column of each line item:
```tsx
<div>
  <label className="input-label">Category</label>
  <select
    value={item.category}
    onChange={(e) => {
      const cat = MATERIAL_CATEGORIES.find(c => c.id === e.target.value);
      updateLineItem(i, "category", e.target.value);
      if (cat) updateLineItem(i, "unitCode", cat.defaultUnit);
    }}
    className="input mt-1"
  >
    <option value="">Select...</option>
    {MATERIAL_CATEGORIES.map(cat => (
      <option key={cat.id} value={cat.id}>{cat.label}</option>
    ))}
  </select>
</div>
```

Adjust the grid from `grid-cols-6` to `grid-cols-7` to accommodate the new column.

- [ ] **Step 2: Verify the form renders with category dropdown**

Run: `npm run dev` and navigate to `/orders/create`. Selecting "Steel & Rebar" should auto-set unit to "t".

---

### Task 5: Order Create — Site Selector & Priority Flag

**Files:**
- Modify: `src/app/orders/create/page.tsx`

- [ ] **Step 1: Add site and priority fields above the form**

Import additional data:
```tsx
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES } from "@/lib/construction-data";
```

Add state:
```tsx
const [site, setSite] = useState("");
const [priority, setPriority] = useState("standard");
```

Add a new row after the date/currency row and before the note field:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="input-label">Site / Project</label>
    <select value={site} onChange={(e) => setSite(e.target.value)} className="input mt-1">
      <option value="">Select site...</option>
      {SAMPLE_SITES.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>
  <div>
    <label className="input-label">Priority</label>
    <div className="mt-1 flex gap-2">
      {PRIORITIES.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => setPriority(p.id)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
            priority === p.id ? p.color : "border-surface-border text-ink-muted"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Include site and priority in the order note**

In `handleSubmit`, prepend site and priority to the note field so they're stored with the order:
```tsx
const orderNote = [
  site && `Site: ${site}`,
  priority !== "standard" && `Priority: ${priority.toUpperCase()}`,
  note,
].filter(Boolean).join(" | ");
```

Use `orderNote` instead of `note` in the order body:
```tsx
note: orderNote || undefined,
```

---

### Task 6: Order Create — Supplier Directory

**Files:**
- Modify: `src/app/orders/create/page.tsx`

- [ ] **Step 1: Replace seller party free-text with supplier directory**

Import:
```tsx
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES, SUPPLIER_DIRECTORY } from "@/lib/construction-data";
```

Add a supplier selector dropdown above the seller party fields. When a supplier is selected, auto-fill the `partyName` field:

```tsx
<div className="mb-3">
  <label className="input-label">Select from directory</label>
  <select
    onChange={(e) => {
      const supplier = SUPPLIER_DIRECTORY.find(s => s.name === e.target.value);
      if (supplier) {
        updateParty(setSeller, "partyName", supplier.name);
      }
    }}
    className="input mt-1"
    defaultValue=""
  >
    <option value="">Choose a supplier...</option>
    {SUPPLIER_DIRECTORY.map(s => (
      <option key={s.name} value={s.name}>{s.name} — {s.specialty}</option>
    ))}
  </select>
</div>
```

Place this inside the Seller `<fieldset>`, before the existing `PartyFields` grid. The user can still manually edit the party name and address after selecting.

---

### Task 7: Construction-Themed Copy — All Pages

**Files:**
- Modify: `src/app/orders/page.tsx`
- Modify: `src/app/despatch/page.tsx`
- Modify: `src/app/invoices/page.tsx`
- Modify: `src/components/empty-state.tsx`

- [ ] **Step 1: Update orders page copy**

In `src/app/orders/page.tsx`:

Change page heading description from:
```tsx
{isBuyer ? "Your purchase orders." : "Incoming orders to fulfil."}
```
To:
```tsx
{isBuyer ? "Your material orders across all sites." : "Incoming material orders from contractors."}
```

Change empty state description from:
```tsx
{isBuyer ? "Create your first order to get started" : "Orders from buyers will appear here"}
```
To:
```tsx
{isBuyer ? "Place your first material order" : "Material orders from contractors will appear here"}
```

- [ ] **Step 2: Update despatch page copy**

In `src/app/despatch/page.tsx`:

Change heading from `"Despatch Advices"` to `"Site Deliveries"`.

Change description from:
```tsx
"Track shipments and delivery confirmations."
```
To:
```tsx
"Track material shipments and site delivery confirmations."
```

Change empty state from:
```tsx
title="No despatch advices"
description="Despatch advices will appear here after you fulfil orders"
actionLabel="Create Despatch"
```
To:
```tsx
title="No site deliveries"
description="Deliveries will appear here after you despatch materials"
actionLabel="New Despatch"
```

- [ ] **Step 3: Update invoices page copy**

In `src/app/invoices/page.tsx`:

Change heading description from:
```tsx
"View and manage invoices across all orders."
```
To:
```tsx
"View and manage invoices for material orders."
```

Change empty state from:
```tsx
title="No invoices"
description="Invoices will appear here once created"
```
To:
```tsx
title="No invoices yet"
description="Invoices will appear here once materials are delivered and invoiced"
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

---

## Verification

1. `npm run build` passes
2. Sidebar shows "Ledgr / Construction Supply" branding, "Site Deliveries" nav label
3. Login page shows "Ledgr" with "Construction Supply Management" tagline, "Contractor"/"Supplier" role labels
4. Dashboard greets user by name, stat labels reference construction (In Transit, Delivered to Site)
5. Order create form has: material category dropdown (auto-sets units), site selector, priority toggle, supplier directory
6. All empty states and page descriptions reference construction materials/sites
7. Page title in browser tab says "Ledgr — Construction Supply Management"
