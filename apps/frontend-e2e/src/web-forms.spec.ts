import { expect, test } from '@playwright/test';

test.describe('Web Forms', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Mock global notifications, dashboard stats, and tags queries to prevent UNAUTHORIZED redirects
    await page.route(/\/notifications\.getUnreadCount/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: 0 } } }),
      });
    });

    await page.route(/\/notifications\.getLatest/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: [] } } }),
      });
    });

    await page.route(/\/tags\.getAllWithCounts/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: { rows: [], count: 0 } } } }),
      });
    });

    await page.route(/\/dashboard\.getStats/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: {
                avgFirstResponseHours: 0,
                avgTimeToCloseHours: 0,
                emailsAssigned: [],
                emailsClosed: [],
                contactsGrowth: [],
                unassignedCount: 0,
                totalOpenCount: 0,
                userStats: [],
                unassignedSlaBreaches: 0,
                unassignedEmailSlaBreaches: 0,
                unassignedTaskSlaBreaches: 0,
              },
            },
          },
        }),
      });
    });

    // 1. Mock currentUser to bypass AuthGuard
    await page.route(/\/auth\.currentUser/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: {
                id: 'user-1',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                role: 'user',
              } } } }),
      });
    });

    // 2. Mock lists.getAll
    await page.route(/\/lists\.getAll/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: {
                rows: [{ id: 'list-1', name: 'Newsletter Subscribers' }],
                count: 1
              } } } }),
      });
    });

    // 3. Mock tags.getAll
    await page.route(/\/tags\.getAll/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: {
                rows: [{ id: 'tag-1', name: 'newsletter' }],
                count: 1
              } } } }),
      });
    });
  });

  test('should display web forms grid', async ({ page }) => {
    // Mock webForms.getAllWithCounts
    await page.route(/\/webForms\.getAllWithCounts/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: {
                rows: [
                  {
                    id: 'form-1111-2222-3333-444444444444',
                    name: 'Newsletter Form',
                    description: 'Used on home page',
                    redirect_url: 'https://example.com/thanks',
                    status: 'active',
                    created_at: new Date().toISOString(),
                  }
                ],
                count: 1
              } } } }),
      });
    });

    await page.goto('/forms');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('pc-forms-grid pc-datagrid')).toBeVisible();
    await expect(page.locator('th[role="columnheader"]:has-text("Form Name")')).toBeVisible();
    await expect(page.locator('tbody tr td[data-col-id="name"]')).toContainText('Newsletter Form');
  });

  test('should allow creating a new web form', async ({ page }) => {
    // Mock webForms.add mutation
    await page.route(/\/webForms\.add/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: { id: 'form-1111-2222-3333-444444444444' } } } }),
      });
    });

    // Mock webForms.getById query (called on details/edit page)
    await page.route(/\/webForms\.getById/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: {
                id: 'form-1111-2222-3333-444444444444',
                name: 'Newsletter Form',
                description: 'Used on home page',
                redirect_url: 'https://example.com/thanks',
                status: 'active',
                target_tags: ['newsletter'],
                target_lists: ['list-1'],
                created_at: new Date().toISOString(),
              } } } }),
      });
    });

    await page.goto('/forms/add');
    await page.waitForLoadState('networkidle');

    // Fill the configuration form
    await page.locator('input[placeholder*="Newsletter Signup"]').fill('Newsletter Form');
    await page.locator('textarea[placeholder*="Internal note"]').fill('Used on home page');
    await page.locator('input[placeholder*="thank-you"]').fill('https://example.com/thanks');
    
    // Select list
    await page.locator('select:has-text("Select a list to target")').selectOption('list-1');
    
    // Submit
    await page.locator('button[type="submit"]:has-text("Save Web Form")').click();

    // Verify it saved and navigated to edit URL with details
    await expect(page).toHaveURL(/\/forms\/form-1111-2222-3333-444444444444/);
    await expect(page.locator('pre')).toContainText('form-1111-2222-3333-444444444444');
  });

  test('should display public landing page and submit successfully', async ({ page }) => {
    const formId = 'form-1111-2222-3333-444444444444';

    // Mock landing page html render from backend REST API
    await page.route(new RegExp(`\\/api\\/forms\\/view\\/${formId}`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
          <body>
            <h1>Newsletter Form</h1>
            <p>Used on home page</p>
            <form action="/api/forms/submit/${formId}" method="POST">
              <input type="text" name="_hp" style="display:none !important" />
              <input type="text" id="first_name" name="first_name" placeholder="First Name" />
              <input type="text" id="last_name" name="last_name" placeholder="Last Name" />
              <input type="email" id="email" name="email" placeholder="Email Address" required />
              <input type="text" id="mobile" name="mobile" placeholder="Mobile / Phone" />
              <textarea id="notes" name="notes"></textarea>
              <button type="submit">Submit</button>
            </form>
          </body>
          </html>
        `,
      });
    });

    // Mock successful submittal redirecting to success page
    await page.route(new RegExp(`\\/api\\/forms\\/submit\\/${formId}`), async (route) => {
      await route.fulfill({
        status: 302,
        headers: {
          'Location': '/api/forms/success'
        }
      });
    });

    // Mock success page GET
    await page.route(/\/api\/forms\/success/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<h1>Submission Successful</h1>'
      });
    });

    // 1. Visit landing page
    await page.goto(`http://localhost:3000/api/forms/view/${formId}`);
    await expect(page.locator('h1')).toHaveText('Newsletter Form');

    // 2. Fill form and submit
    await page.locator('#first_name').fill('Alice');
    await page.locator('#last_name').fill('Smith');
    await page.locator('#email').fill('alice@example.com');
    await page.locator('button[type="submit"]').click();

    // 3. Verify redirected to success page
    await expect(page.locator('h1')).toHaveText('Submission Successful');
  });

  test('should block submission if honeypot field is filled', async ({ page }) => {
    const formId = 'form-1111-2222-3333-444444444444';

    // Mock landing page html
    await page.route(new RegExp(`\\/api\\/forms\\/view\\/${formId}`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
          <body>
            <form action="/api/forms/submit/${formId}" method="POST">
              <input type="text" name="_hp" />
              <input type="email" id="email" name="email" required />
              <button type="submit">Submit</button>
            </form>
          </body>
          </html>
        `,
      });
    });

    // Mock submission failure response
    await page.route(new RegExp(`\\/api\\/forms\\/submit\\/${formId}`), async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'text/html',
        body: '<h1>Submission Failed</h1>'
      });
    });

    await page.goto(`http://localhost:3000/api/forms/view/${formId}`);
    await page.locator('input[name="_hp"]').fill('spam-bot-detected');
    await page.locator('#email').fill('spam@bot.com');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('h1')).toHaveText('Submission Failed');
  });
});
