# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: volunteer-events.spec.ts >> Volunteer Events >> should display volunteer events grid
- Location: apps/frontend-e2e/src/volunteer-events.spec.ts:48:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('pc-events-grid pc-datagrid')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('pc-events-grid pc-datagrid')

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
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test.describe('Volunteer Events', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // 1. Mock currentUser to bypass AuthGuard
  6   |     await page.route(/\/auth\.currentUser/, async (route) => {
  7   |       await route.fulfill({
  8   |         status: 200,
  9   |         contentType: 'application/json',
  10  |         body: JSON.stringify([{
  11  |           result: {
  12  |             data: {
  13  |               id: 'user-1',
  14  |               email: 'test@example.com',
  15  |               first_name: 'Test',
  16  |               last_name: 'User',
  17  |               role: 'user',
  18  |             }
  19  |           }
  20  |         }]),
  21  |       });
  22  |     });
  23  | 
  24  |     // 2. Mock persons.getAll for potential volunteers list
  25  |     await page.route(/\/persons\.getAll/, async (route) => {
  26  |       await route.fulfill({
  27  |         status: 200,
  28  |         contentType: 'application/json',
  29  |         body: JSON.stringify([{
  30  |           result: {
  31  |             data: {
  32  |               rows: [
  33  |                 {
  34  |                   id: 'person-v1',
  35  |                   first_name: 'John',
  36  |                   last_name: 'Volunteer',
  37  |                   email: 'johnv@example.com',
  38  |                 }
  39  |               ],
  40  |               count: 1
  41  |             }
  42  |           }
  43  |         }]),
  44  |       });
  45  |     });
  46  |   });
  47  | 
  48  |   test('should display volunteer events grid', async ({ page }) => {
  49  |     // Mock volunteer.getAll
  50  |     await page.route(/\/volunteer\.getAll/, async (route) => {
  51  |       await route.fulfill({
  52  |         status: 200,
  53  |         contentType: 'application/json',
  54  |         body: JSON.stringify([{
  55  |           result: {
  56  |             data: {
  57  |               rows: [
  58  |                 {
  59  |                   id: 'event-1',
  60  |                   name: ' Weekend Door Knocking',
  61  |                   description: 'Canvassing weekend',
  62  |                   location_address: 'Central Park',
  63  |                   start_time: new Date().toISOString(),
  64  |                   end_time: new Date().toISOString(),
  65  |                   capacity: 10,
  66  |                   volunteers_count: 2,
  67  |                 }
  68  |               ],
  69  |               count: 1
  70  |             }
  71  |           }
  72  |         }]),
  73  |       });
  74  |     });
  75  | 
  76  |     await page.goto('/schedule');
  77  |     await page.waitForLoadState('networkidle');
  78  | 
> 79  |     await expect(page.locator('pc-events-grid pc-datagrid')).toBeVisible();
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  80  |     await expect(page.locator('th[role="columnheader"]:has-text("Event Name")')).toBeVisible();
  81  |     await expect(page.locator('tbody tr td[data-col-id="name"]')).toContainText('Weekend Door Knocking');
  82  |   });
  83  | 
  84  |   test('should allow creating a new volunteer event', async ({ page }) => {
  85  |     // Mock volunteer.add mutation
  86  |     await page.route(/\/volunteer\.add/, async (route) => {
  87  |       await route.fulfill({
  88  |         status: 200,
  89  |         contentType: 'application/json',
  90  |         body: JSON.stringify([{
  91  |           result: {
  92  |             data: { id: 'event-1' }
  93  |           }
  94  |         }]),
  95  |       });
  96  |     });
  97  | 
  98  |     // Mock volunteer.getById query
  99  |     await page.route(/\/volunteer\.getById/, async (route) => {
  100 |       await route.fulfill({
  101 |         status: 200,
  102 |         contentType: 'application/json',
  103 |         body: JSON.stringify([{
  104 |           result: {
  105 |             data: {
  106 |               id: 'event-1',
  107 |               name: 'Weekend Door Knocking',
  108 |               description: 'Canvassing weekend',
  109 |               location_address: 'Central Park',
  110 |               start_time: new Date().toISOString(),
  111 |               end_time: new Date().toISOString(),
  112 |               capacity: 10,
  113 |               created_at: new Date().toISOString(),
  114 |             }
  115 |           }
  116 |         }]),
  117 |       });
  118 |     });
  119 | 
  120 |     // Mock volunteer.getShiftsForEvent
  121 |     await page.route(/\/volunteer\.getShiftsForEvent/, async (route) => {
  122 |       await route.fulfill({
  123 |         status: 200,
  124 |         contentType: 'application/json',
  125 |         body: JSON.stringify([{
  126 |           result: {
  127 |             data: []
  128 |           }
  129 |         }]),
  130 |       });
  131 |     });
  132 | 
  133 |     await page.goto('/schedule/add');
  134 |     await page.waitForLoadState('networkidle');
  135 | 
  136 |     // Fill the configuration form
  137 |     await page.locator('#event-name').fill('Weekend Door Knocking');
  138 |     await page.locator('#event-desc').fill('Canvassing weekend');
  139 |     await page.locator('#event-location').fill('Central Park');
  140 |     
  141 |     // Fill dates
  142 |     const formatDateTimeLocal = (date: Date) => {
  143 |       const pad = (n: number) => String(n).padStart(2, '0');
  144 |       return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  145 |     };
  146 |     await page.locator('#start-time').fill(formatDateTimeLocal(new Date()));
  147 |     await page.locator('#end-time').fill(formatDateTimeLocal(new Date()));
  148 |     await page.locator('#capacity').fill('10');
  149 |     
  150 |     // Submit
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
```