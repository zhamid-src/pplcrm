# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: signin.spec.ts >> Authentication >> Authentication Guards >> should redirect authenticated users away from sign-in
- Location: apps/frontend-e2e/src/signin.spec.ts:92:5

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /\/signin/
Received string: "http://localhost:4200/signin"
Timeout: 5000ms

Call log:
  - Expect "not toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:4200/signin"

```

# Page snapshot

```yaml
- generic [ref=e7]:
  - img [ref=e9]
  - generic [ref=e10]:
    - generic [ref=e11]: Enter your email and password to sign in
    - generic [ref=e13]:
      - generic [ref=e14]:
        - img [ref=e18]
        - textbox "Email" [ref=e20]:
          - /placeholder: Enter your email
      - generic [ref=e21]:
        - img [ref=e25]
        - textbox "Password" [ref=e27]:
          - /placeholder: Enter your password
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
```

# Test source

```ts
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
  41  |       await page.locator('button[type="submit"], button:has-text("Sign in")').click();
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
> 111 |       await expect(page).not.toHaveURL(/\/signin/);
      |                              ^ Error: expect(page).not.toHaveURL(expected) failed
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
  142 |   test.describe('Error Handling', () => {
  143 |     test('should handle network errors during sign-in', async ({ page }) => {
  144 |       await page.goto('/signin');
  145 | 
  146 |       // Mock network failure on the tRPC signIn mutation
  147 |       await page.route(/\/auth\.signIn/, (route) => route.abort());
  148 | 
  149 |       // Fill form and submit
  150 |       await page.locator('input[type="email"], input[placeholder*="email" i]').fill('test@example.com');
  151 |       await page.locator('input[type="password"], input[placeholder*="password" i]').fill('password123');
  152 |       await page.locator('button[type="submit"], button:has-text("Sign in")').click();
  153 | 
  154 |       // Should show error message
  155 |       await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
  156 |     });
  157 | 
  158 |     test('should handle invalid credentials', async ({ page }) => {
  159 |       await page.goto('/signin');
  160 | 
  161 |       // Mock 401 response on the tRPC signIn mutation
  162 |       await page.route(/\/auth\.signIn/, (route) =>
  163 |         route.fulfill({
  164 |           status: 401,
  165 |           contentType: 'application/json',
  166 |           body: JSON.stringify([{ error: { json: { message: 'Invalid credentials' } } }]),
  167 |         }),
  168 |       );
  169 | 
  170 |       // Fill form and submit
  171 |       await page.locator('input[type="email"], input[placeholder*="email" i]').fill('wrong@example.com');
  172 |       await page.locator('input[type="password"], input[placeholder*="password" i]').fill('wrongpassword');
  173 |       await page.locator('button[type="submit"], button:has-text("Sign in")').click();
  174 | 
  175 |       // Should show error message
  176 |       await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
  177 |     });
  178 |   });
  179 | 
  180 |   test.describe('Accessibility', () => {
  181 |     test('should have proper form labels and ARIA attributes', async ({ page }) => {
  182 |       await page.goto('/signin');
  183 | 
  184 |       // Check for proper labeling
  185 |       const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
  186 |       const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]');
  187 | 
  188 |       // Should have labels or aria-label
  189 |       await expect(emailInput).toHaveAttribute('aria-label');
  190 |       await expect(passwordInput).toHaveAttribute('aria-label');
  191 |     });
  192 | 
  193 |     test('should be keyboard navigable', async ({ page }) => {
  194 |       await page.goto('/signin');
  195 | 
  196 |       // Focus email input first
  197 |       const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
  198 |       await emailInput.focus();
  199 |       await expect(emailInput).toBeFocused();
  200 | 
  201 |       // Tab to password
  202 |       await page.keyboard.press('Tab');
  203 |       await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeFocused();
  204 | 
  205 |       // Tab to remember_me checkbox
  206 |       await page.keyboard.press('Tab');
  207 |       await expect(page.locator('input[type="checkbox"]')).toBeFocused();
  208 | 
  209 |       // Tab to forgot password link
  210 |       await page.keyboard.press('Tab');
  211 |       await expect(page.locator('a:has-text("Forgot your password?")')).toBeFocused();
```