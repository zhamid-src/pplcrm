# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-client.spec.ts >> Email Client >> Responsive Design >> should work on tablet viewport
- Location: apps/frontend-e2e/src/email-client.spec.ts:189:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('pc-email-folder-list')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('pc-email-folder-list')

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
  150 |         
  151 |         // Click to toggle
  152 |         await favoriteButton.click();
  153 |         await page.waitForLoadState('networkidle');
  154 |         
  155 |         // Check that icon changed
  156 |         const newIcon = await favoriteButton.locator('pc-icon').textContent();
  157 |         expect(newIcon).not.toBe(initialIcon);
  158 |       }
  159 |     });
  160 | 
  161 |     test('should show assignment options', async ({ page }) => {
  162 |       const assignButton = page.locator('[data-testid="assign-button"], pc-email-assign button');
  163 |       
  164 |       if (await assignButton.count() > 0) {
  165 |         await assignButton.click();
  166 |         
  167 |         // Check that assignment dropdown is visible
  168 |         await expect(page.locator('.dropdown-content, .assignment-menu')).toBeVisible();
  169 |       }
  170 |     });
  171 |   });
  172 | 
  173 |   test.describe('Responsive Design', () => {
  174 |     test('should work on mobile viewport', async ({ page }) => {
  175 |       // Set mobile viewport
  176 |       await page.setViewportSize({ width: 375, height: 667 });
  177 |       
  178 |       // Check that email client is still functional
  179 |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
  180 |       
  181 |       // Select folder
  182 |       await page.getByText('Inbox').click();
  183 |       await page.waitForLoadState('networkidle');
  184 |       
  185 |       // Check that email list is visible
  186 |       await expect(page.locator('pc-email-list')).toBeVisible();
  187 |     });
  188 | 
  189 |     test('should work on tablet viewport', async ({ page }) => {
  190 |       // Set tablet viewport
  191 |       await page.setViewportSize({ width: 768, height: 1024 });
  192 |       
  193 |       // Check that all components are visible
> 194 |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  195 |       await expect(page.locator('pc-email-list')).toBeVisible();
  196 |       await expect(page.locator('pc-email-details')).toBeVisible();
  197 |     });
  198 |   });
  199 | 
  200 |   test.describe('Error Handling', () => {
  201 |     test('should handle network errors gracefully', async ({ page }) => {
  202 |       // Simulate network failure
  203 |       await page.route('**/api/**', route => route.abort());
  204 |       
  205 |       // Try to load emails
  206 |       await page.getByText('Inbox').click();
  207 |       
  208 |       // Should show error state or loading state, not crash
  209 |       await expect(page.locator('body')).toBeVisible();
  210 |     });
  211 | 
  212 |     test('should handle empty folder state', async ({ page }) => {
  213 |       // Mock empty response
  214 |       await page.route('**/api/emails/**', route => 
  215 |         route.fulfill({ 
  216 |           status: 200, 
  217 |           contentType: 'application/json',
  218 |           body: JSON.stringify([])
  219 |         })
  220 |       );
  221 |       
  222 |       await page.getByText('Inbox').click();
  223 |       await page.waitForLoadState('networkidle');
  224 |       
  225 |       // Should show empty state message
  226 |       await expect(page.locator('pc-email-list')).toBeVisible();
  227 |     });
  228 |   });
  229 | });
  230 | 
```