/**
 * @fileoverview E2E tests for authentication flow.
 * Tests sign-in, sign-up, and authentication guard functionality.
 */
import { expect, test } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Sign-in Page', () => {
    test('should load sign-in page', async ({ page }) => {
      await page.goto('/signin');
      await expect(page.getByText('Enter your email and password to sign in')).toBeVisible();
    });

    test('should display sign-in form elements', async ({ page }) => {
      await page.goto('/signin');

      // Check for form elements
      await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeVisible();
      await expect(page.locator('button[type="submit"], button:has-text("Sign in")')).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/signin');

      // Try to submit empty form
      await page.locator('button[type="submit"], button:has-text("Sign in")').click();

      // Should show validation errors
      await expect(page.locator('.error, .invalid, [role="alert"]')).toBeVisible();
    });

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/signin');

      // Enter invalid email
      await page.locator('input[type="email"], input[placeholder*="email" i]').fill('invalid-email');
      await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password123');

      // Try to submit
      await page.locator('button[type="submit"], button:has-text("Sign in")').click();

      // Should show email validation error
      await expect(page.locator('.error, .invalid')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/signin');

      const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
      const toggleButton = page.locator('[data-testid="password-toggle"], .password-toggle, button:has(svg)').last();

      // Enter password
      await passwordInput.fill('testpassword');

      // Click toggle button if it exists
      if ((await toggleButton.count()) > 0) {
        await toggleButton.click();

        // Check if input type changed to text
        const inputType = await passwordInput.getAttribute('type');
        expect(inputType).toBe('text');
      }
    });

    test('should handle remember me checkbox', async ({ page }) => {
      await page.goto('/signin');

      const rememberCheckbox = page.locator('input[type="checkbox"], .checkbox');

      if ((await rememberCheckbox.count()) > 0) {
        // Check the remember me option
        await rememberCheckbox.check();
        await expect(rememberCheckbox).toBeChecked();

        // Uncheck it
        await rememberCheckbox.uncheck();
        await expect(rememberCheckbox).not.toBeChecked();
      }
    });
  });

  test.describe('Authentication Guards', () => {
    test('should redirect unauthenticated users to sign-in', async ({ page }) => {
      // Try to access protected route
      await page.goto('/summary');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/\/signin/);
    });

    test('should redirect authenticated users away from sign-in', async ({ page }) => {
      // Mock authentication state
      await page.addInitScript(() => {
        localStorage.setItem('auth_token', 'mock-token');
      });

      // Try to access sign-in page
      await page.goto('/signin');

      // Should redirect to dashboard or main app
      await expect(page).not.toHaveURL(/\/signin/);
    });
  });

  test.describe('Sign-up Flow', () => {
    test('should navigate to sign-up from sign-in', async ({ page }) => {
      await page.goto('/signin');

      // Look for sign-up link
      const signUpLink = page.locator('a:has-text("Sign up"), a:has-text("Create account"), [href*="signup"]');

      if ((await signUpLink.count()) > 0) {
        await signUpLink.click();
        await expect(page).toHaveURL(/\/signup/);
      }
    });

    test('should display sign-up form if available', async ({ page }) => {
      await page.goto('/signup');

      // Check if sign-up page exists and has form elements
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');

      if ((await emailInput.count()) > 0) {
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors during sign-in', async ({ page }) => {
      await page.goto('/signin');

      // Mock network failure
      await page.route('**/api/auth/**', (route) => route.abort());

      // Fill form and submit
      await page.locator('input[type="email"], input[placeholder*="email" i]').fill('test@example.com');
      await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password123');
      await page.locator('button[type="submit"], button:has-text("Sign in")').click();

      // Should show error message
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto('/signin');

      // Mock 401 response
      await page.route('**/api/auth/**', (route) =>
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' }),
        }),
      );

      // Fill form and submit
      await page.locator('input[type="email"], input[placeholder*="email" i]').fill('wrong@example.com');
      await page.locator('input[type="password"], input[placeholder*="password" i]').fill('wrongpassword');
      await page.locator('button[type="submit"], button:has-text("Sign in")').click();

      // Should show error message
      await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/signin');

      // Check for proper labeling
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');

      // Should have labels or aria-label
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/signin');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"], button:has-text("Sign in")')).toBeFocused();
    });
  });
});
