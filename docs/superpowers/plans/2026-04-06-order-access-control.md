# Order Access Control & Dynamic Seller Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-user Chalksniffer API keys with a single shared key, add MongoDB-backed order mappings for buyer/seller assignment and access control, replace hardcoded supplier dropdown with registered sellers, and add status filtering for both roles.

**Architecture:** Single Chalksniffer API key from env. MongoDB `orderMappings` collection tracks orderId→buyerEmail/sellerEmail/status. Centralized `order-access.ts` module provides `assertOrderAccess()` and `getOrderIdsForUser()` called by all order routes. Frontend fetches sellers from a new API endpoint and sends `sellerEmail` with order creation.

**Tech Stack:** Next.js 14, MongoDB (via native driver), Auth.js v5

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/types.ts` | **Modify.** Remove `chalksniffer` from `SessionData` and `User`, add `email` to `SessionData`, add `OrderMapping` type, update `OrderLink` type |
| `src/lib/api-clients.ts` | **Modify.** `chalksniffer()` reads from env, no session param |
| `src/lib/order-access.ts` | **New.** Centralized access control: `assertOrderAccess()`, `getOrderIdsForUser()`, `getMapping()`, `setMapping()` |
| `src/lib/order-links.ts` | **Delete.** Replaced by `order-access.ts` |
| `src/lib/session.ts` | **Modify.** Add `email`, remove `chalksniffer` from returned data |
| `src/auth.ts` | **Modify.** Remove Chalksniffer registration from authorize callback |
| `src/app/api/auth/register/route.ts` | **Modify.** Remove Chalksniffer provisioning |
| `src/app/api/users/sellers/route.ts` | **New.** Returns registered sellers |
| `src/app/api/orders/route.ts` | **Modify.** Use mappings for list + create |
| `src/app/api/orders/[id]/route.ts` | **Modify.** Add access control |
| `src/app/api/orders/[id]/xml/route.ts` | **Modify.** Update chalksniffer call |
| `src/app/api/orders/recurring/route.ts` | **Modify.** Update chalksniffer call |
| `src/app/api/orders/recommend/route.ts` | **Modify.** Update chalksniffer call |
| `src/app/api/orders/csv/route.ts` | **Modify.** Update chalksniffer call |
| `src/app/api/links/route.ts` | **Modify.** Rewrite to use MongoDB `orderMappings` |
| `src/app/api/despatch/route.ts` | **Modify.** Update link calls to use order-access |
| `src/app/api/despatch/[documentId]/receipt/route.ts` | **Modify.** Update link calls to use order-access |
| `src/app/api/invoices/route.ts` | **Modify.** Update link calls to use order-access |
| `src/app/orders/create/page.tsx` | **Modify.** Fetch sellers, send `sellerEmail` |
| `src/app/orders/page.tsx` | **Modify.** Add status filter tabs |
| `src/app/dashboard/page.tsx` | **Modify.** Filter orders by role |

---

### Task 1: Update Types — Remove chalksniffer, Add email and OrderMapping

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Update SessionData and User types**

In `src/lib/types.ts`, replace the `SessionData` type (lines 7-13) with:

```typescript
export type SessionData = {
  role: UserRole;
  name: string;
  email: string;
  despatch: { sessionId: string; clientId: string };
  lastminutepush: { apiKey: string };
};
```

Replace the `User` type (lines 15-25) with:

```typescript
export type User = {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  despatch: { email: string; password: string };
  lastminutepush: { apiKey: string };
  createdAt: Date;
};
```

- [ ] **Step 2: Add OrderMapping type**

Add after the `User` type:

```typescript
export type OrderMapping = {
  orderId: string;
  buyerEmail: string;
  sellerEmail: string;
  status: "placed" | "despatched" | "received" | "invoiced";
  despatchDocumentId?: string;
  receiptAdviceId?: string;
  invoiceId?: string;
  createdAt: Date;
};
```

- [ ] **Step 3: Remove the old OrderLink type**

Delete the `OrderLink` type (in the Cross-API Order Linking section near the bottom of the file):

```typescript
// DELETE THIS:
export type OrderLink = {
  orderId: string;
  despatchDocumentId?: string;
  receiptAdviceId?: string;
  invoiceId?: string;
  status: "placed" | "despatched" | "received" | "invoiced";
};
```

- [ ] **Step 4: Commit**

```bash
git add -f src/lib/types.ts
git commit -m "feat: update types — remove chalksniffer, add email to session, add OrderMapping"
```

---

### Task 2: Update Chalksniffer API Client

**Files:**
- Modify: `src/lib/api-clients.ts`

- [ ] **Step 1: Change chalksniffer function to read from env**

Replace the `chalksniffer` function in `src/lib/api-clients.ts` (lines 31-42) with:

```typescript
export function chalksniffer() {
  const authHeaders = { Authorization: `Bearer ${process.env.CHALKSNIFFER_API_KEY}` };
  return {
    get: (path: string) => apiFetch(CHALKSNIFFER_URL, path, authHeaders),
    post: (path: string, body: unknown) =>
      apiFetch(CHALKSNIFFER_URL, path, authHeaders, { method: "POST", body }),
    put: (path: string, body: unknown) =>
      apiFetch(CHALKSNIFFER_URL, path, authHeaders, { method: "PUT", body }),
    delete: (path: string) =>
      apiFetch(CHALKSNIFFER_URL, path, authHeaders, { method: "DELETE" }),
  };
}
```

- [ ] **Step 2: Add CHALKSNIFFER_API_KEY to .env.local**

Register a key manually by running:
```bash
curl -s -X POST https://www.chalksniffer.com/auth/register | jq .apiKey
```

Add the returned key to `.env.local`:
```
CHALKSNIFFER_API_KEY=<the key from above>
```

- [ ] **Step 3: Commit**

```bash
git add -f src/lib/api-clients.ts
git commit -m "feat: chalksniffer API client reads from env instead of session"
```

---

### Task 3: Create Order Access Module

**Files:**
- Create: `src/lib/order-access.ts`
- Delete: `src/lib/order-links.ts`

- [ ] **Step 1: Create order-access.ts**

```typescript
// src/lib/order-access.ts
import clientPromise from "@/lib/db";
import { OrderMapping } from "./types";

const COLLECTION = "orderMappings";

export async function getMapping(orderId: string): Promise<OrderMapping | null> {
  const client = await clientPromise;
  const db = client.db();
  return db.collection<OrderMapping>(COLLECTION).findOne({ orderId });
}

export async function setMapping(
  orderId: string,
  update: Partial<OrderMapping>
): Promise<OrderMapping> {
  const client = await clientPromise;
  const db = client.db();

  const existing = await db.collection<OrderMapping>(COLLECTION).findOne({ orderId });

  const mapping: OrderMapping = {
    orderId,
    buyerEmail: update.buyerEmail ?? existing?.buyerEmail ?? "",
    sellerEmail: update.sellerEmail ?? existing?.sellerEmail ?? "",
    status: "placed",
    ...existing,
    ...update,
  };

  // Derive status from linked documents
  if (mapping.invoiceId) {
    mapping.status = "invoiced";
  } else if (mapping.receiptAdviceId) {
    mapping.status = "received";
  } else if (mapping.despatchDocumentId) {
    mapping.status = "despatched";
  } else {
    mapping.status = "placed";
  }

  if (!existing) {
    mapping.createdAt = new Date();
    await db.collection<OrderMapping>(COLLECTION).insertOne(mapping);
  } else {
    await db.collection(COLLECTION).updateOne({ orderId }, { $set: mapping });
  }

  return mapping;
}

export async function getMappingByDespatch(despatchDocumentId: string): Promise<OrderMapping | null> {
  const client = await clientPromise;
  const db = client.db();
  return db.collection<OrderMapping>(COLLECTION).findOne({ despatchDocumentId });
}

export async function getOrderIdsForUser(
  email: string,
  role: string,
  status?: string
): Promise<string[]> {
  const client = await clientPromise;
  const db = client.db();

  const filter: Record<string, string> = role === "buyer"
    ? { buyerEmail: email }
    : { sellerEmail: email };

  if (status) {
    filter.status = status;
  }

  const mappings = await db
    .collection<OrderMapping>(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return mappings.map((m) => m.orderId);
}

export async function assertOrderAccess(
  email: string,
  role: string,
  orderId: string
): Promise<void> {
  const mapping = await getMapping(orderId);
  if (!mapping) return; // No mapping = no restriction (backward compat)

  if (role === "buyer" && mapping.buyerEmail !== email) {
    throw new Error("Access denied");
  }
  if (role === "seller" && mapping.sellerEmail !== email) {
    throw new Error("Access denied");
  }
}
```

- [ ] **Step 2: Delete order-links.ts**

```bash
rm src/lib/order-links.ts
```

- [ ] **Step 3: Commit**

```bash
git add -f src/lib/order-access.ts
git rm -f src/lib/order-links.ts 2>/dev/null; git add -A src/lib/
git commit -m "feat: add MongoDB-backed order access control, remove in-memory order links"
```

---

### Task 4: Update Session Helper

**Files:**
- Modify: `src/lib/session.ts`

- [ ] **Step 1: Add email, remove chalksniffer from session data**

Replace the entire contents of `src/lib/session.ts` with:

```typescript
import { auth } from "@/auth";
import clientPromise from "@/lib/db";
import { SessionData, User } from "./types";

export async function getSessionOrNull(): Promise<SessionData | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const token = session as unknown as {
    user: { email: string; name: string };
    despatchSessionId?: string;
    despatchClientId?: string;
  };

  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection<User>("users").findOne({
    email: session.user.email,
  });

  if (!user) return null;

  return {
    role: user.role,
    name: user.name,
    email: user.email,
    despatch: {
      sessionId: token.despatchSessionId ?? "",
      clientId: token.despatchClientId ?? "",
    },
    lastminutepush: user.lastminutepush,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add -f src/lib/session.ts
git commit -m "feat: add email to session, remove chalksniffer from session data"
```

---

### Task 5: Remove Chalksniffer from Auth & Registration

**Files:**
- Modify: `src/auth.ts`
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Remove Chalksniffer registration from register route**

In `src/app/api/auth/register/route.ts`, delete the Chalksniffer provisioning block (lines 44-49):

```typescript
// DELETE THIS:
    const chalkRes = await fetch(
      `${process.env.CHALKSNIFFER_API_URL}/auth/register`,
      { method: "POST" }
    );
    if (!chalkRes.ok) throw new Error("Chalksniffer registration failed");
    const chalkData = await chalkRes.json();
```

And remove `chalksniffer` from the `insertOne` call (line 85). The user document insert should become:

```typescript
    await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      role,
      despatch: { email, password: hashedPassword },
      lastminutepush: { apiKey: lmpData.apiKey },
      createdAt: new Date(),
    });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: remove Chalksniffer provisioning from registration"
```

---

### Task 6: Update All chalksniffer(session) Call Sites

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`
- Modify: `src/app/api/orders/[id]/xml/route.ts`
- Modify: `src/app/api/orders/recurring/route.ts`
- Modify: `src/app/api/orders/recommend/route.ts`
- Modify: `src/app/api/orders/csv/route.ts`

- [ ] **Step 1: Update all files**

In every file listed above, change all occurrences of `chalksniffer(session)` to `chalksniffer()`.

**src/app/api/orders/route.ts** — lines 12 and 22:
```typescript
// Before: const res = await chalksniffer(session).get(...)
// After:  const res = await chalksniffer().get(...)
```

**src/app/api/orders/[id]/route.ts** — lines 13, 27, 40:
```typescript
// Same change: chalksniffer(session) → chalksniffer()
```

**src/app/api/orders/[id]/xml/route.ts** — line 13:
```typescript
const res = await chalksniffer().get(`/orders/${id}/xml`);
```

**src/app/api/orders/recurring/route.ts** — line 9:
```typescript
const res = await chalksniffer().post("/orders/recurring", {});
```

**src/app/api/orders/recommend/route.ts** — line 9:
```typescript
const res = await chalksniffer().get("/order/recommend");
```

**src/app/api/orders/csv/route.ts** — line 11:
```typescript
const res = await chalksniffer().get(`/orders/csv${query ? `?${query}` : ""}`);
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: errors only in files that still import from `order-links` (we fix those next).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/
git commit -m "feat: update all chalksniffer calls to use shared env key"
```

---

### Task 7: Create Sellers API Endpoint

**Files:**
- Create: `src/app/api/users/sellers/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
// src/app/api/users/sellers/route.ts
import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";

export async function GET() {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();
  const sellers = await db
    .collection("users")
    .find({ role: "seller" }, { projection: { name: 1, email: 1, _id: 0 } })
    .toArray();

  return NextResponse.json(sellers);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/users/sellers/route.ts
git commit -m "feat: add GET /api/users/sellers endpoint"
```

---

### Task 8: Rewrite Orders API with Mappings & Access Control

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/api/orders/[id]/route.ts`

- [ ] **Step 1: Rewrite orders list + create route**

Replace the entire contents of `src/app/api/orders/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/api-clients";
import { setMapping, getOrderIdsForUser } from "@/lib/order-access";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || undefined;
  const limit = Number(searchParams.get("limit") || "20");
  const offset = Number(searchParams.get("offset") || "0");

  // Get order IDs this user has access to
  const orderIds = await getOrderIdsForUser(session.email, session.role, status);

  if (orderIds.length === 0) {
    return NextResponse.json({ orders: [], totalOrders: 0, limit, offset });
  }

  // Fetch all accessible orders from Chalksniffer
  const res = await chalksniffer().get(`/orders?limit=1000&offset=0`);
  if (!res.ok) {
    return NextResponse.json({ orders: [], totalOrders: 0, limit, offset });
  }
  const data = await res.json();

  // Filter to only orders this user has access to
  const idSet = new Set(orderIds);
  const filtered = (data.orders || []).filter(
    (o: { id: string }) => idSet.has(o.id)
  );

  // Apply pagination
  const paginated = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    orders: paginated,
    totalOrders: filtered.length,
    limit,
    offset,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { sellerEmail, ...orderBody } = body;

  if (!sellerEmail) {
    return NextResponse.json({ error: "sellerEmail is required" }, { status: 400 });
  }

  const res = await chalksniffer().post("/orders", orderBody);
  const data = await res.json();

  if (res.ok && data.id) {
    await setMapping(data.id, {
      orderId: data.id,
      buyerEmail: session.email,
      sellerEmail,
    });
  }

  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 2: Add access control to single order routes**

Replace the entire contents of `src/app/api/orders/[id]/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { chalksniffer } from "@/lib/api-clients";
import { assertOrderAccess } from "@/lib/order-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const res = await chalksniffer().get(`/orders/${id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const res = await chalksniffer().put(`/orders/${id}`, body);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await assertOrderAccess(session.email, session.role, id);
  } catch {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const res = await chalksniffer().delete(`/orders/${id}`);
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/route.ts src/app/api/orders/\[id\]/route.ts
git commit -m "feat: orders API uses mappings for access control and filtering"
```

---

### Task 9: Rewrite Links API & Update Despatch/Invoice Routes

**Files:**
- Modify: `src/app/api/links/route.ts`
- Modify: `src/app/api/despatch/route.ts`
- Modify: `src/app/api/despatch/[documentId]/receipt/route.ts`
- Modify: `src/app/api/invoices/route.ts`

- [ ] **Step 1: Rewrite links route to use MongoDB**

Replace the entire contents of `src/app/api/links/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import { getMapping, setMapping } from "@/lib/order-access";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = request.nextUrl.searchParams.get("orderId");
  if (orderId) {
    const mapping = await getMapping(orderId);
    return NextResponse.json(mapping || { orderId, status: "placed" });
  }

  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const mapping = await setMapping(body.orderId, body);
  return NextResponse.json(mapping);
}
```

- [ ] **Step 2: Update despatch route**

In `src/app/api/despatch/route.ts`, change the import and `setLink` call:

Replace:
```typescript
import { setLink } from "@/lib/order-links";
```
With:
```typescript
import { setMapping } from "@/lib/order-access";
```

Replace:
```typescript
    setLink(body.orderReference.id, { despatchDocumentId: data.documentId || body.documentID });
```
With:
```typescript
    await setMapping(body.orderReference.id, { despatchDocumentId: data.documentId || body.documentID });
```

- [ ] **Step 3: Update receipt route**

In `src/app/api/despatch/[documentId]/receipt/route.ts`, change the import and calls:

Replace:
```typescript
import { getLinkByDespatch, setLink } from "@/lib/order-links";
```
With:
```typescript
import { getMappingByDespatch, setMapping } from "@/lib/order-access";
```

Replace:
```typescript
    const link = getLinkByDespatch(documentId);
    if (link) {
      setLink(link.orderId, { receiptAdviceId: data.receiptAdviceId });
```
With:
```typescript
    const mapping = await getMappingByDespatch(documentId);
    if (mapping) {
      await setMapping(mapping.orderId, { receiptAdviceId: data.receiptAdviceId });
```

- [ ] **Step 4: Update invoices route**

In `src/app/api/invoices/route.ts`, change the import and `setLink` call:

Replace:
```typescript
import { setLink } from "@/lib/order-links";
```
With:
```typescript
import { setMapping } from "@/lib/order-access";
```

Replace:
```typescript
    setLink(body.order_reference, { invoiceId: data.invoice.invoice_id });
```
With:
```typescript
    await setMapping(body.order_reference, { invoiceId: data.invoice.invoice_id });
```

- [ ] **Step 5: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/links/route.ts src/app/api/despatch/ src/app/api/invoices/route.ts
git commit -m "feat: rewrite links, despatch, invoice routes to use MongoDB order mappings"
```

---

### Task 10: Update Order Creation Form — Dynamic Seller Dropdown

**Files:**
- Modify: `src/app/orders/create/page.tsx`

- [ ] **Step 1: Replace hardcoded supplier list with dynamic fetch**

At the top of the component function in `src/app/orders/create/page.tsx`, add seller state and fetch:

Replace the import line:
```typescript
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES, SUPPLIER_DIRECTORY } from "@/lib/construction-data";
```
With:
```typescript
import { useEffect } from "react";
import { MATERIAL_CATEGORIES, PRIORITIES, SAMPLE_SITES } from "@/lib/construction-data";
```

Add state variables after the existing state declarations (after `const [priority, setPriority] = useState("standard");`):

```typescript
  const [sellers, setSellers] = useState<{ name: string; email: string }[]>([]);
  const [sellerEmail, setSellerEmail] = useState("");
```

Add a useEffect to fetch sellers:

```typescript
  useEffect(() => {
    fetch("/api/users/sellers")
      .then((res) => res.json())
      .then((data) => setSellers(data))
      .catch(() => {});
  }, []);
```

Note: also add `useEffect` to the existing `import { useState } from "react"` — change it to `import { useState, useEffect } from "react"`.

- [ ] **Step 2: Update the supplier dropdown UI**

Replace the entire Supplier fieldset (the one with `SUPPLIER_DIRECTORY`) with:

```tsx
        <fieldset className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <legend className="text-sm font-medium text-ink">Supplier</legend>
          <div className="mb-3">
            <label className="input-label">Select a registered supplier</label>
            <select
              required
              value={sellerEmail}
              onChange={(e) => {
                const selected = sellers.find(s => s.email === e.target.value);
                setSellerEmail(e.target.value);
                if (selected) {
                  updateParty(setSeller, "partyName", selected.name);
                }
              }}
              className="input mt-1"
            >
              <option value="">Choose a supplier...</option>
              {sellers.map(s => (
                <option key={s.email} value={s.email}>{s.name}</option>
              ))}
            </select>
          </div>
          <PartyFields label="Supplier Details" party={seller} onChange={(f, v) => updateParty(setSeller, f, v)} />
        </fieldset>
```

- [ ] **Step 3: Add sellerEmail to the order payload**

In the `handleSubmit` function, add `sellerEmail` to the `orderBody` object. Change:

```typescript
    const orderBody = {
      issueDate,
```

To:

```typescript
    const orderBody = {
      sellerEmail,
      issueDate,
```

- [ ] **Step 4: Commit**

```bash
git add src/app/orders/create/page.tsx
git commit -m "feat: replace hardcoded supplier list with dynamic seller dropdown"
```

---

### Task 11: Add Status Filter Tabs to Orders Page

**Files:**
- Modify: `src/app/orders/page.tsx`

- [ ] **Step 1: Add status filter state and UI**

Replace the entire contents of `src/app/orders/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { OrderPaginated } from "@/lib/types";
import { Download } from "lucide-react";

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "placed", label: "Placed" },
  { id: "despatched", label: "Despatched" },
  { id: "received", label: "Received" },
  { id: "invoiced", label: "Invoiced" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderPaginated[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const statusParam = statusFilter ? `&status=${statusFilter}` : "";
      const [ordersRes, sessionRes] = await Promise.all([
        fetch(`/api/orders?limit=${limit}&offset=${offset}${statusParam}`),
        fetch("/api/auth/session"),
      ]);
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
        setTotal(data.totalOrders || 0);
      }
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRole(session.role);
      }
      setLoading(false);
    }
    load();
  }, [offset, statusFilter]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-ink-muted">Loading orders...</div>;
  }

  const isBuyer = role === "buyer";

  if (orders.length === 0 && offset === 0 && !statusFilter) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-ink">Orders</h1>
        <EmptyState
          title="No orders found"
          description={isBuyer ? "Place your first material order" : "Material orders from contractors will appear here"}
          actionLabel={isBuyer ? "Create Order" : undefined}
          actionHref={isBuyer ? "/orders/create" : undefined}
        />
      </div>
    );
  }

  function formatDate(value: unknown): string {
    if (!value) return "—";
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  const columns = [
    { key: "id" as const, label: "Order ID" },
    {
      key: "issueDate" as const,
      label: "Issue Date",
      render: (val: unknown) => formatDate(val),
    },
    { key: "buyerName" as const, label: "Buyer" },
    { key: "sellerName" as const, label: "Seller" },
    {
      key: "payableAmount" as const,
      label: "Amount",
      render: (val: unknown, row: OrderPaginated) =>
        `${val} ${row.documentCurrencyCode}`,
    },
    {
      key: "createdAt" as const,
      label: "Created",
      render: (val: unknown) => formatDate(val),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isBuyer ? "Your material orders across all sites." : "Incoming material orders from contractors."}
          </p>
        </div>
        <a href="/api/orders/csv" className="btn-ghost bg-white text-ink">
          <Download size={16} />
          Export CSV
        </a>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setStatusFilter(tab.id); setOffset(0); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              statusFilter === tab.id
                ? "bg-accent-primary text-white"
                : "bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders match this filter"
          description="Try a different status filter"
        />
      ) : (
        <DataTable<OrderPaginated>
          columns={columns}
          data={orders}
          onRowClick={(row) => router.push(`/orders/${row.id}`)}
          pagination={{ total, limit, offset, onPageChange: setOffset }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/orders/page.tsx
git commit -m "feat: add status filter tabs to orders page"
```

---

### Task 12: Update Dashboard to Filter by Role

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Dashboard already fetches from /api/orders**

The dashboard fetches `GET /api/orders?limit=5` which now returns role-filtered orders (from Task 8). No change needed for the data fetch — the backend handles filtering.

However, the `OrderLink` type import may exist in downstream pages. Check if `src/app/orders/[id]/page.tsx` or `src/app/orders/[id]/receive/page.tsx` import `OrderLink` from types — if so, they need to be updated to use `OrderMapping`.

- [ ] **Step 2: Update OrderLink references in frontend pages**

In `src/app/orders/[id]/page.tsx`, if it imports `OrderLink`, change to `OrderMapping`:

Replace:
```typescript
import { OrderLink } from "@/lib/types";
```
With:
```typescript
import { OrderMapping } from "@/lib/types";
```

And update the state type:
```typescript
const [link, setLink] = useState<OrderMapping | null>(null);
```

Do the same in `src/app/orders/[id]/receive/page.tsx` if it imports `OrderLink`.

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A src/
git commit -m "feat: update frontend to use OrderMapping type, dashboard uses role-filtered orders"
```

---

### Task 13: Smoke Test

- [ ] **Step 1: Start the dev server**

```bash
cd b2b-order-platform && npm run dev
```

- [ ] **Step 2: Register a buyer and a seller**

1. Register as a buyer (e.g., buyer@test.com)
2. Log out
3. Register as a seller (e.g., seller@test.com)
4. Log out

- [ ] **Step 3: Test order creation with seller assignment**

1. Log in as buyer
2. Go to /orders/create
3. Verify the supplier dropdown shows "seller@test.com" (the registered seller)
4. Select the seller and fill in order details
5. Submit the order
6. Verify redirect to order detail page

- [ ] **Step 4: Test seller sees the order**

1. Log out, log in as seller
2. Go to /orders
3. Verify the order created by the buyer appears
4. Click to view order detail — verify access works

- [ ] **Step 5: Test status filtering**

1. On /orders, click the status tabs (Placed, Despatched, etc.)
2. Verify filtering works for both buyer and seller

- [ ] **Step 6: Test access control**

1. Register a second seller (seller2@test.com)
2. Log in as seller2
3. Go to /orders — should NOT see the order assigned to seller@test.com

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete order access control and dynamic seller assignment"
```
