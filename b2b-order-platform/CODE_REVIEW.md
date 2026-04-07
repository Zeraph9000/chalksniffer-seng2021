# Code Review & Cleanup Plan

Generated from a three-agent review (reuse, quality, efficiency) of all source files in `b2b-order-platform/src/`.

---

## Priority 1: Critical Issues

### 1.1 N+1 Query Pattern — Dashboard & Orders Pages
**Files:** `src/app/dashboard/page.tsx:82-86`, `src/app/orders/page.tsx:107-110`

Both pages fetch a list of orders, then make **individual** `/api/links?orderId=` calls for each order in a `Promise.all`. Dashboard does up to 100 calls, orders page up to 500.

**Fix:** Add batch support to the links API (`GET /api/links?orderIds=id1,id2,id3`) that accepts multiple order IDs and returns an array of mappings in a single query. Update both pages to call the batch endpoint once instead of N times.

**File to change:** `src/app/api/links/route.ts:5-16` — add `orderIds` query param support.

---

### 1.2 Unbounded Chalksniffer Fetch
**File:** `src/app/api/orders/route.ts:17`

Every request to the orders API fetches `limit=500` from Chalksniffer regardless of what the client requested. This is wasteful bandwidth and memory.

**Fix:** Since we filter by mapping IDs anyway, fetch only the IDs we need. Alternatively, pass through the client's limit/offset to Chalksniffer and post-filter.

---

### 1.3 Sequential Order Creation in Checkout
**File:** `src/app/api/checkout/route.ts:60-118`

Orders for multiple sellers are created in a sequential `for` loop. Stock updates are also sequential within each iteration.

**Fix:** Use `Promise.all` to create orders for all sellers in parallel. Batch stock updates with MongoDB `bulkWrite`.

---

## Priority 2: Dead Code Removal

### 2.1 Unused Components
These components are defined but never imported anywhere in the app:

| File | Status |
|------|--------|
| `src/components/data-table.tsx` | Unused (was replaced by inline table in orders page) |
| `src/components/order-detail-card.tsx` | Unused (order detail page has its own layout) |
| `src/components/navbar.tsx` | Unused (sidebar is used instead in layout) |
| `src/components/role-badge.tsx` | Only imported by unused navbar.tsx |

**Fix:** Delete all four files.

### 2.2 Pages That Should Be Deleted
| File | Reason |
|------|--------|
| `src/app/orders/create/page.tsx` | Replaced by `/checkout` flow. Should have been deleted in Task 9. |
| `src/app/orders/[id]/change/page.tsx` | Replaced by `/orders/[id]/edit`. Should have been deleted in order lifecycle redesign. |

**Fix:** Delete both files. Verify no links reference them.

---

## Priority 3: Code Duplication

### 3.1 `formatDate()` — Duplicated in 2 files
- `src/app/orders/page.tsx:41-45`
- `src/components/order-row.tsx:7-11`

**Fix:** Extract to `src/lib/format-utils.ts`.

### 3.2 `formatCurrency()` — Duplicated in 6 files
- `src/app/orders/page.tsx:47-55`
- `src/components/order-stats.tsx:12-19`
- `src/app/catalogue/page.tsx:33-39`
- `src/app/marketplace/page.tsx:25-31`
- `src/app/checkout/page.tsx:24-30`
- `src/app/cart/page.tsx:8-14`

**Fix:** Extract to `src/lib/format-utils.ts` with optional decimal parameter.

### 3.3 `getStatusLabel()` — Duplicated in 2 files
- `src/app/dashboard/page.tsx:30-39`
- `src/app/orders/page.tsx:30-39`

Also appears as inline ternary in `src/app/orders/[id]/page.tsx:89-95`.

**Fix:** Extract to `src/lib/status-colors.ts` (alongside existing `getStatusConfig`).

### 3.4 `statusClass()` — Duplicated in 2 files
- `src/app/invoices/page.tsx:8-15`
- `src/app/despatch/page.tsx:8-15`

**Fix:** Extract to `src/lib/status-colors.ts` or use existing CSS classes directly with a mapping constant.

### 3.5 `OrderWithMapping` type — Duplicated in 3 files
- `src/app/dashboard/page.tsx:19`
- `src/app/orders/page.tsx:18`

**Fix:** Add to `src/lib/types.ts`.

### 3.6 `Stats` type — Duplicated in 2 files
- `src/app/dashboard/page.tsx:10-17`
- `src/components/order-stats.tsx:3-10`

**Fix:** Add to `src/lib/types.ts`.

### 3.7 `SessionData` redefined locally in checkout
- `src/app/checkout/page.tsx:9-22` defines its own `SessionData` with extra fields instead of importing from `src/lib/types.ts`.

**Fix:** Extend the existing `SessionData` type or import and use it.

### 3.8 Cart grouping logic — Duplicated in 2 files
- `src/app/cart/page.tsx:34-40`
- `src/app/checkout/page.tsx:96-100`

Both group cart items by seller with identical logic.

**Fix:** Extract to a helper in `src/lib/cart-context.tsx` (e.g., `groupItemsBySeller(items)`).

---

## Priority 4: Code Quality

### 4.1 Stringly-Typed Role & Status Comparisons
~34 occurrences of raw `"buyer"`, `"seller"`, `"placed"`, `"despatched"` etc. across the codebase.

**Fix:** Create `src/lib/constants.ts`:
```typescript
export const ROLES = { BUYER: "buyer", SELLER: "seller" } as const;
export const ORDER_STATUSES = { PLACED: "placed", DESPATCHED: "despatched", ... } as const;
```

### 4.2 Navigation Inconsistency
Some pages use `window.location.href` (full reload), others use `router.push()` (client-side):
- `window.location.href`: login, dashboard redirect, checkout success, sidebar logout
- `router.push()`: cancel page, change page, edit page, invoice create, despatch create

**Note:** `window.location.href` is intentional for login/logout (to clear server component cache). For other navigation, `router.push()` is preferred.

**Fix:** Audit each usage. Keep `window.location.href` only for auth transitions (login, logout, post-registration). Use `router.push()` for all in-app navigation.

### 4.3 `eslint-disable` Comments
- `src/app/orders/[id]/page.tsx:15` — `any` type for receipt state
- `src/components/data-table.tsx:23` — `any` in generic (dead code, delete file)

**Fix:** Create a `Receipt` type in `src/lib/types.ts` for the receipt data. Delete data-table.tsx.

### 4.4 Type Assertions with `unknown`
- `src/auth.config.ts:9` — `(user as unknown as { role: string })`
- `src/auth.config.ts:15` — `(session.user as unknown as { role: string })`

**Fix:** Extend NextAuth types properly with module augmentation:
```typescript
declare module "next-auth" {
  interface User { role: string; }
  interface Session { user: User & DefaultSession["user"]; }
}
```

### 4.5 Excessive useState in Form Pages
- `src/app/orders/[id]/edit/page.tsx:32-48` — 17 separate useState calls
- `src/app/orders/create/page.tsx:79-100` — similar

**Fix:** Consider using a single form state object or `useReducer`. Not urgent but improves readability.

---

## Priority 5: Efficiency Improvements

### 5.1 Client-Side Filtering on 500 Items
**File:** `src/app/orders/page.tsx:167-207`

`useMemo` filters and sorts up to 500 orders on every filter state change (6 dependencies).

**Fix:** Move filtering to server-side API, or accept the client-side approach for <500 items (acceptable for a university project).

### 5.2 Products API Two-Query Pattern
**File:** `src/app/api/products/route.ts:46-51`

Fetches all products, then fetches seller users to enrich with company names.

**Fix:** Denormalize `sellerCompanyName` into the products collection at insert/update time. Or use MongoDB aggregation `$lookup`.

### 5.3 setTimeout Without Cleanup
**File:** `src/app/marketplace/page.tsx:141-147`

`setTimeout` in `handleAddToCart` sets feedback state, no cleanup if component unmounts.

**Fix:** Store timeout ID in a ref and clear in useEffect cleanup, or use a flag ref to guard the setState call.

### 5.4 Quantity State Initialized for All Products
**File:** `src/app/marketplace/page.tsx:63-66`

Creates a quantity entry for every product on load, even if the user never interacts with it.

**Fix:** Use lazy initialization: `getQuantity(id) => quantities[id] ?? 1`.

### 5.5 MATERIAL_CATEGORIES Linear Search Per Product
**File:** `src/app/marketplace/page.tsx:252`

`MATERIAL_CATEGORIES.find()` runs for every product on every render.

**Fix:** Memoize with `useMemo(() => new Map(MATERIAL_CATEGORIES.map(c => [c.id, c])), [])`.

---

## Summary

| Priority | Count | Effort | Impact |
|----------|-------|--------|--------|
| P1: Critical (N+1, unbounded fetch, sequential checkout) | 3 | Medium | High |
| P2: Dead code removal | 6 files | Low | Medium |
| P3: Code duplication | 8 items | Low-Medium | Medium |
| P4: Code quality | 5 items | Low-Medium | Low-Medium |
| P5: Efficiency | 5 items | Low | Low |
