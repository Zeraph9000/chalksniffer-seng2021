# Diagram Prompts for Gemini

Copy each prompt below into Gemini and ask it to generate a diagram image.

---

## UC1: User Registration & Authentication

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): User (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Orange background for Exceptional flows

Include all of the following interactions:

OPTIMAL FLOW — Registration (green region):
1. User -> Frontend: Navigate to /login, switch to Register
2. Frontend -> User: Render registration form (name, email, password, phone, company name, ABN, address, role)
3. User -> Frontend: Fill business details, select role (Contractor or Supplier), submit
4. Frontend -> Gateway: POST /api/auth/register (name, email, password, role, companyName, abn, phone, address)
5. Gateway -> Gateway: Validate required fields and role
6. Gateway -> MongoDB: Check email uniqueness — findOne({ email })
7. ALT fragment "Email already exists":
   - Gateway --> Frontend: 409 Conflict ("An account with this email already exists")
   - Frontend -> User: Display error message
8. Gateway -> Gateway: Hash password with bcrypt (salt rounds: 10)
9. Gateway -> MongoDB: insertOne({ name, email, hashedPassword, role, companyName, abn, phone, address, createdAt })
10. Gateway -> Gateway: Auth.js signIn("credentials") — create JWT session with role in token
11. Gateway --> Frontend: 200 OK { success: true, role }
12. Frontend -> User: Full page redirect to /dashboard

OPTIMAL FLOW — Login (green region):
1. User -> Frontend: Navigate to /login (login mode is default)
2. Frontend -> User: Render login form (email, password)
3. User -> Frontend: Enter credentials, submit
4. Frontend -> Gateway: POST /api/auth/login { email, password }
5. Gateway -> MongoDB: findOne({ email })
6. Gateway -> Gateway: bcrypt.compare(password, storedHash)
7. ALT fragment "Valid credentials":
   - Gateway -> Gateway: Auth.js signIn("credentials") — create JWT session
   - Gateway --> Frontend: 200 OK { success: true, role }
   - Frontend -> User: Full page redirect to /dashboard
8. ALT fragment "Invalid credentials":
   - Gateway --> Frontend: 401 Unauthorized
   - Frontend -> User: Display "Invalid credentials" error

EXCEPTIONAL FLOW — Role-Based Access Denied (orange region):
1. User -> Frontend: Navigate to role-restricted route (e.g., seller tries /marketplace)
2. Frontend -> Gateway: Request page (valid JWT, wrong role)
3. Gateway -> Gateway: Middleware checks role against route protection rules
4. Gateway --> Frontend: Redirect to /dashboard?error=unauthorized
5. Frontend -> User: Show dashboard with toast notification

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC2: Seller Manages Product Catalogue

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Supplier (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Blue background for Optional flows

Include all of the following interactions:

OPTIMAL FLOW — View Catalogue (green region):
1. Supplier -> Frontend: Navigate to /catalogue
2. Frontend -> Gateway: GET /api/products (session cookie)
3. Gateway -> Gateway: Verify role === "seller"
4. Gateway -> MongoDB: Find products where sellerEmail === session.email
5. Gateway --> Frontend: Array of seller's products
6. Frontend -> Supplier: Render product table (name, category, price, unit, stock, actions)

OPTIMAL FLOW — Add Product (green region):
1. Supplier -> Frontend: Click "Add Product"
2. Frontend -> Supplier: Open modal form (name, description, category dropdown, unit code, price, stock)
3. Supplier -> Frontend: Fill fields, select category (auto-sets unit code), submit
4. Frontend -> Gateway: POST /api/products { name, description, category, unitCode, unitPrice, currency, stock }
5. Gateway -> Gateway: Verify role === "seller", validate required fields
6. Gateway -> MongoDB: insertOne({ sellerEmail, name, description, category, unitCode, unitPrice, currency, stock, createdAt })
7. Gateway --> Frontend: Created product with _id
8. Frontend -> Supplier: Close modal, add product to table

OPTIONAL FLOW — Edit Product (blue region):
1. Supplier -> Frontend: Click "Edit" on a product row
2. Frontend -> Supplier: Open modal pre-filled with existing product data
3. Supplier -> Frontend: Modify fields, submit
4. Frontend -> Gateway: PUT /api/products/[id] { name, description, category, unitCode, unitPrice, currency, stock }
5. Gateway -> MongoDB: Verify ownership (sellerEmail === session.email)
6. Gateway -> MongoDB: updateOne({ _id }, { $set: updated fields })
7. Gateway --> Frontend: Success
8. Frontend -> Supplier: Close modal, update table row

OPTIONAL FLOW — Delete Product (blue region):
1. Supplier -> Frontend: Click "Delete" on a product row
2. Frontend -> Supplier: Confirm dialog
3. Supplier -> Frontend: Confirm deletion
4. Frontend -> Gateway: DELETE /api/products/[id]
5. Gateway -> MongoDB: Verify ownership
6. Gateway -> MongoDB: deleteOne({ _id })
7. Gateway --> Frontend: Success
8. Frontend -> Supplier: Remove row from table

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC3: Buyer Browses Catalogue, Adds to Cart & Checks Out

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Contractor (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box), "Chalksniffer API" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Orange background for Exceptional flows

Include all of the following interactions:

OPTIMAL FLOW — Browse & Add to Cart (green region):
1. Contractor -> Frontend: Navigate to /marketplace (labelled "Catalogue")
2. Frontend -> Gateway: GET /api/products (no seller filter — returns all products)
3. Gateway -> MongoDB: Find all products, enrich with seller company names from users collection
4. Gateway --> Frontend: Array of products with sellerCompanyName
5. Frontend -> Contractor: Render product grid with search bar and filter sidebar
6. Contractor -> Frontend: Search "concrete", filter by category
7. Frontend -> Frontend: Client-side filter products by search text and category
8. Contractor -> Frontend: Set quantity for a product, click "Add to Cart"
9. Frontend -> Frontend: Cart context addItem() — saves to localStorage
10. Contractor -> Frontend: Add more items from different sellers

OPTIMAL FLOW — Checkout (green region):
1. Contractor -> Frontend: Navigate to /checkout
2. Frontend -> Gateway: GET /api/auth/session
3. Gateway -> MongoDB: Fetch user profile (companyName, abn, address)
4. Gateway --> Frontend: Full buyer profile
5. Frontend -> Contractor: Render checkout form — buyer details pre-filled, delivery address pre-filled, cart summary grouped by seller
6. Contractor -> Frontend: Confirm details, set delivery date, submit
7. Frontend -> Gateway: POST /api/checkout { buyerDetails, deliveryAddress, deliveryDate, note, items: [{productId, quantity}] }
8. Gateway -> MongoDB: Fetch all products by IDs
9. Gateway -> Gateway: Validate stock for all items
10. Gateway -> Gateway: Group items by sellerEmail
11. Gateway -> MongoDB: Fetch seller profiles for each seller group
12. LOOP "For each seller group":
    - Gateway -> Chalksniffer API: POST /orders (buyer party + seller party + delivery + line items)
    - Chalksniffer API --> Gateway: 200 OK (order with ID)
    - Gateway -> MongoDB: Create orderMapping { orderId, buyerEmail, sellerEmail, buyerStatus: "under_review", sellerStatus: "needs_review" }
    - Gateway -> MongoDB: Decrement stock for each product ($inc: { stock: -quantity })
13. Gateway --> Frontend: { orders: [orderId1, orderId2, ...] }
14. Frontend -> Frontend: clearCart() — empties localStorage
15. Frontend -> Contractor: Redirect to /dashboard

EXCEPTIONAL FLOW — Insufficient Stock at Checkout (orange region):
1. Contractor -> Frontend: Submit checkout
2. Frontend -> Gateway: POST /api/checkout
3. Gateway -> MongoDB: Fetch products, validate stock
4. Gateway -> Gateway: Product X has stock 40 but quantity requested is 50
5. Gateway --> Frontend: 400 { error: "Insufficient stock", details: ["Product X: requested 50, only 40 available"] }
6. Frontend -> Contractor: Display error banner with stock details

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC4: Pre-Despatch Negotiation

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Supplier (stick figure actor), Contractor (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box), "Chalksniffer API" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Blue background for Optional flows
- Orange background for Exceptional flows

Include all of the following interactions:

OPTIMAL FLOW — Supplier Reviews Order (green region):
1. Supplier -> Frontend: Navigate to /dashboard — sees order in "Action Required" section
2. Supplier -> Frontend: Click order → /orders/[id]
3. Frontend -> Gateway: GET /api/orders/[id] + GET /api/links?orderId=[id] + GET /api/auth/session
4. Gateway -> Gateway: assertOrderAccess(email, "seller", orderId)
5. Gateway --> Frontend: Order details + mapping (sellerStatus: "needs_review")
6. Frontend -> Supplier: Show read-only order detail — "Despatch Order" and "Request Change" buttons

OPTIONAL FLOW — Supplier Requests Change (blue region):
1. Supplier -> Frontend: Enter note in "Request Change" form (e.g., "Only 40 hard hats in stock")
2. Supplier -> Frontend: Submit
3. Frontend -> Gateway: POST /api/orders/[id]/request-change { note }
4. Gateway -> Gateway: Verify role === "seller" and status === "placed"
5. Gateway -> MongoDB: Update orderMapping — buyerStatus: "needs_review", sellerStatus: "under_review", sellerNote stored
6. Gateway --> Frontend: Updated mapping
7. Frontend -> Supplier: Status changes to "Awaiting Review" (waiting for contractor)

OPTIONAL FLOW — Contractor Edits Order (blue region):
1. Contractor -> Frontend: Navigate to /orders/[id] — sees amber banner with seller's note
2. Contractor -> Frontend: Click "Edit Order" → /orders/[id]/edit
3. Frontend -> Gateway: GET /api/orders/[id]
4. Gateway --> Frontend: Current order data
5. Frontend -> Contractor: Render edit form (same as order view, seller fields read-only)
6. Contractor -> Frontend: Modify delivery address, adjust line items, submit
7. Frontend -> Gateway: PUT /api/orders/[id] (updated order body)
8. Gateway -> Gateway: Verify role === "buyer" and status === "placed"
9. Gateway -> Chalksniffer API: PUT /orders/[id]
10. Gateway -> MongoDB: Update orderMapping — buyerStatus: "under_review", sellerStatus: "needs_review", sellerNote cleared
11. Gateway --> Frontend: Updated order
12. Frontend -> Contractor: Redirect to order detail — shows "Awaiting Review"

Note: Steps in blue region can repeat multiple times.

EXCEPTIONAL FLOW — Despatch Blocked (orange region):
1. Supplier -> Frontend: Try to despatch while sellerStatus === "under_review"
2. Frontend -> Gateway: POST /api/despatch
3. Gateway -> MongoDB: Check sellerStatus === "under_review"
4. Gateway --> Frontend: 400 — "Cannot despatch — waiting for contractor to update"
5. Frontend -> Supplier: Error displayed

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC5: Supplier Despatches Order & Contractor Processes Receipt

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Supplier (stick figure actor), Contractor (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box), "Despatch API" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Blue background for Optional flows

Include all of the following interactions:

OPTIMAL FLOW — Supplier Despatches Order (green region):
1. Supplier -> Frontend: View order at /orders/[id] — sellerStatus is "needs_review"
2. Supplier -> Frontend: Click "Despatch Order" → /despatch/create?orderId=[id]
3. Frontend -> Gateway: GET /api/orders/[id]
4. Gateway --> Frontend: Order details with delivery address
5. Frontend -> Supplier: Render despatch form — delivery address READ-ONLY from order, line items with delivered quantities
6. Supplier -> Frontend: Confirm quantities, submit
7. Frontend -> Gateway: POST /api/despatch (despatch advice payload with orderReference)
8. Gateway -> MongoDB: Check sellerStatus !== "under_review" (not locked)
9. Gateway -> Gateway: Create fresh Despatch API session (POST /sessions with shared credentials)
10. Gateway -> Despatch API: POST /despatch-advices (sessionId header, despatch body)
11. Despatch API --> Gateway: 201 Created (despatchAdviceId)
12. Gateway -> MongoDB: Update orderMapping — status: "despatched", despatchDocumentId stored
13. Gateway --> Frontend: 201 Created
14. Frontend -> Supplier: Redirect to dashboard

OPTIMAL FLOW — Contractor Processes Receipt (green region):
1. Contractor -> Frontend: Navigate to /orders/[id] — sees "Despatched" + "Process Receipt" button
2. Contractor -> Frontend: Click "Process Receipt" → /orders/[id]/receive
3. Frontend -> Gateway: GET /api/orders/[id] + GET /api/links?orderId=[id]
4. Gateway --> Frontend: Order details + mapping with despatchDocumentId + delivery address
5. Frontend -> Contractor: Render receipt form — delivery address shown, line items with expected qty, editable received qty, note per line
6. Contractor -> Frontend: Adjust received quantities, add notes for discrepancies, submit
7. Frontend -> Gateway: POST /api/despatch/[despatchAdviceId]/receipt (receipt advice body with receiptLines)
8. Gateway -> Gateway: Create fresh Despatch API session
9. Gateway -> Despatch API: POST /despatch-advices/{id}/receipt-advices (sessionId header)
10. Despatch API --> Gateway: 200 OK (receiptAdviceId)
11. Gateway -> MongoDB: Update orderMapping — status: "received", receiptAdviceId stored
12. Gateway --> Frontend: 200 OK
13. Frontend -> Contractor: Redirect to order detail — shows "Received" + receipt details

OPTIONAL FLOW — Report Discrepancies (blue region):
1. Contractor -> Frontend: In receipt form, enter lower receivedQuantity than expectedQuantity
2. Contractor -> Frontend: Add discrepancy note (e.g., "5 bags damaged in transit")
3. Frontend -> Frontend: Automatically calculates shortQuantity = expected - received
4. Frontend -> Gateway: POST receipt with shortQuantity and note per line
5. Gateway -> Despatch API: Creates receipt advice with shortage data
6. Gateway --> Frontend: Success
7. Frontend -> Contractor: Order detail shows receipt details with shortage info visible to both roles

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC6: Supplier Creates Invoice (Adjusted for Discrepancies)

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Supplier (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box), "Despatch API" (box), "LastMinutePush API" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Orange background for Exceptional flows

Include all of the following interactions:

OPTIMAL FLOW — Create Invoice (green region):
1. Supplier -> Frontend: Navigate to /orders/[id] — status is "Received"
2. Supplier -> Frontend: Click "Create Invoice" → /invoices/create?orderId=[id]
3. Frontend -> Gateway: GET /api/orders/[id]
4. Gateway --> Frontend: Order details (with partyIdentification ABNs)
5. Frontend -> Gateway: GET /api/links?orderId=[id]
6. Gateway --> Frontend: Mapping with receiptAdviceId
7. Frontend -> Gateway: GET /api/receipt/[receiptAdviceId]
8. Gateway -> Gateway: Create fresh Despatch API session
9. Gateway -> Despatch API: GET /receipt-advices/[receiptAdviceId] (sessionId header)
10. Despatch API --> Gateway: Receipt advice with receivedQuantity per line
11. Gateway --> Frontend: Receipt data
12. Frontend -> Frontend: Pre-fill invoice with RECEIVED quantities (not ordered quantities)
13. Frontend -> Supplier: Render invoice form — line items show received qty, customer ABN, supplier ABN, due date
14. Supplier -> Frontend: Review, set due date, submit
15. Frontend -> Gateway: POST /api/invoices (invoice payload)
16. Gateway -> LastMinutePush API: POST /v1/invoices (X-API-Key, JSON body)
17. ALT fragment "Invoice created":
    - LastMinutePush API --> Gateway: 201 Created (invoice_id, status: draft)
    - Gateway -> LastMinutePush API: POST /v1/invoices/{id}/status { status: "sent" } — auto-mark as sent
    - Gateway -> MongoDB: Update orderMapping — status: "invoiced", invoiceId stored
    - Gateway --> Frontend: 201 Created
    - Frontend -> Supplier: Redirect to invoices list — order shows "Invoiced - Awaiting Payment"

EXCEPTIONAL FLOW — Invoice Service Unavailable (orange region):
1. Supplier -> Frontend: Submit invoice
2. Frontend -> Gateway: POST /api/invoices
3. Gateway -> LastMinutePush API: POST /v1/invoices
4. LastMinutePush API --> Gateway: 502 Bad Gateway (HTML error page)
5. Gateway -> Gateway: Detect non-JSON response
6. Gateway --> Frontend: 502 { error: "Invoice service returned an unexpected response" }
7. Frontend -> Supplier: Display error banner

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC7: Supplier Marks Invoice as Paid

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Supplier (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box), "LastMinutePush API" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows

Include all of the following interactions:

OPTIMAL FLOW — Mark as Paid from Order Detail (green region):
1. Supplier -> Frontend: Navigate to /orders/[id] — status "Invoiced - Awaiting Payment"
2. Supplier -> Frontend: Click "Mark as Paid"
3. Frontend -> Gateway: POST /api/invoices/[invoiceId]/status { status: "paid", payment_date: "YYYY-MM-DD" }
4. Gateway -> LastMinutePush API: POST /v1/invoices/{id}/status { status: "sent" } — ensure sent first (ignore 409 if already sent)
5. Gateway -> LastMinutePush API: POST /v1/invoices/{id}/status { status: "paid", payment_date }
6. ALT fragment "Transition succeeds":
   - LastMinutePush API --> Gateway: 200 OK (status: paid)
   - Gateway -> MongoDB: Find orderMapping by invoiceId
   - Gateway -> MongoDB: Update orderMapping — status: "paid"
   - Gateway --> Frontend: 200 OK
   - Frontend -> Frontend: Reload page
   - Frontend -> Supplier: Order status updates to "Invoiced - Paid"
7. ALT fragment "Already paid (idempotent)":
   - LastMinutePush API --> Gateway: 409 Conflict
   - Gateway -> MongoDB: Update orderMapping — status: "paid" (idempotent)
   - Gateway --> Frontend: 200 OK { message: "Invoice marked as paid" }

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC8: Contractor Views Invoice & Exports XML

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): Contractor (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "LastMinutePush API" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows

Include all of the following interactions:

OPTIMAL FLOW — View Invoice (green region):
1. Contractor -> Frontend: Navigate to /orders/[id] — sees "View Invoice" link
2. Contractor -> Frontend: Click "View Invoice" → /invoices/[invoiceId]
3. Frontend -> Gateway: GET /api/invoices/[invoiceId] + GET /api/auth/session
4. Gateway -> LastMinutePush API: GET /v1/invoices/{invoice_id} (X-API-Key)
5. LastMinutePush API --> Gateway: 200 OK (invoice detail — status, amounts, line items, supplier/customer info)
6. Gateway --> Frontend: Invoice data + session (role: buyer)
7. Frontend -> Contractor: Display invoice detail — status shows "Payment Required" (if sent) or "Paid", line items, amounts, supplier/customer ABNs

OPTIMAL FLOW — Export UBL XML (green region):
1. Contractor -> Frontend: Click "Export XML" button
2. Frontend -> Gateway: GET /api/invoices/[invoiceId] (Accept: application/xml)
3. Gateway -> LastMinutePush API: GET /v1/invoices/{invoice_id} (Accept: application/xml, X-API-Key)
4. LastMinutePush API --> Gateway: 200 OK (UBL 2.1 Invoice XML document)
5. Gateway --> Frontend: XML content
6. Frontend -> Frontend: Create Blob, trigger download
7. Frontend -> Contractor: Browser downloads invoice-[id].xml file

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```

---

## UC9: User Edits Profile & Changes Password

```
Generate a detailed UML sequence diagram image with these exact participants (left to right): User (stick figure actor), "Next.js Frontend" (box), "Next.js API Gateway" (box), "MongoDB" (box).

Use colour-coded regions to distinguish flow types:
- Green background for Optimal flows
- Orange background for Exceptional flows

Include all of the following interactions:

OPTIMAL FLOW — View & Update Profile (green region):
1. User -> Frontend: Click avatar/name in sidebar → navigate to /profile
2. Frontend -> Gateway: GET /api/profile (session cookie)
3. Gateway -> Gateway: getSessionOrNull() — extract email from JWT
4. Gateway -> MongoDB: findOne({ email }) — fetch user document
5. Gateway --> Frontend: 200 OK (user profile without password)
6. Frontend -> User: Render tabbed profile page (Personal tab active) — pre-fill all fields
7. User -> Frontend: Edit fields (name, email, phone, company, ABN, address), click "Save Changes"
8. Frontend -> Gateway: PUT /api/profile { name, email, phone, companyName, abn, address }
9. Gateway -> Gateway: getSessionOrNull() — verify authenticated
10. Gateway -> MongoDB: updateOne({ email }, { $set: updated fields })
11. Gateway -> MongoDB: findOne({ email }) — fetch updated user
12. Gateway --> Frontend: 200 OK (updated profile without password)
13. Frontend -> User: Toast notification "Changes saved"

OPTIMAL FLOW — Change Password (green region):
1. User -> Frontend: Switch to Security tab
2. Frontend -> User: Render password form (current password, new password, confirm new password)
3. User -> Frontend: Fill all three fields, click "Update Password"
4. Frontend -> Gateway: PUT /api/profile/password { currentPassword, newPassword, confirmNewPassword }
5. Gateway -> Gateway: getSessionOrNull() — verify authenticated
6. Gateway -> MongoDB: findOne({ email }) — fetch user with hashed password
7. Gateway -> Gateway: bcrypt.compare(currentPassword, storedHash) — verify current password
8. Gateway -> Gateway: bcrypt.hash(newPassword, 10) — hash new password
9. Gateway -> MongoDB: updateOne({ email }, { $set: { password: newHash } })
10. Gateway --> Frontend: 200 OK { message: "Password updated successfully" }
11. Frontend -> User: Toast notification "Password updated successfully", clear form

EXCEPTIONAL FLOW — Email Already Taken (orange region):
1. User -> Frontend: Change email to existing-user@example.com, click "Save Changes"
2. Frontend -> Gateway: PUT /api/profile { email: "existing-user@example.com" }
3. Gateway -> MongoDB: findOne({ email: "existing-user@example.com" })
4. Gateway -> Gateway: Email belongs to another user
5. Gateway --> Frontend: 409 Conflict { error: "An account with this email already exists" }
6. Frontend -> User: Toast notification with error message

EXCEPTIONAL FLOW — Wrong Current Password (orange region):
1. User -> Frontend: Enter incorrect current password, click "Update Password"
2. Frontend -> Gateway: PUT /api/profile/password { currentPassword: "wrong", newPassword, confirmNewPassword }
3. Gateway -> MongoDB: findOne({ email }) — fetch user
4. Gateway -> Gateway: bcrypt.compare("wrong", storedHash) — returns false
5. Gateway --> Frontend: 400 Bad Request { error: "Current password is incorrect" }
6. Frontend -> User: Toast notification with error message

Use solid arrows for synchronous calls and dashed arrows for responses. Label every arrow. Make the text legible and the diagram professional-looking, suitable for a university software engineering report.
```
