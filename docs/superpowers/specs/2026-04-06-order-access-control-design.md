# Order Access Control & Dynamic Seller Assignment

**Date:** 2026-04-06
**Status:** Draft

## Overview

Replace the per-user Chalksniffer API key model with a single shared key. Add a MongoDB `orderMappings` collection that tracks which buyer created each order and which seller it's assigned to. Add centralized access control so buyers only see their orders and sellers only see orders assigned to them. Replace the hardcoded supplier dropdown with registered sellers from the database. Replace the in-memory order links with persistent MongoDB storage.

## Goals

- Single Chalksniffer API key for the entire app (stored as env var)
- Buyers select from registered sellers when creating orders
- Sellers see only orders assigned to them
- Both buyers and sellers can filter orders by status
- Centralized access control for all order-related routes
- Persistent order links (replacing in-memory Map)

## Data Model

### New collection: `orderMappings`

| Field | Type | Notes |
|-------|------|-------|
| `orderId` | string | Chalksniffer order ID, unique |
| `buyerEmail` | string | Email of the buyer who created the order |
| `sellerEmail` | string | Email of the seller assigned to the order |
| `status` | `"placed"` \| `"despatched"` \| `"received"` \| `"invoiced"` | Order lifecycle status |
| `despatchDocumentId` | string? | Linked despatch advice ID |
| `receiptAdviceId` | string? | Linked receipt advice ID |
| `invoiceId` | string? | Linked invoice ID |
| `createdAt` | Date | When the order was created |

Replaces the in-memory `orderLinks` Map and adds buyer/seller assignment.

### User document changes

Remove `chalksniffer: { apiKey: string }` from the `User` type. Chalksniffer API key is no longer per-user.

### SessionData changes

Remove `chalksniffer: { apiKey: string }` from `SessionData`. Add `email: string` to `SessionData` so routes can identify the current user for access control. The `chalksniffer()` API client reads from `process.env.CHALKSNIFFER_API_KEY`.

## Chalksniffer API Client

The `chalksniffer()` function changes from session-based to env-based:

```typescript
export function chalksniffer() {
  const authHeaders = { Authorization: `Bearer ${process.env.CHALKSNIFFER_API_KEY}` };
  // same get/post/put/delete methods
}
```

All call sites change from `chalksniffer(session).get(...)` to `chalksniffer().get(...)`.

## Access Control

A centralized module at `src/lib/order-access.ts`:

### `assertOrderAccess(email: string, role: string, orderId: string): Promise<void>`

- Buyer: access granted if `buyerEmail === email`
- Seller: access granted if `sellerEmail === email`
- Throws error if access denied

Called by all routes that operate on a specific order (GET, PUT, DELETE on `/orders/[id]`, despatch, receipt, invoice routes).

### `getOrderIdsForUser(email: string, role: string, status?: string): Promise<string[]>`

- Buyer: returns orderIds where `buyerEmail === email`
- Seller: returns orderIds where `sellerEmail === email`
- Optional status filter for both roles

Called by list endpoints (GET `/orders`, dashboard).

## Seller Dropdown & Order Creation

### New endpoint: `GET /api/users/sellers`

Queries MongoDB `users` collection for `role === "seller"`, returns `{ name, email }[]`.

### Order creation form (`src/app/orders/create/page.tsx`)

- Replace hardcoded `SUPPLIER_DIRECTORY` with a fetch to `GET /api/users/sellers`
- When buyer selects a seller, `sellerSupplierParty.partyName` is auto-filled
- Buyer can still manually edit party details (address, etc.)
- Frontend sends `sellerEmail` alongside the order body

### Order creation API (`POST /api/orders`)

1. Extract `sellerEmail` from the request body
2. Forward order data (without `sellerEmail`) to Chalksniffer via shared API key
3. On success, create `orderMappings` document: `{ orderId, buyerEmail: session.email, sellerEmail, status: "placed", createdAt }`

## Order Listing & Filtering

Both buyers and sellers see `/orders` with the same UI:

- Orders filtered by role (buyers see orders they created, sellers see orders assigned to them)
- Status filter tabs: All, Placed, Despatched, Received, Invoiced
- Query flow: get orderIds from `orderMappings` (filtered by email + role + optional status), then fetch order details from Chalksniffer

Dashboard shows recent orders using the same filtering.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CHALKSNIFFER_API_KEY` | Single shared Chalksniffer API key |

`CHALKSNIFFER_API_URL` remains unchanged.

## Registration Flow Changes

Remove Chalksniffer API key provisioning from the register route. The register route no longer calls `POST /auth/register` on Chalksniffer.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/types.ts` | Remove `chalksniffer` from `SessionData` and `User` |
| `src/lib/api-clients.ts` | `chalksniffer()` reads from env, no session param |
| `src/lib/order-access.ts` | **New.** `assertOrderAccess()` and `getOrderIdsForUser()` |
| `src/lib/order-links.ts` | **Delete.** Replaced by `orderMappings` in MongoDB |
| `src/lib/session.ts` | Remove `chalksniffer` from returned `SessionData` |
| `src/auth.ts` | Remove Chalksniffer registration from `authorize` callback |
| `src/app/api/auth/register/route.ts` | Remove Chalksniffer provisioning |
| `src/app/api/users/sellers/route.ts` | **New.** Returns registered sellers |
| `src/app/api/orders/route.ts` | Use mapping for list, create mapping on POST |
| `src/app/api/orders/[id]/route.ts` | Add `assertOrderAccess` check |
| `src/app/api/links/route.ts` | Rewrite to use MongoDB `orderMappings` |
| `src/app/orders/create/page.tsx` | Fetch sellers from API, send `sellerEmail` with order |
| `src/app/orders/page.tsx` | Filter by user role via mappings, add status tabs |
| `src/app/dashboard/page.tsx` | Filter recent orders by role |
| All routes using `chalksniffer(session)` | Change to `chalksniffer()` |
| `.env.local` | Add `CHALKSNIFFER_API_KEY` |

## Out of Scope

- Notifications when a seller is assigned an order
- Seller address auto-fill from user profile (buyer can manually enter)
- Order reassignment (changing the seller after creation)
