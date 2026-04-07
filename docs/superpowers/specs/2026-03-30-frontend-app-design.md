# B2B Order Management Platform — Frontend Application Design

## 1. Application Concept & Target Audience

**Product:** A unified B2B order management platform for the Australian construction industry that connects contractors (buyers) and suppliers (sellers) through the full order-to-cash lifecycle — from browsing product catalogues and placing orders, through pre-despatch negotiation, despatch and receipt, to invoicing and payment.

**Target audience:** Construction contractors and material suppliers who need to manage procurement, deliveries, and invoicing across multiple project sites.

**Value proposition:** "One platform, both sides of the transaction." A contractor browses supplier catalogues, adds materials to a cart, and checks out. A supplier manages their product catalogue, reviews incoming orders, negotiates changes, despatches goods, and generates invoices — all in one place, backed by UBL-compliant documents.

### Use Cases & User Stories

#### UC1: User Registration & Authentication

**As a** user, **I want to** register with my business details and log in, **so that** I can access the platform with my company identity.

**Acceptance Criteria:**
- User registers with: contact name, email, password, phone, company name, ABN (11-digit Australian Business Number), street address, city, postal code, role (contractor/supplier)
- Login requires only email and password (login is the default mode)
- On registration, user account is created in MongoDB with business profile
- Auth.js (NextAuth v5) manages JWT sessions with role stored in token
- ABN serves as the `partyIdentification` on all UBL documents
- Company name serves as `partyName` on orders
- Middleware enforces role-based route access

---

#### UC2: Seller Manages Product Catalogue

**As a** supplier, **I want to** list my available construction materials with prices and stock levels, **so that** contractors can browse and order from my catalogue.

**Acceptance Criteria:**
- Seller accesses `/catalogue` page from sidebar navigation
- Product table shows: name, category, unit price, unit code, stock, edit/delete actions
- "Add Product" button opens inline modal with fields: name, description, category (from MATERIAL_CATEGORIES), unit code (auto-set from category), unit price, currency, stock quantity
- Edit opens same modal pre-filled with existing data
- Delete removes product with confirmation
- Products stored in MongoDB `products` collection with `sellerEmail` ownership
- Only the owning seller can edit/delete their products

---

#### UC3: Buyer Browses Catalogue & Places Order via Cart

**As a** contractor, **I want to** browse materials from all suppliers, add items to a cart, and checkout to create orders, **so that** I can procure materials efficiently.

**Acceptance Criteria:**
- Buyer accesses `/marketplace` (labelled "Catalogue") from sidebar navigation
- Search bar for free text search across product names, descriptions, categories
- Filter sidebar: category checkboxes, price range (min/max)
- Product cards show: name, supplier company name, category, unit price, stock available
- Quantity input capped at available stock — buyer cannot order more than available
- "Add to Cart" adds the item with selected quantity
- Cart persists in browser (localStorage) — session-only, no backend
- Cart page (`/cart`) shows items grouped by seller with editable quantities, per-seller subtotals, grand total
- Checkout page (`/checkout`): buyer details pre-filled from profile (editable), delivery address (pre-filled, editable), delivery date, optional note, read-only order summary
- On submit: one Chalksniffer order created per seller, order mappings created with dual statuses, stock decremented atomically
- If any product has insufficient stock at checkout, entire checkout fails with details

---

#### UC4: Pre-Despatch Negotiation

**As a** supplier, **I want to** review an incoming order and request changes if needed, **so that** the order is correct before I despatch.

**As a** contractor, **I want to** see change requests from my supplier and edit my order, **so that** we agree on the order before despatch.

**Acceptance Criteria:**
- Dual-status system: each order has `buyerStatus` and `sellerStatus` (either `needs_review` or `under_review`) while `status === "placed"`
- Seller views order → sees "Despatch Order" and "Request Change" buttons when `sellerStatus === "needs_review"`
- Seller requests change → provides a note (e.g., "Only 40 hard hats in stock") → statuses flip: `sellerStatus: "under_review"`, `buyerStatus: "needs_review"`
- Buyer sees seller's note in an amber banner on the order detail page
- Buyer clicks "Edit Order" → edit page (same layout as order form, seller fields read-only) → on save, order updated on Chalksniffer, statuses flip back
- Despatch is locked when `sellerStatus === "under_review"`
- Back-and-forth can repeat as many times as needed

---

#### UC5: Seller Despatches an Order & Buyer Processes Receipt

**As a** supplier, **I want to** create a despatch advice for an order, **so that** the contractor can track the shipment.

**As a** contractor, **I want to** process receipt of goods and report any discrepancies, **so that** the supplier knows what was actually received.

**Acceptance Criteria:**
- Seller creates despatch advice from order detail page:
  - Delivery address shown read-only from the order
  - Seller can add a note
  - Delivered quantities per line item
- On submission:
  - Despatch advice created via Despatch API (shared session, fresh per request)
  - Order mapping updated: `status: "despatched"`, `despatchDocumentId` stored
- Buyer sees "Process Receipt" on order detail page
- Buyer processes receipt:
  - Specifies received quantities per line item
  - Can report short quantities and add per-line notes for discrepancies
  - Receipt advice created via Despatch API
  - Order mapping updated: `status: "received"`, `receiptAdviceId` stored
- Receipt details (received quantities, short quantities, notes) visible on order detail page for both roles
- Discrepancy data feeds into invoice: invoice pre-fills with received quantities, not ordered quantities

---

#### UC6: Seller Creates an Invoice (Adjusted for Discrepancies)

**As a** supplier, **I want to** generate an invoice for a received order, **so that** the contractor can see the amount owed based on what was actually delivered.

**Acceptance Criteria:**
- Once order reaches "received" status, seller sees "Create Invoice" button
- Invoice form fetches receipt data and pre-fills with **received** quantities (not original ordered quantities) — adjusts for discrepancies automatically
- Customer ABN from `buyerCustomerParty.party.partyIdentification`
- Supplier identifier from `sellerSupplierParty.party.partyIdentification`
- On submission:
  - Invoice created via LastMinutePush API (shared API key)
  - Auto-marked as `sent` (buyer can see it immediately)
  - Order mapping updated: `status: "invoiced"`, `invoiceId` stored
- Order detail shows "Invoiced - Awaiting Payment" status
- Invoice detail shows role-appropriate labels:
  - Buyer sees "Payment Required"
  - Seller sees "Awaiting Payment"

---

#### UC7: Seller Marks Invoice as Paid

**As a** supplier, **I want to** record that payment has been received for an invoice, **so that** the order lifecycle is complete.

**Acceptance Criteria:**
- Seller can "Mark as Paid" from order detail page or invoice detail page
- Transitions invoice through `sent` → `paid` on LastMinutePush API
- Idempotent — handles already-paid gracefully (409 treated as success)
- Order mapping updated: `status: "paid"`
- Order detail shows "Invoiced - Paid" status
- Invoice detail shows "Paid" for both roles

---

#### UC8: Buyer Views Invoice & Exports XML

**As a** contractor, **I want to** view an invoice and export it as UBL XML, **so that** I can process payment and keep records.

**Acceptance Criteria:**
- Buyer sees "View Invoice" link on order detail page when `invoiceId` exists
- Invoice detail page shows: supplier/customer details with ABNs, line items, amounts, due date, status
- Status label is role-aware: buyer sees "Payment Required" (when sent) or "Paid"
- "Export XML" button downloads the invoice as a UBL 2.1 XML file
- XML fetched from LastMinutePush API with `Accept: application/xml` header

---

#### UC9: User Edits Profile & Changes Password

**As a** user, **I want to** view and edit my profile details and change my password, **so that** I can keep my business information up to date and maintain account security.

**Acceptance Criteria:**
- User navigates to `/profile` by clicking their name/avatar in the sidebar
- Tabbed interface: Personal, Business, Address, Security
- Each tab has its own save button
- Personal tab: edit name, email, phone; role shown read-only
- Business tab: edit company name, ABN
- Address tab: edit street, city, postal code, country
- Security tab: current password required to set a new password; new password must match confirmation
- If email is changed, uniqueness is enforced
- Toast notification on successful save
- Page styled with role accent color (orange for buyer, blue for seller)

---

## 2. Architecture

### Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | Next.js 14 (App Router) + React | SSR, file-based routing, API routes as gateway |
| Gateway | Next.js API Routes (`/app/api/`) | Centralizes auth, hides API keys, single interface for frontend |
| Auth | Auth.js (NextAuth v5) + bcrypt | JWT sessions, Credentials provider, Edge-safe middleware |
| Database | MongoDB | User accounts, product catalogues, order mappings, Auth.js adapter |
| Cart | React Context + localStorage | Client-side only, no backend persistence |
| Services | 3 external APIs (black boxes) | Chalksniffer (orders), Despatch API (shipping/receiving), LastMinutePush (invoices) |

### Architecture Diagram

```
┌─────────────────────────────────────┐
│  Browser (React)                    │
│  └── Cart Context (localStorage)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Next.js App                        │
│  ├── /api/auth     → Auth.js + MongoDB
│  ├── /api/products → MongoDB (catalogue)
│  ├── /api/checkout → MongoDB + Chalksniffer
│  ├── /api/orders   → Chalksniffer + MongoDB
│  ├── /api/despatch → Despatch API   │
│  ├── /api/invoices → LastMinutePush │
│  ├── /api/users    → MongoDB        │
│  ├── /api/links    → MongoDB        │
│  middleware.ts → role enforcement    │
│  auth.config.ts → Edge-safe JWT     │
│  auth.ts → Credentials provider     │
└──┬──────┬───────────┬──────────┬────┘
   │      │           │          │
   ▼      ▼           ▼          ▼
MongoDB Chalksniffer  Despatch  LastMinutePush
        API           API       API
       (shared key)  (shared   (shared key)
                      session)
```

### External APIs

| API | Auth Method | How Used |
|-----|------------|----------|
| Chalksniffer | `Authorization: Bearer <CHALKSNIFFER_API_KEY>` (single shared key from env) | Order CRUD, recurring orders, recommendations, CSV/XML export |
| Despatch & Order Management | `sessionId` header (fresh session per request using shared `DESPATCH_USERNAME`/`DESPATCH_PASSWORD`/`DESPATCH_EMAIL`) | Despatch advices, receipt advices, fulfilment cancellations |
| LastMinutePush | `X-API-Key: <LASTMINUTEPUSH_API_KEY>` (single shared key from env) | Invoice CRUD, status transitions (draft→sent→paid), UBL XML |

---

## 3. Auth Model

### Registration
User registers with business profile (name, email, password, phone, company name, ABN, address, role). Password hashed with bcrypt. No external API provisioning at registration — all external APIs use shared keys.

### Session Flow
Auth.js with JWT strategy. The `authorize` callback validates email/password against MongoDB. JWT token contains `role`. Session endpoint returns full business profile from MongoDB.

### Order Access Control
Centralised module (`src/lib/order-access.ts`):
- `assertOrderAccess(email, role, orderId)` — checks MongoDB mapping
- `getOrderIdsForUser(email, role, status?)` — returns accessible order IDs
- Buyer sees orders where `buyerEmail === email`
- Seller sees orders where `sellerEmail === email`

### Middleware
Edge-safe `auth.config.ts` (no Node.js modules) used by middleware. Full `auth.ts` (with bcrypt, MongoDB) used by API routes. Role-based route enforcement for buyer-only and seller-only pages.

---

## 4. Data Model

### Users Collection (MongoDB)
```
{
  _id, name, email, password (bcrypt), role,
  companyName, abn, phone,
  address: { streetName, cityName, postalZone, country },
  createdAt
}
```

### Products Collection (MongoDB)
```
{
  _id, sellerEmail, name, description, category, unitCode,
  unitPrice, currency, stock, createdAt
}
```

Stock decreases on order creation (checkout), increases on order edit or cancellation.

### Order Mappings Collection (MongoDB)
```
{
  orderId, buyerEmail, sellerEmail,
  status: "placed" | "despatched" | "received" | "invoiced" | "paid",
  buyerStatus: "needs_review" | "under_review",
  sellerStatus: "needs_review" | "under_review",
  sellerNote?,
  despatchDocumentId?, receiptAdviceId?, invoiceId?,
  payableAmount?, documentCurrencyCode?, issueDate?,
  createdAt
}
```

---

## 5. Route Structure

```
/app
├── login/                  ← public: register (with business profile) / login (default)
├── profile/                ← both roles: view/edit personal, business, address details + change password
├── dashboard/              ← kanban pipeline view: orders grouped by status
│
├── marketplace/            ← buyer-only: browse all products, search, filter, add to cart
├── cart/                   ← buyer-only: view cart grouped by seller, adjust quantities
├── checkout/               ← buyer-only: confirm details, delivery address, create orders
│
├── catalogue/              ← seller-only: manage product catalogue (add/edit/delete)
│
├── orders/
│   ├── page.tsx            ← search/filter table with sidebar filters
│   └── [id]/
│       ├── page.tsx        ← read-only order detail + role-specific actions
│       ├── edit/           ← buyer-only: edit order (seller read-only)
│       ├── receive/        ← buyer-only: process receipt with discrepancies
│       └── cancel/         ← buyer-only: request cancellation
│
├── despatch/
│   └── create/             ← seller-only: create despatch advice (from order)
│
├── invoices/
│   ├── page.tsx            ← both roles: list invoices
│   ├── create/             ← seller-only: generate invoice (from order, uses received quantities)
│   └── [id]/              ← both roles: invoice detail + XML export + mark as paid
│
├── api/
│   ├── auth/               ← Auth.js routes + register/login/logout/session
│   ├── profile/            ← Profile CRUD + password change
│   ├── products/           ← Product CRUD + stock adjustment
│   ├── checkout/           ← Multi-seller order creation from cart
│   ├── orders/             ← Proxies to Chalksniffer + order mapping management
│   │   ├── stats/          ← Order count/value stats per status
│   │   └── [id]/
│   │       └── request-change/ ← Seller requests change
│   ├── users/sellers/      ← List registered sellers
│   ├── links/              ← Order mapping CRUD (MongoDB)
│   ├── despatch/           ← Proxies to Despatch API
│   ├── invoices/           ← Proxies to LastMinutePush API
│   └── receipt/            ← Fetch receipt advice details
│
├── middleware.ts           ← role enforcement (Edge-safe)
└── components/             ← shared UI components
```

### Sidebar Navigation

| Buyer | Seller |
|-------|--------|
| Dashboard | Dashboard |
| Catalogue (browse) | Catalogue (manage) |
| Cart | Orders |
| Orders | Invoices |
| Invoices | |

Both roles: clicking the user avatar/name in the sidebar footer navigates to `/profile`.

### Role Enforcement

| Route | Buyer | Seller |
|-------|-------|--------|
| `/dashboard` | Yes | Yes |
| `/profile` | Yes | Yes |
| `/marketplace` | Yes | Redirect |
| `/cart` | Yes | Redirect |
| `/checkout` | Yes | Redirect |
| `/catalogue` | Redirect | Yes |
| `/orders` | Yes | Yes |
| `/orders/[id]` | Yes (own) | Yes (assigned) |
| `/orders/[id]/edit` | Yes (placed only) | Redirect |
| `/orders/[id]/receive` | Yes | Redirect |
| `/despatch/create` | Redirect | Yes |
| `/invoices` | Yes | Yes |
| `/invoices/create` | Redirect | Yes |

---

## 6. Workflow & UX

### Order Lifecycle

```
CONTRACTOR (BUYER)                        SUPPLIER (SELLER)

1. Browse Catalogue
   /marketplace
   └─ Search products across all sellers
   └─ Add items to cart

2. Checkout
   /checkout
   └─ Pre-filled buyer details
   └─ Set delivery address + date
   └─ Creates one order per seller

                                          3. Review Order
                                             /orders/[id]
                                             └─ "Action Required" status
                                             └─ Can Despatch or Request Change

                                          3a. Request Change (optional)
                                              └─ Leaves note for buyer
                                              └─ Order locked from despatch

4. Edit Order (if change requested)
   /orders/[id]/edit
   └─ Sees seller's note
   └─ Edits and saves → returns to seller

                                          5. Despatch
                                             /despatch/create
                                             └─ Delivery address read-only
                                             └─ Creates despatch advice

6. Process Receipt
   /orders/[id]/receive
   └─ Report received quantities
   └─ Note discrepancies (short qty, damage)

                                          7. Create Invoice
                                             /invoices/create
                                             └─ Pre-filled with RECEIVED quantities
                                             └─ Auto-marked as "sent"

8. View Invoice
   /invoices/[id]
   └─ Sees "Payment Required"
   └─ Can export XML

                                          8. Mark as Paid
                                             /orders/[id] or /invoices/[id]
                                             └─ Order status → "paid"
```

### Dashboard — Kanban Pipeline View

Orders grouped by status in horizontal rows with coloured stripe indicators:
- **Action Required** — orders needing the user's attention
- **Awaiting Review** — orders waiting on the other party
- **Despatched** — orders in transit
- **Received** — goods confirmed received
- **Awaiting Payment** — invoiced, not yet paid
- **Paid** — complete

Stat cards at top: Requires Attention, Outstanding Value, Overdue, Earned This Month (seller only).

### Orders Page — Search & Filter Table

Sidebar filters: search, status checkboxes, date range, amount range. Sortable table columns: counterparty, date, order ID, amount, items, status. Paginated.

---

## 7. Key Components

### Shared
- **OrderRow** — Compact order row with counterparty, ID, date, amount, status badge
- **OrderStats** — Stat cards (role-aware — seller gets "Earned This Month")
- **OrderStatusTimeline** — Horizontal progress: Placed → Despatched → Received → Invoiced → Paid
- **StatusBadge** — Centralized status colours from `status-colors.ts`
- **LoadingSpinner** — Consistent loading state with message
- **ErrorBanner** — Error display with ARIA, dismiss button
- **EmptyState** — Meaningful empty state with CTA
- **Sidebar** — Role-aware navigation (buyer: Catalogue/Cart/Orders/Invoices, seller: Catalogue/Orders/Invoices)

### Buyer-Specific
- **Marketplace Page** — Product browse with search + filter sidebar + product cards
- **Cart Page** — Items grouped by seller, editable quantities, totals
- **Checkout Page** — Buyer details + delivery + order summary per seller
- **Order Edit Form** — Same as order view but editable (seller fields read-only)
- **Receipt Form** — Process receipt with quantity discrepancies and notes

### Seller-Specific
- **Catalogue Management** — Product table with inline modal for add/edit/delete
- **Despatch Form** — Create despatch advice, delivery address read-only from order
- **Invoice Form** — Pre-filled with received quantities (not ordered), Customer ABN from order

---

## 8. Error Handling & Edge Cases

**API failures:** Gateway routes return standardized errors. Non-JSON responses handled gracefully (502 from LMP → "Invoice service returned an unexpected response").

**Session expiry:** Auth.js JWT expiry → middleware redirects to `/login`.

**Despatch lock:** Seller cannot despatch when `sellerStatus === "under_review"`. UI hides the despatch button and shows waiting message.

**Stock validation:** Checkout validates stock atomically. If insufficient at checkout time, entire checkout fails with per-product error details. Buyer cannot add more than available stock in the marketplace.

**Invoice idempotency:** "Mark as Paid" endpoint handles already-paid invoices gracefully (returns success on 409).

**Receipt discrepancies:** Invoice pre-fills with received quantities from receipt, not original order quantities. Seller invoices only for what was actually delivered.

**Empty states:** Every list page has a meaningful empty state with a CTA.

**Logout:** Uses `window.location.href` (not `router.push`) to force full page reload and clear server-side session cache.
