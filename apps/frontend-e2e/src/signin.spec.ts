import { test, expect } from '@playwright/test';

test('sign-in page loads', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByText('Enter your email and password to sign in')).toBeVisible();
});
