import { test, expect } from '@playwright/test';

test('public landing page loads', async ({ page }) => {
  await page.route("**/auth/microsoft/status?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        connected: false,
        provider: "microsoft",
        connect_url: "/auth/microsoft/start",
      }),
    });
  });
  await page.route("**/health", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "ok",
        service: "nexushub-backend",
        backend: { status: "ok", service: "nexushub-backend" },
        dependencies: {},
      }),
    });
  });

  await page.goto('http://localhost:3000/');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'NexusHub' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue with Microsoft 365/i })).toBeVisible();
});
