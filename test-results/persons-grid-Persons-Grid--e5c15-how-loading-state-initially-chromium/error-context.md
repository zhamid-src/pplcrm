# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persons-grid.spec.ts >> Persons Grid >> Grid Display >> should show loading state initially
- Location: apps/frontend-e2e/src/persons-grid.spec.ts:148:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('pc-icon[name="loading"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('pc-icon[name="loading"]').first()

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
  67  |                   street2: '',
  68  |                   city: 'Springfield',
  69  |                   state: 'IL',
  70  |                   zip: '62702',
  71  |                   country: 'USA',
  72  |                   notes: '',
  73  |                   household_id: 'household-2'
  74  |                 }
  75  |               ],
  76  |               count: 2
  77  |             }
  78  |           }
  79  |         }]),
  80  |       });
  81  |     });
  82  | 
  83  |     // 3. Mock tags.getAll
  84  |     await page.route(/\/tags\.getAll/, async (route) => {
  85  |       await route.fulfill({
  86  |         status: 200,
  87  |         contentType: 'application/json',
  88  |         body: JSON.stringify([{
  89  |           result: {
  90  |             data: {
  91  |               rows: [
  92  |                 { id: 't1', name: 'volunteer' },
  93  |                 { id: 't2', name: 'donor' }
  94  |               ],
  95  |               count: 2
  96  |             }
  97  |           }
  98  |         }]),
  99  |       });
  100 |     });
  101 | 
  102 |     // 4. Mock persons.update to succeed
  103 |     await page.route(/\/persons\.update/, async (route) => {
  104 |       await route.fulfill({
  105 |         status: 200,
  106 |         contentType: 'application/json',
  107 |         body: JSON.stringify([{
  108 |           result: {
  109 |             data: { success: true }
  110 |           }
  111 |         }]),
  112 |       });
  113 |     });
  114 | 
  115 |     // Navigate to persons page (actual route is /people)
  116 |     await page.goto('/people');
  117 |     await page.waitForLoadState('networkidle');
  118 |   });
  119 | 
  120 |   test.describe('Grid Display', () => {
  121 |     test('should display persons grid', async ({ page }) => {
  122 |       // Check that the grid is visible
  123 |       await expect(page.locator('pc-persons-grid pc-datagrid')).toBeVisible();
  124 |     });
  125 | 
  126 |     test('should display column headers', async ({ page }) => {
  127 |       // Check for common column headers
  128 |       await expect(
  129 |         page.locator('th[role="columnheader"]:has-text("First Name")')
  130 |       ).toBeVisible();
  131 |       await expect(
  132 |         page.locator('th[role="columnheader"]:has-text("Email")')
  133 |       ).toBeVisible();
  134 |       await expect(
  135 |         page.locator('th[role="columnheader"]:has-text("Mobile")')
  136 |       ).toBeVisible();
  137 |     });
  138 | 
  139 |     test('should display person data in rows', async ({ page }) => {
  140 |       // Wait for data to load
  141 |       await page.waitForSelector('tbody tr', { timeout: 10000 });
  142 | 
  143 |       // Check that rows are present
  144 |       const rows = page.locator('tbody tr');
  145 |       await expect(rows.first()).toBeVisible();
  146 |     });
  147 | 
  148 |     test('should show loading state initially', async ({ page }) => {
  149 |       // Setup a slow response to ensure loading indicator shows
  150 |       await page.route(/\/persons\.getAllWithAddress/, async (route) => {
  151 |         await new Promise(resolve => setTimeout(resolve, 2000));
  152 |         await route.fulfill({
  153 |           status: 200,
  154 |           contentType: 'application/json',
  155 |           body: JSON.stringify([{
  156 |             result: {
  157 |               data: { rows: [], count: 0 }
  158 |             }
  159 |           }]),
  160 |         });
  161 |       });
  162 | 
  163 |       // Reload page to catch loading state
  164 |       await page.reload();
  165 | 
  166 |       // Should show loading indicator
> 167 |       await expect(page.locator('pc-icon[name="loading"]').first()).toBeVisible();
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  168 |     });
  169 |   });
  170 | 
  171 |   test.describe('Grid Interactions', () => {
  172 |     test('should allow column sorting', async ({ page }) => {
  173 |       // Wait for grid to load
  174 |       await page.waitForSelector('th[role="columnheader"]', { timeout: 10000 });
  175 | 
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
```