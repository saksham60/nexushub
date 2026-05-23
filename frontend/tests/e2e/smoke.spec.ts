import { test, expect } from '@playwright/test';

test('app loads and redirects to home', async ({ page }) => {
  // We mock backend responses in a real scenario, but for smoke we just see if the page renders.
  await page.goto('http://localhost:3000/');
  
  // By default, it redirects to /home
  await expect(page).toHaveURL(/.*\/home/);
  
  // It should show either the loading state or the sign-in required / backend unavailable state
  // Or the actual home page if session bootstrapped.
  // We just verify it doesn't crash.
});
