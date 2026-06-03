# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persons-grid.spec.ts >> Persons Grid >> Address Confirmation >> should allow confirming address changes
- Location: apps/frontend-e2e/src/persons-grid.spec.ts:318:5

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('tbody tr') to be visible

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
  220 |       await nameCell.click();
  221 | 
  222 |       // Check if edit mode is activated
  223 |       const editInput = nameCell.locator('input');
  224 |       await expect(editInput).toBeVisible();
  225 |       await editInput.focus();
  226 |       await expect(editInput).toBeFocused();
  227 |     });
  228 | 
  229 |     test('should save changes on Enter key', async ({ page }) => {
  230 |       // Wait for rows to load
  231 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  232 | 
  233 |       // Click on editable cell
  234 |       const nameCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
  235 |       await nameCell.click();
  236 | 
  237 |       const editInput = nameCell.locator('input');
  238 |       if (await editInput.isVisible()) {
  239 |         // Clear and enter new value
  240 |         await editInput.focus();
  241 |         await editInput.fill('New Name');
  242 |         await editInput.press('Enter');
  243 | 
  244 |         // Check that edit mode is exited
  245 |         await expect(editInput).not.toBeVisible();
  246 |         await expect(nameCell).toContainText('New Name');
  247 |       }
  248 |     });
  249 | 
  250 |     test('should cancel changes on Escape key', async ({ page }) => {
  251 |       // Wait for rows to load
  252 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  253 | 
  254 |       // Click on editable cell
  255 |       const nameCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
  256 |       const originalValue = await nameCell.textContent();
  257 | 
  258 |       await nameCell.click();
  259 | 
  260 |       const editInput = nameCell.locator('input');
  261 |       if (await editInput.isVisible()) {
  262 |         // Change value and press Escape
  263 |         await editInput.focus();
  264 |         await editInput.fill('Changed Value');
  265 |         await editInput.press('Escape');
  266 | 
  267 |         // Check that original value is restored
  268 |         await expect(nameCell).toHaveText(originalValue || '');
  269 |       }
  270 |     });
  271 |   });
  272 | 
  273 |   test.describe('Tag Management', () => {
  274 |     test('should display tags in tag column', async ({ page }) => {
  275 |       // Wait for rows to load
  276 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  277 | 
  278 |       // Look for tags cell
  279 |       const tagCell = page.locator('tbody tr td[data-col-id="tags"]').first();
  280 |       await expect(tagCell.locator('pc-tags')).toBeVisible();
  281 |     });
  282 | 
  283 |     test('should allow tag filtering', async ({ page }) => {
  284 |       // Click tag filter dropdown in toolbar
  285 |       const tagFilterButton = page.locator('label[title="Filter by tags"]');
  286 | 
  287 |       if (await tagFilterButton.isVisible()) {
  288 |         await tagFilterButton.click();
  289 | 
  290 |         // Select a tag option checkbox
  291 |         const firstCheckbox = page.locator('.dropdown-content input[type="checkbox"]').first();
  292 |         if (await firstCheckbox.isVisible()) {
  293 |           await firstCheckbox.click();
  294 | 
  295 |           // Wait for filtering to apply
  296 |           await page.waitForLoadState('networkidle');
  297 |         }
  298 |       }
  299 |     });
  300 |   });
  301 | 
  302 |   test.describe('Address Confirmation', () => {
  303 |     test('should show confirmation dialog for address changes', async ({ page }) => {
  304 |       // Wait for rows to load
  305 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  306 | 
  307 |       // Try to edit an address field (street_num) - uses double click specifically
  308 |       const addressCell = page.locator('tbody tr td[data-col-id="street_num"]').first();
  309 | 
  310 |       if (await addressCell.isVisible()) {
  311 |         await addressCell.dblclick();
  312 | 
  313 |         // Should show confirmation dialog
  314 |         await expect(page.locator('dialog#confirmAddressEdit')).toBeVisible();
  315 |       }
  316 |     });
  317 | 
  318 |     test('should allow confirming address changes', async ({ page }) => {
  319 |       // Wait for rows to load
> 320 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
      |                  ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  321 | 
  322 |       // Try to edit an address field
  323 |       const addressCell = page.locator('tbody tr td[data-col-id="street_num"]').first();
  324 | 
  325 |       if (await addressCell.isVisible()) {
  326 |         await addressCell.dblclick();
  327 | 
  328 |         // Look for confirmation dialog
  329 |         const confirmDialog = page.locator('dialog#confirmAddressEdit');
  330 |         await expect(confirmDialog).toBeVisible();
  331 | 
  332 |         // Click Yes button
  333 |         const confirmButton = confirmDialog.locator('button:has-text("Yes")');
  334 |         await confirmButton.click();
  335 | 
  336 |         // Dialog should close
  337 |         await expect(confirmDialog).not.toBeVisible();
  338 |       }
  339 |     });
  340 |   });
  341 | 
  342 |   test.describe('Search and Filtering', () => {
  343 |     test('should have search functionality', async ({ page }) => {
  344 |       // Look for search input
  345 |       const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
  346 | 
  347 |       if (await searchInput.isVisible()) {
  348 |         await expect(searchInput).toBeVisible();
  349 | 
  350 |         // Test search functionality
  351 |         await searchInput.fill('test');
  352 |         await page.waitForLoadState('networkidle');
  353 | 
  354 |         // Grid should update with filtered results
  355 |         await expect(page.locator('tbody tr').first()).toBeVisible();
  356 |       }
  357 |     });
  358 | 
  359 |     test('should clear search results', async ({ page }) => {
  360 |       const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
  361 | 
  362 |       if (await searchInput.isVisible()) {
  363 |         // Enter search term
  364 |         await searchInput.fill('test');
  365 |         await page.waitForLoadState('networkidle');
  366 | 
  367 |         // Clear search
  368 |         await searchInput.clear();
  369 |         await page.waitForLoadState('networkidle');
  370 | 
  371 |         // Should show all results again
  372 |         await expect(page.locator('tbody tr').first()).toBeVisible();
  373 |       }
  374 |     });
  375 |   });
  376 | 
  377 |   test.describe('Performance and Responsiveness', () => {
  378 |     test('should handle large datasets efficiently', async ({ page }) => {
  379 |       // Wait for initial load
  380 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  381 | 
  382 |       // Scroll the container to test responsiveness
  383 |       const scroller = page.locator('#scroller, .overflow-auto').first();
  384 |       if (await scroller.count() > 0) {
  385 |         await scroller.evaluate(node => node.scrollTop = 100);
  386 |       }
  387 | 
  388 |       // Should still be responsive
  389 |       await expect(page.locator('tbody tr').first()).toBeVisible();
  390 |     });
  391 | 
  392 |     test('should work on mobile viewport', async ({ page }) => {
  393 |       // Set mobile viewport
  394 |       await page.setViewportSize({ width: 375, height: 667 });
  395 | 
  396 |       // Grid should still be functional
  397 |       await expect(page.locator('pc-persons-grid pc-datagrid')).toBeVisible();
  398 |     });
  399 |   });
  400 | 
  401 |   test.describe('Error Handling', () => {
  402 |     test('should handle network errors gracefully', async ({ page }) => {
  403 |       // Mock network failure for getAllWithAddress query
  404 |       await page.route(/\/persons\.getAllWithAddress/, (route) => route.abort());
  405 | 
  406 |       // Reload page
  407 |       await page.reload();
  408 | 
  409 |       // Should show error alert toast (AlertService)
  410 |       await expect(page.locator('pc-alerts .alert').first()).toBeVisible();
  411 |     });
  412 | 
  413 |     test('should handle edit conflicts', async ({ page }) => {
  414 |       // Mock edit conflict response
  415 |       await page.route(/\/persons\.update/, async (route) =>
  416 |         route.fulfill({
  417 |           status: 409,
  418 |           contentType: 'application/json',
  419 |           body: JSON.stringify([{
  420 |             error: { message: 'Conflict' }
```