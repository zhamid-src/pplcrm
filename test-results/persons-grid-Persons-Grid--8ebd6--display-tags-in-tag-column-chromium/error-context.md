# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persons-grid.spec.ts >> Persons Grid >> Tag Management >> should display tags in tag column
- Location: apps/frontend-e2e/src/persons-grid.spec.ts:274:5

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
  176 |       // Click on a sortable column header label
  177 |       const nameHeader = page.locator('th[role="columnheader"]:has-text("First Name")').first();
  178 |       await nameHeader.locator('[data-header-label]').click();
  179 | 
  180 |       // Check for sort indicator status on the element
  181 |       await expect(nameHeader).toHaveAttribute('aria-sort', /ascending|descending/);
  182 |     });
  183 | 
  184 |     test('should allow column filtering', async ({ page }) => {
  185 |       // Wait for grid to load
  186 |       await page.waitForSelector('th[role="columnheader"]', { timeout: 10000 });
  187 | 
  188 |       // Click on filter options button
  189 |       const filterButton = page.locator('th[role="columnheader"]:has-text("First Name") label[title="Column options"]').first();
  190 | 
  191 |       if (await filterButton.isVisible()) {
  192 |         await filterButton.click();
  193 | 
  194 |         // Check that filter dropdown menu appears
  195 |         const dropdownMenu = page.locator('th[role="columnheader"]:has-text("First Name") .dropdown-content').first();
  196 |         await expect(dropdownMenu).toBeVisible();
  197 |       }
  198 |     });
  199 | 
  200 |     test('should allow row selection', async ({ page }) => {
  201 |       // Wait for rows to load
  202 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  203 | 
  204 |       // Click first row's checkbox
  205 |       const firstRowCheckbox = page.locator('tbody tr input[type="checkbox"]').first();
  206 |       await firstRowCheckbox.click();
  207 | 
  208 |       // Check that it's selected (checked)
  209 |       await expect(firstRowCheckbox).toBeChecked();
  210 |     });
  211 |   });
  212 | 
  213 |   test.describe('Inline Editing', () => {
  214 |     test('should allow editing person name', async ({ page }) => {
  215 |       // Wait for rows to load
  216 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  217 | 
  218 |       // Click on name cell to edit (single click matches pcEditable behavior)
  219 |       const nameCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
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
> 276 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
      |                  ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
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
  320 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
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
```