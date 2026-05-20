# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-client.spec.ts >> Email Client >> Email List Display >> should display email list when folder is selected
- Location: apps/frontend-e2e/src/email-client.spec.ts:53:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Inbox')

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
        - textbox [ref=e20]:
          - /placeholder: Enter your email
      - generic [ref=e21]:
        - img [ref=e25]
        - textbox [ref=e27]:
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
  1   | /**
  2   |  * @fileoverview E2E tests for email client functionality.
  3   |  * Tests the complete email workflow including folder navigation, email selection, and header display.
  4   |  */
  5   | import { test, expect } from '@playwright/test';
  6   | 
  7   | test.describe('Email Client', () => {
  8   |   test.beforeEach(async ({ page }) => {
  9   |     // Navigate to the email client (assuming it's at /emails or similar)
  10  |     await page.goto('/emails');
  11  |     
  12  |     // Wait for the page to load
  13  |     await page.waitForLoadState('networkidle');
  14  |   });
  15  | 
  16  |   test.describe('Email Folder Navigation', () => {
  17  |     test('should display email folders', async ({ page }) => {
  18  |       // Check that folder list is visible
  19  |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
  20  |       
  21  |       // Check for common folders
  22  |       await expect(page.getByText('Inbox')).toBeVisible();
  23  |     });
  24  | 
  25  |     test('should select folder and load emails', async ({ page }) => {
  26  |       // Click on Inbox folder
  27  |       await page.getByText('Inbox').click();
  28  |       
  29  |       // Wait for emails to load
  30  |       await page.waitForLoadState('networkidle');
  31  |       
  32  |       // Check that email list is visible
  33  |       await expect(page.locator('pc-email-list')).toBeVisible();
  34  |     });
  35  | 
  36  |     test('should highlight selected folder', async ({ page }) => {
  37  |       // Click on Inbox folder
  38  |       await page.getByText('Inbox').click();
  39  |       
  40  |       // Check that the folder has selected styling
  41  |       const inboxFolder = page.getByText('Inbox').locator('..');
  42  |       await expect(inboxFolder).toHaveClass(/selected|active|bg-primary/);
  43  |     });
  44  |   });
  45  | 
  46  |   test.describe('Email List Display', () => {
  47  |     test.beforeEach(async ({ page }) => {
  48  |       // Select Inbox folder first
> 49  |       await page.getByText('Inbox').click();
      |                                     ^ Error: locator.click: Test timeout of 30000ms exceeded.
  50  |       await page.waitForLoadState('networkidle');
  51  |     });
  52  | 
  53  |     test('should display email list when folder is selected', async ({ page }) => {
  54  |       await expect(page.locator('pc-email-list')).toBeVisible();
  55  |     });
  56  | 
  57  |     test('should show email preview information', async ({ page }) => {
  58  |       // Check for email elements (subject, sender, preview)
  59  |       const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
  60  |       
  61  |       if (await firstEmail.count() > 0) {
  62  |         await expect(firstEmail).toBeVisible();
  63  |         
  64  |         // Check for email metadata
  65  |         await expect(firstEmail.locator('.email-subject, [data-testid="email-subject"]')).toBeVisible();
  66  |         await expect(firstEmail.locator('.email-sender, [data-testid="email-sender"]')).toBeVisible();
  67  |       }
  68  |     });
  69  | 
  70  |     test('should select email on click', async ({ page }) => {
  71  |       const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
  72  |       
  73  |       if (await firstEmail.count() > 0) {
  74  |         await firstEmail.click();
  75  |         
  76  |         // Check that email details are shown
  77  |         await expect(page.locator('pc-email-details')).toBeVisible();
  78  |       }
  79  |     });
  80  |   });
  81  | 
  82  |   test.describe('Email Details Display', () => {
  83  |     test.beforeEach(async ({ page }) => {
  84  |       // Select folder and email
  85  |       await page.getByText('Inbox').click();
  86  |       await page.waitForLoadState('networkidle');
  87  |       
  88  |       const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
  89  |       if (await firstEmail.count() > 0) {
  90  |         await firstEmail.click();
  91  |         await page.waitForLoadState('networkidle');
  92  |       }
  93  |     });
  94  | 
  95  |     test('should display email header information', async ({ page }) => {
  96  |       const emailHeader = page.locator('pc-email-header');
  97  |       
  98  |       if (await emailHeader.count() > 0) {
  99  |         await expect(emailHeader).toBeVisible();
  100 |         
  101 |         // Check for header elements
  102 |         await expect(emailHeader.locator('[data-testid="email-subject"], .email-subject')).toBeVisible();
  103 |         await expect(emailHeader.locator('[data-testid="email-from"], .email-from')).toBeVisible();
  104 |         await expect(emailHeader.locator('[data-testid="email-date"], .email-date')).toBeVisible();
  105 |       }
  106 |     });
  107 | 
  108 |     test('should display email body content', async ({ page }) => {
  109 |       const emailBody = page.locator('pc-email-body');
  110 |       
  111 |       if (await emailBody.count() > 0) {
  112 |         await expect(emailBody).toBeVisible();
  113 |         
  114 |         // Check that body content is loaded
  115 |         await expect(emailBody.locator('.prose, .email-content')).toBeVisible();
  116 |       }
  117 |     });
  118 | 
  119 |     test('should show recipient dropdown on click', async ({ page }) => {
  120 |       const recipientDropdown = page.locator('[data-testid="recipient-dropdown"], .dropdown');
  121 |       
  122 |       if (await recipientDropdown.count() > 0) {
  123 |         await recipientDropdown.click();
  124 |         
  125 |         // Check that dropdown menu is visible
  126 |         await expect(page.locator('.dropdown-content, .menu')).toBeVisible();
  127 |       }
  128 |     });
  129 |   });
  130 | 
  131 |   test.describe('Email Actions', () => {
  132 |     test.beforeEach(async ({ page }) => {
  133 |       // Select folder and email
  134 |       await page.getByText('Inbox').click();
  135 |       await page.waitForLoadState('networkidle');
  136 |       
  137 |       const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
  138 |       if (await firstEmail.count() > 0) {
  139 |         await firstEmail.click();
  140 |         await page.waitForLoadState('networkidle');
  141 |       }
  142 |     });
  143 | 
  144 |     test('should toggle favorite status', async ({ page }) => {
  145 |       const favoriteButton = page.locator('[data-testid="favorite-button"], .favorite-btn');
  146 |       
  147 |       if (await favoriteButton.count() > 0) {
  148 |         // Get initial state
  149 |         const initialIcon = await favoriteButton.locator('pc-icon').textContent();
```