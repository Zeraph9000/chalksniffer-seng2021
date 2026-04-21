# Stores API

The stores API lives inside the Next app at `b2b-order-platform/src/app/api/stores`.
All routes require an authenticated platform session. Create and update routes require a seller account.

## Store Model

```ts
type StoreStatus = "active" | "paused" | "closed";

type Store = {
  storeId: string;
  userId: string;
  storeName: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  location?: string;
  category?: string;
  status: StoreStatus;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
};
```

## Endpoints

### `POST /api/stores`

Creates one store for the authenticated seller.

Required JSON fields:

- `storeName`
- `description`
- `status`: `active`, `paused`, or `closed`

Optional JSON fields:

- `logoUrl`
- `bannerUrl`
- `location`
- `category`

Responses:

- `201`: store created
- `400`: invalid body or missing required fields
- `401`: unauthenticated
- `403`: authenticated user is not a seller
- `409`: seller already owns a store

### `GET /api/stores`

Returns all visible stores. Stores with `status: "closed"` are excluded.

Responses:

- `200`: array of stores
- `401`: unauthenticated

### `GET /api/stores/me`

Returns the authenticated user's store.

Responses:

- `200`: store
- `401`: unauthenticated
- `404`: authenticated user does not own a store

### `GET /api/stores/{storeId}`

Returns a store by `storeId`.

Responses:

- `200`: store
- `401`: unauthenticated
- `404`: store does not exist

### `PUT /api/stores/{storeId}`

Updates editable fields for a store owned by the authenticated seller.

Editable JSON fields:

- `storeName`
- `description`
- `logoUrl`
- `bannerUrl`
- `location`
- `category`
- `status`

Responses:

- `200`: updated store
- `400`: invalid body
- `401`: unauthenticated
- `403`: authenticated user is not the owner or is not a seller
- `404`: store does not exist

### `PUT /api/stores/{storeId}/status`

Updates only the store status for a store owned by the authenticated seller.

Required JSON fields:

- `status`: `active`, `paused`, or `closed`

Responses:

- `200`: updated store
- `400`: invalid status value
- `401`: unauthenticated
- `403`: authenticated user is not the owner or is not a seller
- `404`: store does not exist
