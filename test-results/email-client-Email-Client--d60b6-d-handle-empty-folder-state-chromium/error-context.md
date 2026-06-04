# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-client.spec.ts >> Email Client >> Error Handling >> should handle empty folder state
- Location: apps/frontend-e2e/src/email-client.spec.ts:379:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('pc-email-folder-list').getByText('Inbox')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
  - generic [ref=e43]:
    - generic [ref=e44]: "TS2307: Cannot find module './auth/verify-email-page/verify-email-page' or its corresponding type declarations."
    - generic [ref=e45]: apps/frontend/src/app/app.routes.ts:36:13
    - generic [ref=e46]: Click outside, press Esc key, or fix the code to dismiss.
```

# Test source

```ts
  295 |       await expect(emailHeader.locator('span.font-semibold')).toBeVisible();
  296 |       await expect(emailHeader.locator('span.whitespace-nowrap')).toBeVisible();
  297 |     });
  298 | 
  299 |     test('should display email body content', async ({ page }) => {
  300 |       const emailBody = page.locator('pc-email-body');
  301 |       await expect(emailBody).toBeVisible();
  302 |       
  303 |       // Check that body content is loaded
  304 |       await expect(emailBody.locator('.prose')).toBeVisible();
  305 |     });
  306 |   });
  307 | 
  308 |   test.describe('Email Actions', () => {
  309 |     test.beforeEach(async ({ page }) => {
  310 |       // Select folder and email
  311 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  312 |       await page.waitForLoadState('networkidle');
  313 |       
  314 |       const firstEmail = page.locator('pc-email-list li').first();
  315 |       await firstEmail.click();
  316 |       await page.waitForLoadState('networkidle');
  317 |     });
  318 | 
  319 |     test('should toggle favorite status', async ({ page }) => {
  320 |       const favoriteButton = page.locator('[data-testid="favorite-button"]');
  321 |       await expect(favoriteButton).toBeVisible();
  322 |       
  323 |       // Click to toggle
  324 |       await favoriteButton.click();
  325 |       await page.waitForLoadState('networkidle');
  326 |     });
  327 | 
  328 |     test('should show assignment options', async ({ page }) => {
  329 |       const assignButton = page.locator('pc-email-assign .dropdown .badge');
  330 |       await expect(assignButton).toBeVisible();
  331 |       
  332 |       await assignButton.click();
  333 |       
  334 |       // Check that assignment dropdown is visible
  335 |       await expect(page.locator('pc-email-assign .dropdown-content')).toBeVisible();
  336 |     });
  337 |   });
  338 | 
  339 |   test.describe('Responsive Design', () => {
  340 |     test('should work on mobile viewport', async ({ page }) => {
  341 |       // Set mobile viewport
  342 |       await page.setViewportSize({ width: 375, height: 667 });
  343 |       
  344 |       // Check that email client components are visible
  345 |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
  346 |       
  347 |       // Select folder
  348 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  349 |       await page.waitForLoadState('networkidle');
  350 |       
  351 |       // Check that email list is visible
  352 |       await expect(page.locator('pc-email-list')).toBeVisible();
  353 |     });
  354 | 
  355 |     test('should work on tablet viewport', async ({ page }) => {
  356 |       // Set tablet viewport
  357 |       await page.setViewportSize({ width: 768, height: 1024 });
  358 |       
  359 |       // Check that all components are visible
  360 |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
  361 |       await expect(page.locator('pc-email-list')).toBeVisible();
  362 |       await expect(page.locator('pc-email-details')).toBeVisible();
  363 |     });
  364 |   });
  365 | 
  366 |   test.describe('Error Handling', () => {
  367 |     test('should handle network errors gracefully', async ({ page }) => {
  368 |       // Simulate network failure on getEmails
  369 |       await page.route(/\/emails\.getEmails/, route => route.abort());
  370 |       
  371 |       // Select folder to trigger loading emails which fails
  372 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  373 |       await page.waitForLoadState('networkidle');
  374 |       
  375 |       // Should show error alert toast
  376 |       await expect(page.locator('pc-alerts .alert').first()).toBeVisible();
  377 |     });
  378 | 
  379 |     test('should handle empty folder state', async ({ page }) => {
  380 |       // Mock empty emails list
  381 |       await page.route(/\/emails\.getEmails/, route => 
  382 |         route.fulfill({ 
  383 |           status: 200, 
  384 |           contentType: 'application/json',
  385 |           body: JSON.stringify([{
  386 |             result: {
  387 |               data: []
  388 |             }
  389 |           }])
  390 |         })
  391 |       );
  392 |       
  393 |       // Reload page and click Inbox
  394 |       await page.reload();
> 395 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
      |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  396 |       await page.waitForLoadState('networkidle');
  397 |       
  398 |       // No email list items should be shown, or empty state should display
  399 |       await expect(page.locator('pc-email-list li')).toHaveCount(0);
  400 |     });
  401 |   });
  402 | });
  403 | 
```