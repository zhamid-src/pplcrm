# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: volunteer-events.spec.ts >> Volunteer Events >> should allow roster management
- Location: apps/frontend-e2e/src/volunteer-events.spec.ts:158:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="Search volunteers"]')

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
  151 |     await page.locator('button[type="submit"]:has-text("Create Event")').click();
  152 | 
  153 |     // Verify it saved and navigated to edit URL
  154 |     await expect(page).toHaveURL(/\/schedule\/event-1/);
  155 |     await expect(page.locator('h1')).toContainText('Weekend Door Knocking');
  156 |   });
  157 | 
  158 |   test('should allow roster management', async ({ page }) => {
  159 |     // Mock volunteer.getById query
  160 |     await page.route(/\/volunteer\.getById/, async (route) => {
  161 |       await route.fulfill({
  162 |         status: 200,
  163 |         contentType: 'application/json',
  164 |         body: JSON.stringify([{
  165 |           result: {
  166 |             data: {
  167 |               id: 'event-1',
  168 |               name: 'Weekend Door Knocking',
  169 |               description: 'Canvassing weekend',
  170 |               location_address: 'Central Park',
  171 |               start_time: new Date().toISOString(),
  172 |               end_time: new Date().toISOString(),
  173 |               capacity: 10,
  174 |               created_at: new Date().toISOString(),
  175 |             }
  176 |           }
  177 |         }]),
  178 |       });
  179 |     });
  180 | 
  181 |     // Mock shift roster get
  182 |     let shiftList = [] as any[];
  183 |     await page.route(/\/volunteer\.getShiftsForEvent/, async (route) => {
  184 |       await route.fulfill({
  185 |         status: 200,
  186 |         contentType: 'application/json',
  187 |         body: JSON.stringify([{
  188 |           result: {
  189 |             data: shiftList
  190 |           }
  191 |         }]),
  192 |       });
  193 |     });
  194 | 
  195 |     // Mock signup mutation
  196 |     await page.route(/\/volunteer\.signupVolunteer/, async (route) => {
  197 |       // Update our mocked list so next fetch returns the shift
  198 |       shiftList = [{
  199 |         id: 'shift-1',
  200 |         person_id: 'person-v1',
  201 |         first_name: 'John',
  202 |         last_name: 'Volunteer',
  203 |         email: 'johnv@example.com',
  204 |         status: 'signed_up',
  205 |         hours_worked: null,
  206 |         notes: '',
  207 |       }];
  208 |       await route.fulfill({
  209 |         status: 200,
  210 |         contentType: 'application/json',
  211 |         body: JSON.stringify([{
  212 |           result: {
  213 |             data: { id: 'shift-1' }
  214 |           }
  215 |         }]),
  216 |       });
  217 |     });
  218 | 
  219 |     // Mock updateShift mutation
  220 |     await page.route(/\/volunteer\.updateShift/, async (route) => {
  221 |       await route.fulfill({
  222 |         status: 200,
  223 |         contentType: 'application/json',
  224 |         body: JSON.stringify([{
  225 |           result: {
  226 |             data: { success: true }
  227 |           }
  228 |         }]),
  229 |       });
  230 |     });
  231 | 
  232 |     // Mock deleteShift mutation
  233 |     await page.route(/\/volunteer\.deleteShift/, async (route) => {
  234 |       shiftList = [];
  235 |       await route.fulfill({
  236 |         status: 200,
  237 |         contentType: 'application/json',
  238 |         body: JSON.stringify([{
  239 |           result: {
  240 |             data: { success: true }
  241 |           }
  242 |         }]),
  243 |       });
  244 |     });
  245 | 
  246 |     // 1. Visit details page
  247 |     await page.goto('/schedule/event-1');
  248 |     await page.waitForLoadState('networkidle');
  249 | 
  250 |     // 2. Search and add a volunteer
> 251 |     await page.locator('input[placeholder*="Search volunteers"]').fill('John');
      |                                                                   ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  252 |     await page.locator('.hover\\:bg-base-200').first().click();
  253 | 
  254 |     // Verify added to roster
  255 |     await expect(page.locator('tbody tr td:has-text("John Volunteer")')).toBeVisible();
  256 | 
  257 |     // 3. Edit shift details and save
  258 |     await page.locator('select').selectOption('attended');
  259 |     await page.locator('input[type="number"]').fill('3.5');
  260 |     await page.locator('input[placeholder*="Optional details"]').fill('Great volunteer work');
  261 |     await page.locator('button[title="Save shift edits"]').click();
  262 | 
  263 |     // Verify success toast appears (AlertService)
  264 |     await expect(page.locator('pc-alerts .alert').first()).toBeVisible();
  265 | 
  266 |     // 4. Remove volunteer from roster
  267 |     page.once('dialog', dialog => dialog.accept()); // Automatically confirm window confirm dialog
  268 |     await page.locator('button[title="Remove volunteer"]').click();
  269 | 
  270 |     // Verify roster is empty again
  271 |     await expect(page.locator('tbody tr td:has-text("No volunteers signed up")')).toBeVisible();
  272 |   });
  273 | });
  274 | 
```