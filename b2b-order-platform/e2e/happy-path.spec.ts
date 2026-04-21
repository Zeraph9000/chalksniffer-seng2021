import { test, expect } from "@playwright/test";

/**
 * End-to-end happy path: browse -> add variant to cart -> guest checkout ->
 * pay (Stripe placeholder) -> seller despatches -> buyer confirms receipt ->
 * order becomes invoiced.
 *
 * Requires:
 *   - Local MongoDB reachable via MONGODB_URI
 *   - Seed data loaded: npm run seed
 *   - Dev server: will be started by playwright.config.ts webServer with MOCK_EXTERNAL=1
 *   - Seeded seller credentials: andrew@acmebakery.com / password123
 */
test("guest happy path end-to-end", async ({ page, browser }) => {
  test.setTimeout(90_000);

  // 1. Browse marketplace
  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: /stores on chalksniffer/i })).toBeVisible();

  // 2. Enter first store (seeded "Acme Bakery")
  const storeLink = page.locator("a[href^='/store/']").first();
  await storeLink.waitFor();
  await storeLink.click();

  // 3. Click "Chocolate Cake" product
  await page.getByText("Chocolate Cake", { exact: true }).first().click();

  // 4. Pick a variant (Small + Buttercream; both in-stock per seed)
  await page.getByRole("button", { name: "Small", exact: true }).click();
  await page.getByRole("button", { name: "Buttercream", exact: true }).click();

  // 5. Add to cart (navigates to /cart)
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page).toHaveURL(/\/cart$/);

  // 6. Proceed to checkout
  await page.getByRole("link", { name: /proceed to checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // 7. Fill guest form (default tab is "Continue as guest")
  await page.getByPlaceholder("email").fill("e2e-guest@example.com");
  await page.getByPlaceholder("name").fill("E2E Guest");
  await page.getByPlaceholder("phone").fill("0412345678");
  await page.getByPlaceholder("Street").fill("1 Test St");
  await page.getByPlaceholder("City").fill("Sydney");
  await page.getByPlaceholder("Postal").fill("2000");

  // 8. Submit checkout -> redirects to /checkout/payment
  await page.getByRole("button", { name: /continue to payment/i }).click();
  await page.waitForURL(/\/checkout\/payment/, { timeout: 20_000 });

  // 9. Pay (Stripe placeholder button)
  await page.getByRole("button", { name: /pay \$/i }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 20_000 });

  // 10. On success page, read the tracking URL input
  await expect(page.getByRole("heading", { name: /order placed/i })).toBeVisible();
  const trackingUrl = await page.locator("input[readonly]").first().inputValue();
  expect(trackingUrl).toMatch(/\/orders\/.+\?t=/);

  const orderIdMatch = trackingUrl.match(/\/orders\/([^?]+)\?t=/);
  const token = trackingUrl.match(/\?t=([A-Za-z0-9_-]+)$/)?.[1];
  expect(orderIdMatch).toBeTruthy();
  expect(token).toBeTruthy();
  const orderId = orderIdMatch![1];

  // 11. Open a separate context as the seller and despatch the order
  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  await sellerPage.goto("/login");
  // Try common field selectors for NextAuth credentials form
  await sellerPage.locator("input[type='email'], input[name='email']").first().fill("andrew@acmebakery.com");
  await sellerPage.locator("input[type='password'], input[name='password']").first().fill("password123");
  await sellerPage.getByRole("button", { name: /log in|sign in/i }).first().click();
  await sellerPage.waitForURL(/\/(dashboard|$)/, { timeout: 20_000 });

  await sellerPage.goto(`/dashboard/orders/${orderId}`);
  await sellerPage.getByRole("button", { name: /^despatched$/i }).click();
  await expect(sellerPage.getByText(/awaiting buyer confirmation/i)).toBeVisible({ timeout: 20_000 });
  await sellerCtx.close();

  // 12. Buyer opens tracking URL and confirms receipt
  await page.goto(trackingUrl);
  await page.getByRole("button", { name: /i received my order/i }).click();
  // After confirm, status flips to received -> invoiced (MOCK_EXTERNAL makes invoice API succeed instantly).
  await expect(page.getByText(/invoiced|generating invoice/i)).toBeVisible({ timeout: 20_000 });
});
