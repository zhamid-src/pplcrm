# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: signin.spec.ts >> Authentication >> Sign-in Page >> should show validation error for invalid email
- Location: apps/frontend-e2e/src/signin.spec.ts:33:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"], button:has-text("Sign in")')
    - locator resolved to <button type="submit" class="btn btn-primary w-full">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <vite-error-overlay></vite-error-overlay> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <vite-error-overlay></vite-error-overlay> intercepts pointer events
    - retrying click action
      - waiting 100ms
    57 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <vite-error-overlay></vite-error-overlay> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e7]:
    - img [ref=e9]
    - generic [ref=e10]:
      - generic [ref=e11]: Enter your email and password to sign in
      - generic [ref=e13]:
        - generic [ref=e14]:
          - img [ref=e18]
          - textbox "Email" [ref=e20]:
            - /placeholder: Enter your email
            - text: invalid-email
        - generic [ref=e21]:
          - img [ref=e25]
          - textbox "Password" [active] [ref=e27]:
            - /placeholder: Enter your password
            - text: password123
        - generic [ref=e28]:
          - generic [ref=e29]:
            - checkbox "Remember me" [ref=e30] [cursor=pointer]
            - generic [ref=e31]: Remember me
          - link "Forgot your password?" [ref=e33] [cursor=pointer]:
            - /url: /resetpassword
        - button "SIGN IN" [ref=e35] [cursor=pointer]
      - link "SIGN UP" [ref=e37] [cursor=pointer]:
        - /url: /signup
      - generic [ref=e39]:
        - text: Copyright © 2024
        - link "CampaignRaven" [ref=e40] [cursor=pointer]:
          - /url: ""
  - generic [ref=e43]:
    - generic [ref=e44]: "TS2307: Cannot find module './auth/verify-email-page/verify-email-page' or its corresponding type declarations."
    - generic [ref=e45]: apps/frontend/src/app/app.routes.ts:36:13
    - generic [ref=e46]: Click outside, press Esc key, or fix the code to dismiss.
```

# Test source

```ts
  1   | /**
  2   |  * @fileoverview E2E tests for authentication flow.
  3   |  * Tests sign-in, sign-up, and authentication guard functionality.
  4   |  */
  5   | import { expect, test } from '@playwright/test';
  6   | 
  7   | test.describe('Authentication', () => {
  8   |   test.describe('Sign-in Page', () => {
  9   |     test('should load sign-in page', async ({ page }) => {
  10  |       await page.goto('/signin');
  11  |       await expect(page.getByText('Enter your email and password to sign in')).toBeVisible();
  12  |     });
  13  | 
  14  |     test('should display sign-in form elements', async ({ page }) => {
  15  |       await page.goto('/signin');
  16  | 
  17  |       // Check for form elements
  18  |       await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeVisible();
  19  |       await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeVisible();
  20  |       await expect(page.locator('button[type="submit"], button:has-text("Sign in")')).toBeVisible();
  21  |     });
  22  | 
  23  |     test('should show validation errors for empty form', async ({ page }) => {
  24  |       await page.goto('/signin');
  25  | 
  26  |       // Try to submit empty form
  27  |       await page.locator('button[type="submit"], button:has-text("Sign in")').click();
  28  | 
  29  |       // Should show validation errors
  30  |       await expect(page.locator('.error, .invalid, [role="alert"]')).toBeVisible();
  31  |     });
  32  | 
  33  |     test('should show validation error for invalid email', async ({ page }) => {
  34  |       await page.goto('/signin');
  35  | 
  36  |       // Enter invalid email
  37  |       await page.locator('input[type="email"], input[placeholder*="email" i]').fill('invalid-email');
  38  |       await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password123');
  39  | 
  40  |       // Try to submit
> 41  |       await page.locator('button[type="submit"], button:has-text("Sign in")').click();
      |                                                                               ^ Error: locator.click: Test timeout of 30000ms exceeded.
  42  | 
  43  |       // Should show email validation error
  44  |       await expect(page.locator('.error, .invalid')).toBeVisible();
  45  |     });
  46  | 
  47  |     test('should toggle password visibility', async ({ page }) => {
  48  |       await page.goto('/signin');
  49  | 
  50  |       const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
  51  |       const toggleButton = page.locator('[data-testid="password-toggle"], .password-toggle, button:has(svg)').last();
  52  | 
  53  |       // Enter password
  54  |       await passwordInput.fill('testpassword');
  55  | 
  56  |       // Click toggle button if it exists
  57  |       if ((await toggleButton.count()) > 0) {
  58  |         await toggleButton.click();
  59  | 
  60  |         // Check if input type changed to text
  61  |         const inputType = await passwordInput.getAttribute('type');
  62  |         expect(inputType).toBe('text');
  63  |       }
  64  |     });
  65  | 
  66  |     test('should handle remember me checkbox', async ({ page }) => {
  67  |       await page.goto('/signin');
  68  | 
  69  |       const rememberCheckbox = page.locator('input[type="checkbox"], .checkbox');
  70  | 
  71  |       if ((await rememberCheckbox.count()) > 0) {
  72  |         // Check the remember me option
  73  |         await rememberCheckbox.check();
  74  |         await expect(rememberCheckbox).toBeChecked();
  75  | 
  76  |         // Uncheck it
  77  |         await rememberCheckbox.uncheck();
  78  |         await expect(rememberCheckbox).not.toBeChecked();
  79  |       }
  80  |     });
  81  |   });
  82  | 
  83  |   test.describe('Authentication Guards', () => {
  84  |     test('should redirect unauthenticated users to sign-in', async ({ page }) => {
  85  |       // Try to access protected route
  86  |       await page.goto('/summary');
  87  | 
  88  |       // Should redirect to sign-in
  89  |       await expect(page).toHaveURL(/\/signin/);
  90  |     });
  91  | 
  92  |     test('should redirect authenticated users away from sign-in', async ({ page }) => {
  93  |       // Mock currentUser query response for tRPC using RegExp
  94  |       await page.route(/\/auth\.currentUser/, async (route) => {
  95  |         await route.fulfill({
  96  |           status: 200,
  97  |           contentType: 'application/json',
  98  |           body: JSON.stringify([{ result: { data: { id: '123', email: 'test@example.com' } } }]),
  99  |         });
  100 |       });
  101 | 
  102 |       // Mock authentication state
  103 |       await page.addInitScript(() => {
  104 |         localStorage.setItem('auth_token', 'mock-token');
  105 |       });
  106 | 
  107 |       // Try to access sign-in page
  108 |       await page.goto('/signin');
  109 | 
  110 |       // Should redirect to dashboard or main app
  111 |       await expect(page).not.toHaveURL(/\/signin/);
  112 |     });
  113 |   });
  114 | 
  115 |   test.describe('Sign-up Flow', () => {
  116 |     test('should navigate to sign-up from sign-in', async ({ page }) => {
  117 |       await page.goto('/signin');
  118 | 
  119 |       // Look for sign-up link
  120 |       const signUpLink = page.locator('a:has-text("Sign up"), a:has-text("Create account"), [href*="signup"]');
  121 | 
  122 |       if ((await signUpLink.count()) > 0) {
  123 |         await signUpLink.click();
  124 |         await expect(page).toHaveURL(/\/signup/);
  125 |       }
  126 |     });
  127 | 
  128 |     test('should display sign-up form if available', async ({ page }) => {
  129 |       await page.goto('/signup');
  130 | 
  131 |       // Check if sign-up page exists and has form elements
  132 |       const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
  133 |       const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
  134 | 
  135 |       if ((await emailInput.count()) > 0) {
  136 |         await expect(emailInput).toBeVisible();
  137 |         await expect(passwordInput).toBeVisible();
  138 |       }
  139 |     });
  140 |   });
  141 | 
```