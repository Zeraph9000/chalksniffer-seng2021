import { test, expect } from "@playwright/test";
import path from "node:path";

test("seller uploads store logo and preview persists across reload", async ({ page }) => {
  test.skip(!process.env.CLOUDINARY_CLOUD_NAME, "Cloudinary env vars not configured");
  test.setTimeout(60_000);

  // Seller sign-in at /dashboard/login
  await page.goto("/dashboard/login");
  await page.locator("input[type='email']").first().fill("andrew@acmebakery.com");
  await page.locator("input[type='password']").first().fill("password123");
  await page.getByRole("button", { name: /log in|sign in/i }).first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

  // Navigate to store form
  await page.goto("/dashboard/store");

  // The first <input type="file"> on the page is the logo ImageUpload.
  const fileInputs = page.locator("input[type='file']");
  await expect(fileInputs.first()).toBeAttached();
  await fileInputs.first().setInputFiles(path.join(__dirname, "fixtures", "test-logo.png"));

  // Wait for the preview to flip to a real image src (cloudinary URL contains /upload/).
  const preview = page.locator("img").first();
  await expect(preview).toHaveAttribute("src", /cloudinary|\/upload\//, { timeout: 15_000 });

  // Submit save
  await page.getByRole("button", { name: /save/i }).first().click();
  await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10_000 });

  // Reload and confirm preview still present
  await page.reload();
  const reloadPreview = page.locator("img").first();
  await expect(reloadPreview).toHaveAttribute("src", /cloudinary/, { timeout: 10_000 });
});
