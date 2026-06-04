# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-client.spec.ts >> Email Client >> Email Details Display >> should display email header information
- Location: apps/frontend-e2e/src/email-client.spec.ts:289:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
  181 |             data: '<p>This is the full body content of the email.</p>'
  182 |           }
  183 |         }]),
  184 |       });
  185 |     });
  186 | 
  187 |     // 8. Mock emails.setFavourite
  188 |     await page.route(/\/emails\.setFavourite/, async (route) => {
  189 |       await route.fulfill({
  190 |         status: 200,
  191 |         contentType: 'application/json',
  192 |         body: JSON.stringify([{
  193 |           result: {
  194 |             data: { success: true }
  195 |           }
  196 |         }]),
  197 |       });
  198 |     });
  199 | 
  200 |     // 9. Mock emails.assign
  201 |     await page.route(/\/emails\.assign/, async (route) => {
  202 |       await route.fulfill({
  203 |         status: 200,
  204 |         contentType: 'application/json',
  205 |         body: JSON.stringify([{
  206 |           result: {
  207 |             data: { success: true }
  208 |           }
  209 |         }]),
  210 |       });
  211 |     });
  212 | 
  213 |     // Navigate to email client (actual route is /inbox)
  214 |     await page.goto('/inbox');
  215 |     await page.waitForLoadState('networkidle');
  216 |   });
  217 | 
  218 |   test.describe('Email Folder Navigation', () => {
  219 |     test('should display email folders', async ({ page }) => {
  220 |       // Check that folder list is visible
  221 |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
  222 |       
  223 |       // Check for common folders
  224 |       await expect(page.locator('pc-email-folder-list').getByText('Inbox')).toBeVisible();
  225 |     });
  226 | 
  227 |     test('should select folder and load emails', async ({ page }) => {
  228 |       // Click on Inbox folder
  229 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  230 |       
  231 |       // Wait for emails to load
  232 |       await page.waitForLoadState('networkidle');
  233 |       
  234 |       // Check that email list is visible
  235 |       await expect(page.locator('pc-email-list')).toBeVisible();
  236 |     });
  237 | 
  238 |     test('should highlight selected folder', async ({ page }) => {
  239 |       // Click on Inbox folder
  240 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  241 |       
  242 |       // Check that the folder has selected styling (bg-blue-100)
  243 |       const inboxFolder = page.locator('pc-email-folder-list li:has-text("Inbox")');
  244 |       await expect(inboxFolder).toHaveClass(/bg-blue-100/);
  245 |     });
  246 |   });
  247 | 
  248 |   test.describe('Email List Display', () => {
  249 |     test.beforeEach(async ({ page }) => {
  250 |       // Select Inbox folder first
  251 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  252 |       await page.waitForLoadState('networkidle');
  253 |     });
  254 | 
  255 |     test('should display email list when folder is selected', async ({ page }) => {
  256 |       await expect(page.locator('pc-email-list')).toBeVisible();
  257 |     });
  258 | 
  259 |     test('should show email preview information', async ({ page }) => {
  260 |       // Check for email elements (subject, sender, preview)
  261 |       const firstEmail = page.locator('pc-email-list li').first();
  262 |       await expect(firstEmail).toBeVisible();
  263 |       
  264 |       // Check for email metadata
  265 |       await expect(firstEmail.locator('div.truncate.text-gray-500 span.truncate')).toBeVisible();
  266 |       await expect(firstEmail.locator('div.truncate.font-medium span.truncate')).toBeVisible();
  267 |     });
  268 | 
  269 |     test('should select email on click', async ({ page }) => {
  270 |       const firstEmail = page.locator('pc-email-list li').first();
  271 |       await firstEmail.click();
  272 |       
  273 |       // Check that email details are shown
  274 |       await expect(page.locator('pc-email-details')).toBeVisible();
  275 |     });
  276 |   });
  277 | 
  278 |   test.describe('Email Details Display', () => {
  279 |     test.beforeEach(async ({ page }) => {
  280 |       // Select folder and email
> 281 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
      |                                                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  282 |       await page.waitForLoadState('networkidle');
  283 |       
  284 |       const firstEmail = page.locator('pc-email-list li').first();
  285 |       await firstEmail.click();
  286 |       await page.waitForLoadState('networkidle');
  287 |     });
  288 | 
  289 |     test('should display email header information', async ({ page }) => {
  290 |       const emailHeader = page.locator('pc-email-header');
  291 |       await expect(emailHeader).toBeVisible();
  292 |       
  293 |       // Check for header elements
  294 |       await expect(emailHeader.locator('h1')).toBeVisible();
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
```