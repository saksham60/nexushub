import { test, expect } from '@playwright/test';

test('app loads and redirects to home', async ({ page }) => {
  // We mock backend responses in a real scenario, but for smoke we just see if the page renders.
  await page.goto('http://localhost:3000/');
  
  // By default, it redirects to /command-center
  await expect(page).toHaveURL(/.*\/command-center/);
  
  // Verify it doesn't crash and renders the degraded UI
  const mainContent = page.locator('main');
  await expect(mainContent).toBeVisible();
});
