# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-client.spec.ts >> Email Client >> Email Folder Navigation >> should display email folders
- Location: apps/frontend-e2e/src/email-client.spec.ts:237:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('pc-email-folder-list').getByText('Inbox')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('pc-email-folder-list').getByText('Inbox')

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e8]:
    - img "Compact Logo" [ref=e10]
    - link [ref=e12] [cursor=pointer]:
      - /url: /summary
      - img [ref=e16]
    - generic [ref=e18]:
      - generic [ref=e20]: DATA
      - generic [ref=e21]:
        - link [ref=e22] [cursor=pointer]:
          - /url: /people
          - img [ref=e26]
        - link [ref=e28] [cursor=pointer]:
          - /url: /households
          - img [ref=e32]
        - link [ref=e34] [cursor=pointer]:
          - /url: /companies
          - img [ref=e38]
        - link [ref=e40] [cursor=pointer]:
          - /url: /people/duplicates
          - img [ref=e44]
        - link [ref=e46] [cursor=pointer]:
          - /url: /forms
          - img [ref=e50]
    - generic [ref=e52]:
      - generic [ref=e54]: ENGAGE
      - generic [ref=e55]:
        - link [ref=e56] [cursor=pointer]:
          - /url: /inbox
          - img [ref=e60]
        - link [ref=e62] [cursor=pointer]:
          - /url: /lists
          - img [ref=e66]
        - link [ref=e68] [cursor=pointer]:
          - /url: /newsletter
          - img [ref=e72]
        - link [ref=e74] [cursor=pointer]:
          - /url: /workflows
          - img [ref=e78]
    - generic [ref=e80]:
      - generic [ref=e82]: OUTREACH
      - generic [ref=e83]:
        - link [ref=e84] [cursor=pointer]:
          - /url: /teams
          - img [ref=e88]
        - link [ref=e90] [cursor=pointer]:
          - /url: /volunteers
          - img [ref=e94]
        - link [ref=e96] [cursor=pointer]:
          - /url: /schedule
          - img [ref=e100]
    - generic [ref=e104]: TOOLS
    - generic [ref=e107]: SYSTEM
    - generic "Toggle drawer" [ref=e110]:
      - generic [ref=e111] [cursor=pointer]:
        - img [ref=e115]
        - img [ref=e120]
  - generic [ref=e122]:
    - generic [ref=e125]:
      - img [ref=e129] [cursor=pointer]
      - generic "Toggle full screen" [ref=e131] [cursor=pointer]:
        - generic [ref=e132]:
          - img [ref=e136]
          - img [ref=e141]
      - generic "Toggle theme" [ref=e143]:
        - generic [ref=e144] [cursor=pointer]:
          - img [ref=e148]
          - img [ref=e153]
      - button "Notifications" [ref=e156] [cursor=pointer]:
        - img [ref=e160]
      - button "User Profile Picture" [ref=e163] [cursor=pointer]:
        - img "User Profile Picture" [ref=e165]
    - list [ref=e168]:
      - listitem [ref=e169]: home
      - listitem [ref=e170]:
        - generic [ref=e171] [cursor=pointer]: summary
      - listitem [ref=e172]:
        - img [ref=e176] [cursor=pointer]
    - generic [ref=e181]:
      - generic [ref=e182]:
        - heading "CRM Summary Dashboard" [level=1] [ref=e183]:
          - img [ref=e187]
          - text: CRM Summary Dashboard
        - paragraph [ref=e189]: Overview of key performance metrics, email response rates, and contact database growth.
      - button "Reload Stats" [ref=e190] [cursor=pointer]:
        - img [ref=e194]
        - text: Reload Stats
```

# Test source

```ts
  142 |                   status: 'open'
  143 |                 },
  144 |                 {
  145 |                   id: 'email-2',
  146 |                   folder_id: 'inbox-folder',
  147 |                   from_email: 'sender2@example.com',
  148 |                   from_name: 'Jane Sender',
  149 |                   to_email: 'test@example.com',
  150 |                   subject: 'Important Meeting',
  151 |                   preview: 'Just checking in about the meeting today.',
  152 |                   assigned_to: null,
  153 |                   updated_at: '2026-05-20T01:00:00.000Z',
  154 |                   is_favourite: true,
  155 |                   attachment_count: 1,
  156 |                   has_attachment: true,
  157 |                   status: 'open'
  158 |                 }
  159 |               ] } } }),
  160 |       });
  161 |     });
  162 | 
  163 |     // 5. Mock emails.hasAttachmentByEmailIds
  164 |     await page.route(/\/emails\.hasAttachmentByEmailIds/, async (route) => {
  165 |       await route.fulfill({
  166 |         status: 200,
  167 |         contentType: 'application/json',
  168 |         body: JSON.stringify({ result: { data: { json: [
  169 |                 { email_id: 'email-1', has: false },
  170 |                 { email_id: 'email-2', has: true }
  171 |               ] } } }),
  172 |       });
  173 |     });
  174 | 
  175 |     // 6. Mock emails.getEmailWithHeaders
  176 |     await page.route(/\/emails\.getEmailWithHeaders/, async (route) => {
  177 |       await route.fulfill({
  178 |         status: 200,
  179 |         contentType: 'application/json',
  180 |         body: JSON.stringify({ result: { data: { json: {
  181 |                 email: {
  182 |                   id: 'email-1',
  183 |                   folder_id: 'inbox-folder',
  184 |                   from_email: 'sender1@example.com',
  185 |                   from_name: 'John Sender',
  186 |                   to_email: 'test@example.com',
  187 |                   subject: 'Hello World',
  188 |                   preview: 'This is a preview of the email content...',
  189 |                   assigned_to: null,
  190 |                   updated_at: '2026-05-20T00:00:00.000Z',
  191 |                   is_favourite: false,
  192 |                   attachment_count: 0,
  193 |                   has_attachment: false,
  194 |                   status: 'open',
  195 |                   to_list: [{ email: 'test@example.com', name: 'Test User' }],
  196 |                   cc_list: [],
  197 |                   bcc_list: []
  198 |                 },
  199 |                 comments: []
  200 |               } } } }),
  201 |       });
  202 |     });
  203 | 
  204 |     // 7. Mock emails.getEmailBody
  205 |     await page.route(/\/emails\.getEmailBody/, async (route) => {
  206 |       await route.fulfill({
  207 |         status: 200,
  208 |         contentType: 'application/json',
  209 |         body: JSON.stringify({ result: { data: { json: '<p>This is the full body content of the email.</p>' } } }),
  210 |       });
  211 |     });
  212 | 
  213 |     // 8. Mock emails.setFavourite
  214 |     await page.route(/\/emails\.setFavourite/, async (route) => {
  215 |       await route.fulfill({
  216 |         status: 200,
  217 |         contentType: 'application/json',
  218 |         body: JSON.stringify({ result: { data: { json: { success: true } } } }),
  219 |       });
  220 |     });
  221 | 
  222 |     // 9. Mock emails.assign
  223 |     await page.route(/\/emails\.assign/, async (route) => {
  224 |       await route.fulfill({
  225 |         status: 200,
  226 |         contentType: 'application/json',
  227 |         body: JSON.stringify({ result: { data: { json: { success: true } } } }),
  228 |       });
  229 |     });
  230 | 
  231 |     // Navigate to email client (actual route is /inbox)
  232 |     await page.goto('/inbox');
  233 |     await page.waitForLoadState('networkidle');
  234 |   });
  235 | 
  236 |   test.describe('Email Folder Navigation', () => {
  237 |     test('should display email folders', async ({ page }) => {
  238 |       // Check that folder list is visible
  239 |       await expect(page.locator('pc-email-folder-list')).toBeVisible();
  240 |       
  241 |       // Check for common folders
> 242 |       await expect(page.locator('pc-email-folder-list').getByText('Inbox')).toBeVisible();
      |                                                                             ^ Error: expect(locator).toBeVisible() failed
  243 |     });
  244 | 
  245 |     test('should select folder and load emails', async ({ page }) => {
  246 |       // Click on Inbox folder
  247 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  248 |       
  249 |       // Wait for emails to load
  250 |       await page.waitForLoadState('networkidle');
  251 |       
  252 |       // Check that email list is visible
  253 |       await expect(page.locator('pc-email-list')).toBeVisible();
  254 |     });
  255 | 
  256 |     test('should highlight selected folder', async ({ page }) => {
  257 |       // Click on Inbox folder
  258 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  259 |       
  260 |       // Check that the folder has selected styling (bg-blue-100)
  261 |       const inboxFolder = page.locator('pc-email-folder-list li:has-text("Inbox")');
  262 |       await expect(inboxFolder).toHaveClass(/bg-blue-100/);
  263 |     });
  264 |   });
  265 | 
  266 |   test.describe('Email List Display', () => {
  267 |     test.beforeEach(async ({ page }) => {
  268 |       // Select Inbox folder first
  269 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  270 |       await page.waitForLoadState('networkidle');
  271 |     });
  272 | 
  273 |     test('should display email list when folder is selected', async ({ page }) => {
  274 |       await expect(page.locator('pc-email-list')).toBeVisible();
  275 |     });
  276 | 
  277 |     test('should show email preview information', async ({ page }) => {
  278 |       // Check for email elements (subject, sender, preview)
  279 |       const firstEmail = page.locator('pc-email-list li').first();
  280 |       await expect(firstEmail).toBeVisible();
  281 |       
  282 |       // Check for email metadata
  283 |       await expect(firstEmail.locator('div.truncate.text-gray-500 span.truncate')).toBeVisible();
  284 |       await expect(firstEmail.locator('div.truncate.font-medium span.truncate')).toBeVisible();
  285 |     });
  286 | 
  287 |     test('should select email on click', async ({ page }) => {
  288 |       const firstEmail = page.locator('pc-email-list li').first();
  289 |       await firstEmail.click();
  290 |       
  291 |       // Check that email details are shown
  292 |       await expect(page.locator('pc-email-details')).toBeVisible();
  293 |     });
  294 |   });
  295 | 
  296 |   test.describe('Email Details Display', () => {
  297 |     test.beforeEach(async ({ page }) => {
  298 |       // Select folder and email
  299 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  300 |       await page.waitForLoadState('networkidle');
  301 |       
  302 |       const firstEmail = page.locator('pc-email-list li').first();
  303 |       await firstEmail.click();
  304 |       await page.waitForLoadState('networkidle');
  305 |     });
  306 | 
  307 |     test('should display email header information', async ({ page }) => {
  308 |       const emailHeader = page.locator('pc-email-header');
  309 |       await expect(emailHeader).toBeVisible();
  310 |       
  311 |       // Check for header elements
  312 |       await expect(emailHeader.locator('h1')).toBeVisible();
  313 |       await expect(emailHeader.locator('span.font-semibold')).toBeVisible();
  314 |       await expect(emailHeader.locator('span.whitespace-nowrap')).toBeVisible();
  315 |     });
  316 | 
  317 |     test('should display email body content', async ({ page }) => {
  318 |       const emailBody = page.locator('pc-email-body');
  319 |       await expect(emailBody).toBeVisible();
  320 |       
  321 |       // Check that body content is loaded
  322 |       await expect(emailBody.locator('.prose')).toBeVisible();
  323 |     });
  324 |   });
  325 | 
  326 |   test.describe('Email Actions', () => {
  327 |     test.beforeEach(async ({ page }) => {
  328 |       // Select folder and email
  329 |       await page.locator('pc-email-folder-list').getByText('Inbox').click();
  330 |       await page.waitForLoadState('networkidle');
  331 |       
  332 |       const firstEmail = page.locator('pc-email-list li').first();
  333 |       await firstEmail.click();
  334 |       await page.waitForLoadState('networkidle');
  335 |     });
  336 | 
  337 |     test('should toggle favorite status', async ({ page }) => {
  338 |       const favoriteButton = page.locator('[data-testid="favorite-button"]');
  339 |       await expect(favoriteButton).toBeVisible();
  340 |       
  341 |       // Click to toggle
  342 |       await favoriteButton.click();
```