import { test, expect } from '@playwright/test';

test('App loads and basic UI is visible', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.locator('h1')).toContainText('Talk to the person in the shop without a cloud call.');
  await expect(page.locator('button', { hasText: 'Connect' })).toBeVisible();
  await page.screenshot({ path: 'screenshot.png' });
});
