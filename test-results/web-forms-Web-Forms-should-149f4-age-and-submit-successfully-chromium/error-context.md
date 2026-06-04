# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: web-forms.spec.ts >> Web Forms >> should display public landing page and submit successfully
- Location: apps/frontend-e2e/src/web-forms.spec.ts:146:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('h1')
Expected: "Submission Successful"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - paragraph [ref=e9]: "404"
      - paragraph [ref=e10]: Please check the URL in the address bar and try again.
    - link "Home →" [ref=e12] [cursor=pointer]:
      - /url: /
  - generic [ref=e15]:
    - generic [ref=e16]: "TS2307: Cannot find module './auth/verify-email-page/verify-email-page' or its corresponding type declarations."
    - generic [ref=e17]: apps/frontend/src/app/app.routes.ts:36:13
    - generic [ref=e18]: Click outside, press Esc key, or fix the code to dismiss.
```

# Test source

```ts
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
  187 |       await route.fulfill({
  188 |         status: 200,
  189 |         contentType: 'text/html',
  190 |         body: '<h1>Submission Successful</h1>'
  191 |       });
  192 |     });
  193 | 
  194 |     // 1. Visit landing page
  195 |     await page.goto(`/api/forms/view/${formId}`);
  196 |     await expect(page.locator('h1')).toHaveText('Newsletter Form');
  197 | 
  198 |     // 2. Fill form and submit
  199 |     await page.locator('#first_name').fill('Alice');
  200 |     await page.locator('#last_name').fill('Smith');
  201 |     await page.locator('#email').fill('alice@example.com');
  202 |     await page.locator('button[type="submit"]').click();
  203 | 
  204 |     // 3. Verify redirected to success page
> 205 |     await expect(page.locator('h1')).toHaveText('Submission Successful');
      |                                      ^ Error: expect(locator).toHaveText(expected) failed
  206 |   });
  207 | 
  208 |   test('should block submission if honeypot field is filled', async ({ page }) => {
  209 |     const formId = 'form-1111-2222-3333-444444444444';
  210 | 
  211 |     // Mock landing page html
  212 |     await page.route(new RegExp(`\\/api\\/forms\\/view\\/${formId}`), async (route) => {
  213 |       await route.fulfill({
  214 |         status: 200,
  215 |         contentType: 'text/html',
  216 |         body: `
  217 |           <!DOCTYPE html>
  218 |           <html>
  219 |           <body>
  220 |             <form action="/api/forms/submit/${formId}" method="POST">
  221 |               <input type="text" name="_hp" />
  222 |               <input type="email" id="email" name="email" required />
  223 |               <button type="submit">Submit</button>
  224 |             </form>
  225 |           </body>
  226 |           </html>
  227 |         `,
  228 |       });
  229 |     });
  230 | 
  231 |     // Mock submission failure response
  232 |     await page.route(new RegExp(`\\/api\\/forms\\/submit\\/${formId}`), async (route) => {
  233 |       await route.fulfill({
  234 |         status: 400,
  235 |         contentType: 'text/html',
  236 |         body: '<h1>Submission Failed</h1>'
  237 |       });
  238 |     });
  239 | 
  240 |     await page.goto(`/api/forms/view/${formId}`);
  241 |     await page.locator('input[name="_hp"]').fill('spam-bot-detected');
  242 |     await page.locator('#email').fill('spam@bot.com');
  243 |     await page.locator('button[type="submit"]').click();
  244 | 
  245 |     await expect(page.locator('h1')).toHaveText('Submission Failed');
  246 |   });
  247 | });
  248 | 
```