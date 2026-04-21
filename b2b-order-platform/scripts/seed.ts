/* eslint-disable no-console */
import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chalksniffer-b2b";

async function main() {
  const client = await MongoClient.connect(URI);
  const db = client.db();

  await db.collection("users").deleteMany({});
  await db.collection("stores").deleteMany({});
  await db.collection("products").deleteMany({});
  await db.collection("orderMappings").deleteMany({});

  const hash = await bcrypt.hash("password123", 10);

  const seller = {
    _id: new ObjectId(),
    name: "Andrew Baker",
    email: "andrew@acmebakery.com",
    password: hash,
    role: "seller" as const,
    companyName: "Acme Bakery Pty Ltd",
    abn: "12345678910",
    phone: "0412345678",
    address: { streetName: "48 Mount St", cityName: "Sydney", postalZone: "2036", country: "AU" },
    createdAt: new Date(),
  };
  const buyer = {
    _id: new ObjectId(),
    name: "Alice Buyer",
    email: "alice@example.com",
    password: hash,
    role: "buyer" as const,
    phone: "0498765432",
    address: { streetName: "1 Kensington Rd", cityName: "Sydney", postalZone: "2032", country: "AU" },
    createdAt: new Date(),
  };
  await db.collection("users").insertMany([seller, buyer]);

  const storeId = crypto.randomUUID();
  await db.collection("stores").insertOne({
    storeId,
    userId: seller._id.toString(),
    slug: "acme-bakery",
    storeName: "Acme Bakery",
    description: "Freshly baked goods daily",
    logoUrl: "https://placehold.co/200x200",
    bannerUrl: "https://placehold.co/1200x300",
    location: "Sydney",
    category: "bakery",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Simple product (no options, one default variant)
  const loafId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: loafId,
    storeId,
    name: "Sourdough Loaf",
    description: "24-hour fermented sourdough",
    category: "bread",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [],
    variants: [{ variantId: crypto.randomUUID(), optionValues: {}, price: 9.0, stock: 30 }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Multi-variant product (two options, six variants)
  const cakeId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: cakeId,
    storeId,
    name: "Chocolate Cake",
    description: "Moist, dense, layered chocolate cake",
    category: "cake",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Frosting", values: ["Buttercream", "Ganache"] },
    ],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Size: "Small", Frosting: "Buttercream" }, price: 25, stock: 5 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Small", Frosting: "Ganache" }, price: 28, stock: 5 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Medium", Frosting: "Buttercream" }, price: 35, stock: 3 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Medium", Frosting: "Ganache" }, price: 38, stock: 3 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Large", Frosting: "Buttercream" }, price: 55, stock: 2 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Large", Frosting: "Ganache" }, price: 58, stock: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Single-option product (one option, four variants)
  const bagelId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: bagelId,
    storeId,
    name: "Bagel",
    description: "Boiled then baked, chewy and dense",
    category: "bread",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [{ name: "Flavor", values: ["Plain", "Sesame", "Everything", "Poppy"] }],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Plain" }, price: 4.5, stock: 40 },
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Sesame" }, price: 5.0, stock: 30 },
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Everything" }, price: 5.5, stock: 25 },
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Poppy" }, price: 5.0, stock: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Two-option product with six variants, stock shape differs from cake
  const croissantId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: croissantId,
    storeId,
    name: "Croissant",
    description: "Laminated butter pastry, baked fresh every morning",
    category: "pastry",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [
      { name: "Filling", values: ["Plain", "Almond", "Chocolate"] },
      { name: "Size", values: ["Regular", "Jumbo"] },
    ],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Plain", Size: "Regular" }, price: 4.5, stock: 50 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Plain", Size: "Jumbo" }, price: 7.0, stock: 15 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Almond", Size: "Regular" }, price: 6.0, stock: 20 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Almond", Size: "Jumbo" }, price: 9.0, stock: 8 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Chocolate", Size: "Regular" }, price: 6.0, stock: 25 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Chocolate", Size: "Jumbo" }, price: 9.0, stock: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Pack-size product (one option, three variants)
  const brownieId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: brownieId,
    storeId,
    name: "Fudge Brownies",
    description: "Rich double-chocolate brownies with a crackly top",
    category: "pastry",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [{ name: "Pack", values: ["Individual", "6-pack", "12-pack"] }],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Pack: "Individual" }, price: 5.0, stock: 60 },
      { variantId: crypto.randomUUID(), optionValues: { Pack: "6-pack" }, price: 26.0, stock: 20 },
      { variantId: crypto.randomUUID(), optionValues: { Pack: "12-pack" }, price: 48.0, stock: 10 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Seed orders across all lifecycle states so the buyer orders page,
  // seller orders page, and state-machine UI each have realistic data.
  const sellerIdStr = seller._id.toString();
  const buyerIdStr = buyer._id.toString();
  const buyerSnapshot = {
    buyerEmail: buyer.email,
    buyerName: buyer.name,
    buyerPhone: buyer.phone,
    buyerAddress: buyer.address,
  };

  const now = Date.now();
  const ago = (days: number, hours = 0) => new Date(now - days * 86_400_000 - hours * 3_600_000);

  const orders = [
    {
      orderId: `ord-${crypto.randomUUID().slice(0, 8)}`,
      storeId,
      sellerId: sellerIdStr,
      buyerId: buyerIdStr,
      ...buyerSnapshot,
      note: "Please leave at reception.",
      status: "placed" as const,
      statusHistory: [
        { status: "placed" as const, at: ago(0, 2), byUserId: buyerIdStr, note: "Order placed" },
      ],
      stripePaymentIntentId: `pi_seed_${crypto.randomUUID().slice(0, 8)}`,
      payableAmount: 13.5,
      documentCurrencyCode: "AUD",
      issueDate: ago(0, 2).toISOString().slice(0, 10),
      createdAt: ago(0, 2),
      updatedAt: ago(0, 2),
    },
    {
      orderId: `ord-${crypto.randomUUID().slice(0, 8)}`,
      storeId,
      sellerId: sellerIdStr,
      buyerId: buyerIdStr,
      ...buyerSnapshot,
      status: "paid" as const,
      statusHistory: [
        { status: "placed" as const, at: ago(1, 3), byUserId: buyerIdStr },
        { status: "paid" as const, at: ago(1, 2), byUserId: buyerIdStr, note: "Payment confirmed" },
      ],
      stripePaymentIntentId: `pi_seed_${crypto.randomUUID().slice(0, 8)}`,
      payableAmount: 35,
      documentCurrencyCode: "AUD",
      issueDate: ago(1).toISOString().slice(0, 10),
      createdAt: ago(1, 3),
      updatedAt: ago(1, 2),
    },
    {
      orderId: `ord-${crypto.randomUUID().slice(0, 8)}`,
      storeId,
      sellerId: sellerIdStr,
      buyerId: buyerIdStr,
      ...buyerSnapshot,
      status: "despatched" as const,
      statusHistory: [
        { status: "placed" as const, at: ago(2, 4), byUserId: buyerIdStr },
        { status: "paid" as const, at: ago(2, 3), byUserId: buyerIdStr },
        { status: "despatched" as const, at: ago(0, 5), byUserId: sellerIdStr, note: "Out for delivery" },
      ],
      stripePaymentIntentId: `pi_seed_${crypto.randomUUID().slice(0, 8)}`,
      despatchDocumentId: `dd_seed_${crypto.randomUUID().slice(0, 8)}`,
      payableAmount: 52,
      documentCurrencyCode: "AUD",
      issueDate: ago(2).toISOString().slice(0, 10),
      createdAt: ago(2, 4),
      updatedAt: ago(0, 5),
    },
    {
      orderId: `ord-${crypto.randomUUID().slice(0, 8)}`,
      storeId,
      sellerId: sellerIdStr,
      buyerId: buyerIdStr,
      ...buyerSnapshot,
      status: "invoiced" as const,
      statusHistory: [
        { status: "placed" as const, at: ago(5) },
        { status: "paid" as const, at: ago(5) },
        { status: "despatched" as const, at: ago(4), byUserId: sellerIdStr },
        { status: "received" as const, at: ago(3), byUserId: buyerIdStr },
        { status: "invoiced" as const, at: ago(3), note: "Invoice generated (draft)" },
      ],
      stripePaymentIntentId: `pi_seed_${crypto.randomUUID().slice(0, 8)}`,
      despatchDocumentId: `dd_seed_${crypto.randomUUID().slice(0, 8)}`,
      receiptAdviceId: `internal-${crypto.randomUUID().slice(0, 16)}`,
      invoiceId: `inv_seed_${crypto.randomUUID().slice(0, 8)}`,
      payableAmount: 84.5,
      documentCurrencyCode: "AUD",
      issueDate: ago(5).toISOString().slice(0, 10),
      createdAt: ago(5),
      updatedAt: ago(3),
    },
    {
      orderId: `ord-${crypto.randomUUID().slice(0, 8)}`,
      storeId,
      sellerId: sellerIdStr,
      buyerId: buyerIdStr,
      ...buyerSnapshot,
      status: "cancelled" as const,
      statusHistory: [
        { status: "placed" as const, at: ago(6, 2), byUserId: buyerIdStr },
        { status: "paid" as const, at: ago(6, 1), byUserId: buyerIdStr },
        { status: "cancelled" as const, at: ago(6), byUserId: sellerIdStr, note: "Out of stock; refunded" },
      ],
      stripePaymentIntentId: `pi_seed_${crypto.randomUUID().slice(0, 8)}`,
      payableAmount: 28,
      documentCurrencyCode: "AUD",
      issueDate: ago(6).toISOString().slice(0, 10),
      createdAt: ago(6, 2),
      updatedAt: ago(6),
    },
    {
      // Guest order — no buyerId, has a guest access token so the /orders/[id]?t= page works.
      orderId: `ord-${crypto.randomUUID().slice(0, 8)}`,
      storeId,
      sellerId: sellerIdStr,
      buyerId: null,
      buyerEmail: "guest@example.com",
      buyerName: "Guest Visitor",
      buyerPhone: "0400000000",
      buyerAddress: { streetName: "10 Guest Ave", cityName: "Melbourne", postalZone: "3000", country: "AU" },
      status: "despatched" as const,
      statusHistory: [
        { status: "placed" as const, at: ago(1, 6) },
        { status: "paid" as const, at: ago(1, 5) },
        { status: "despatched" as const, at: ago(0, 8), byUserId: sellerIdStr },
      ],
      stripePaymentIntentId: `pi_seed_${crypto.randomUUID().slice(0, 8)}`,
      despatchDocumentId: `dd_seed_${crypto.randomUUID().slice(0, 8)}`,
      guestAccessToken: crypto.randomBytes(32).toString("base64url"),
      payableAmount: 19.5,
      documentCurrencyCode: "AUD",
      issueDate: ago(1).toISOString().slice(0, 10),
      createdAt: ago(1, 6),
      updatedAt: ago(0, 8),
    },
  ];

  await db.collection("orderMappings").insertMany(orders);

  console.log("Seeded:");
  console.log(`  seller:   ${seller.email} / password123`);
  console.log(`  buyer:    ${buyer.email}  / password123`);
  console.log(`  store:    /store/acme-bakery`);
  console.log(`  products: ${6} (Sourdough Loaf, Chocolate Cake, Bagel, Croissant, Fudge Brownies)`);
  console.log(`  orders:   ${orders.length} across placed/paid/despatched/invoiced/cancelled + 1 guest`);
  const guestOrder = orders.find((o) => !o.buyerId);
  if (guestOrder) {
    console.log(`  guest:    /orders/${guestOrder.orderId}?t=${guestOrder.guestAccessToken}`);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
