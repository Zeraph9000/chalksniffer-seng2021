import { test, expect } from "@playwright/test";

/**
 * End-to-end happy path: direct store link -> add variant to cart -> guest checkout ->
 * pay (Stripe placeholder) -> seller despatches -> buyer confirms receipt -> invoiced.
 *
 * Requires:
 *   - Local MongoDB reachable via MONGODB_URI
 *   - Seed data loaded: npm run seed
 *   - Dev server: started by playwright.config.ts webServer with MOCK_EXTERNAL=1
 *   - Seeded seller: andrew@acmebakery.com / password123
 *   - Seeded store slug: "acme-bakery"
 */
test("guest happy path end-to-end", async ({ page, browser }) => {
  test.setTimeout(90_000);

  // 1. Direct storefront link
  await page.goto("/store/acme-bakery");
  await expect(page.getByRole("heading", { name: /acme bakery/i }).first()).toBeVisible();

  // 2. Click "Chocolate Cake" product
  await page.getByText("Chocolate Cake", { exact: true }).first().click();

  // 3. Pick a variant (Small + Buttercream; both in-stock per seed)
  await page.getByRole("button", { name: "Small", exact: true }).click();
  await page.getByRole("button", { name: "Buttercream", exact: true }).click();

  // 4. Add to cart (navigates to /cart)
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page).toHaveURL(/\/cart$/);

  // 5. Proceed to checkout
  await page.getByRole("link", { name: /proceed to checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  // 6. Fill guest form
  await page.getByPlaceholder("email").fill("e2e-guest@example.com");
  await page.getByPlaceholder("name").fill("E2E Guest");
  await page.getByPlaceholder("phone").fill("0412345678");
  await page.getByPlaceholder("Street").fill("1 Test St");
  await page.getByPlaceholder("City").fill("Sydney");
  await page.getByPlaceholder("Postal").fill("2000");

  await page.getByRole("button", { name: /continue to payment/i }).click();
  await page.waitForURL(/\/checkout\/payment/, { timeout: 20_000 });

  await page.getByRole("button", { name: /pay \$/i }).click();
  await page.waitForURL(/\/checkout\/success/, { timeout: 20_000 });

  await expect(page.getByRole("heading", { name: /order placed/i })).toBeVisible();
  const trackingUrl = await page.locator("input[readonly]").first().inputValue();
  expect(trackingUrl).toMatch(/\/orders\/.+\?t=/);

  const orderIdMatch = trackingUrl.match(/\/orders\/([^?]+)\?t=/);
  const token = trackingUrl.match(/\?t=([A-Za-z0-9_-]+)$/)?.[1];
  expect(orderIdMatch).toBeTruthy();
  expect(token).toBeTruthy();
  const orderId = orderIdMatch![1];

  // 7. Seller despatches in a separate context (seller login page at /dashboard/login now)
  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  await sellerPage.goto("/dashboard/login");
  await sellerPage.locator("input[type='email']").first().fill("andrew@acmebakery.com");
  await sellerPage.locator("input[type='password']").first().fill("password123");
  await sellerPage.getByRole("button", { name: /log in|sign in/i }).first().click();
  await sellerPage.waitForURL(/\/(dashboard|$)/, { timeout: 20_000 });

  await sellerPage.goto(`/dashboard/orders/${orderId}`);
  await sellerPage.getByRole("button", { name: /^despatched$/i }).click();
  await expect(sellerPage.getByText(/awaiting buyer confirmation/i)).toBeVisible({ timeout: 20_000 });
  await sellerCtx.close();

  // 8. Buyer opens tracking URL and confirms receipt
  await page.goto(trackingUrl);
  await page.getByRole("button", { name: /i received my order/i }).click();
  await expect(page.getByText(/invoiced|generating invoice/i)).toBeVisible({ timeout: 20_000 });
});

test("seller cannot reach /dashboard without seller cookie", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard\/login/);
});

test("buyer cookie on storefront shows buyer nav; no dashboard link", async ({ page }) => {
  await page.goto("/login?next=/store/acme-bakery");
  await page.locator("input[type='email']").first().fill("alice@example.com");
  await page.locator("input[type='password']").first().fill("password123");
  await page.getByRole("button", { name: /log in|sign in/i }).first().click();
  await page.waitForURL(/\/store\/acme-bakery$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /my orders/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^dashboard$/i })).toHaveCount(0);
});

test("signed-in seller visiting storefront sees guest sign-in link", async ({ page }) => {
  await page.goto("/dashboard/login");
  await page.locator("input[type='email']").first().fill("andrew@acmebakery.com");
  await page.locator("input[type='password']").first().fill("password123");
  await page.getByRole("button", { name: /log in|sign in/i }).first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await page.goto("/store/acme-bakery");
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});
