# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: web-forms.spec.ts >> Web Forms >> should display web forms grid
- Location: apps/frontend-e2e/src/web-forms.spec.ts:57:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('pc-forms-grid pc-datagrid')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('pc-forms-grid pc-datagrid')

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
  3   | test.describe('Web Forms', () => {
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
  24  |     // 2. Mock lists.getAll
  25  |     await page.route(/\/lists\.getAll/, async (route) => {
  26  |       await route.fulfill({
  27  |         status: 200,
  28  |         contentType: 'application/json',
  29  |         body: JSON.stringify([{
  30  |           result: {
  31  |             data: {
  32  |               rows: [{ id: 'list-1', name: 'Newsletter Subscribers' }],
  33  |               count: 1
  34  |             }
  35  |           }
  36  |         }]),
  37  |       });
  38  |     });
  39  | 
  40  |     // 3. Mock tags.getAll
  41  |     await page.route(/\/tags\.getAll/, async (route) => {
  42  |       await route.fulfill({
  43  |         status: 200,
  44  |         contentType: 'application/json',
  45  |         body: JSON.stringify([{
  46  |           result: {
  47  |             data: {
  48  |               rows: [{ id: 'tag-1', name: 'newsletter' }],
  49  |               count: 1
  50  |             }
  51  |           }
  52  |         }]),
  53  |       });
  54  |     });
  55  |   });
  56  | 
  57  |   test('should display web forms grid', async ({ page }) => {
  58  |     // Mock webForms.getAllWithCounts
  59  |     await page.route(/\/webForms\.getAllWithCounts/, async (route) => {
  60  |       await route.fulfill({
  61  |         status: 200,
  62  |         contentType: 'application/json',
  63  |         body: JSON.stringify([{
  64  |           result: {
  65  |             data: {
  66  |               rows: [
  67  |                 {
  68  |                   id: 'form-1111-2222-3333-444444444444',
  69  |                   name: 'Newsletter Form',
  70  |                   description: 'Used on home page',
  71  |                   redirect_url: 'https://example.com/thanks',
  72  |                   status: 'active',
  73  |                   created_at: new Date().toISOString(),
  74  |                 }
  75  |               ],
  76  |               count: 1
  77  |             }
  78  |           }
  79  |         }]),
  80  |       });
  81  |     });
  82  | 
  83  |     await page.goto('/forms');
  84  |     await page.waitForLoadState('networkidle');
  85  | 
> 86  |     await expect(page.locator('pc-forms-grid pc-datagrid')).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  87  |     await expect(page.locator('th[role="columnheader"]:has-text("Form Name")')).toBeVisible();
  88  |     await expect(page.locator('tbody tr td[data-col-id="name"]')).toContainText('Newsletter Form');
  89  |   });
  90  | 
  91  |   test('should allow creating a new web form', async ({ page }) => {
  92  |     // Mock webForms.add mutation
  93  |     await page.route(/\/webForms\.add/, async (route) => {
  94  |       await route.fulfill({
  95  |         status: 200,
  96  |         contentType: 'application/json',
  97  |         body: JSON.stringify([{
  98  |           result: {
  99  |             data: { id: 'form-1111-2222-3333-444444444444' }
  100 |           }
  101 |         }]),
  102 |       });
  103 |     });
  104 | 
  105 |     // Mock webForms.getById query (called on details/edit page)
  106 |     await page.route(/\/webForms\.getById/, async (route) => {
  107 |       await route.fulfill({
  108 |         status: 200,
  109 |         contentType: 'application/json',
  110 |         body: JSON.stringify([{
  111 |           result: {
  112 |             data: {
  113 |               id: 'form-1111-2222-3333-444444444444',
  114 |               name: 'Newsletter Form',
  115 |               description: 'Used on home page',
  116 |               redirect_url: 'https://example.com/thanks',
  117 |               status: 'active',
  118 |               target_tags: ['newsletter'],
  119 |               target_lists: ['list-1'],
  120 |               created_at: new Date().toISOString(),
  121 |             }
  122 |           }
  123 |         }]),
  124 |       });
  125 |     });
  126 | 
  127 |     await page.goto('/forms/add');
  128 |     await page.waitForLoadState('networkidle');
  129 | 
  130 |     // Fill the configuration form
  131 |     await page.locator('input[placeholder*="Newsletter Signup"]').fill('Newsletter Form');
  132 |     await page.locator('textarea[placeholder*="Internal note"]').fill('Used on home page');
  133 |     await page.locator('input[placeholder*="thank-you"]').fill('https://example.com/thanks');
  134 |     
  135 |     // Select list
  136 |     await page.locator('select:has-text("Select a list to target")').selectOption('list-1');
  137 |     
  138 |     // Submit
  139 |     await page.locator('button[type="submit"]:has-text("Save Web Form")').click();
  140 | 
  141 |     // Verify it saved and navigated to edit URL with details
  142 |     await expect(page).toHaveURL(/\/forms\/form-1111-2222-3333-444444444444/);
  143 |     await expect(page.locator('pre')).toContainText('form-1111-2222-3333-444444444444');
  144 |   });
  145 | 
  146 |   test('should display public landing page and submit successfully', async ({ page }) => {
  147 |     const formId = 'form-1111-2222-3333-444444444444';
  148 | 
  149 |     // Mock landing page html render from backend REST API
  150 |     await page.route(new RegExp(`\\/api\\/forms\\/view\\/${formId}`), async (route) => {
  151 |       await route.fulfill({
  152 |         status: 200,
  153 |         contentType: 'text/html',
  154 |         body: `
  155 |           <!DOCTYPE html>
  156 |           <html>
  157 |           <body>
  158 |             <h1>Newsletter Form</h1>
  159 |             <p>Used on home page</p>
  160 |             <form action="/api/forms/submit/${formId}" method="POST">
  161 |               <input type="text" name="_hp" style="display:none !important" />
  162 |               <input type="text" id="first_name" name="first_name" placeholder="First Name" />
  163 |               <input type="text" id="last_name" name="last_name" placeholder="Last Name" />
  164 |               <input type="email" id="email" name="email" placeholder="Email Address" required />
  165 |               <input type="text" id="mobile" name="mobile" placeholder="Mobile / Phone" />
  166 |               <textarea id="notes" name="notes"></textarea>
  167 |               <button type="submit">Submit</button>
  168 |             </form>
  169 |           </body>
  170 |           </html>
  171 |         `,
  172 |       });
  173 |     });
  174 | 
  175 |     // Mock successful submittal redirecting to success page
  176 |     await page.route(new RegExp(`\\/api\\/forms\\/submit\\/${formId}`), async (route) => {
  177 |       await route.fulfill({
  178 |         status: 302,
  179 |         headers: {
  180 |           'Location': '/api/forms/success'
  181 |         }
  182 |       });
  183 |     });
  184 | 
  185 |     // Mock success page GET
  186 |     await page.route(/\/api\/forms\/success/, async (route) => {
```