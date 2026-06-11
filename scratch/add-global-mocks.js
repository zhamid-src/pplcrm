import fs from 'fs';
import path from 'path';

const files = [
  'apps/frontend-e2e/src/email-client.spec.ts',
  'apps/frontend-e2e/src/persons-grid.spec.ts',
  'apps/frontend-e2e/src/volunteer-events.spec.ts',
  'apps/frontend-e2e/src/web-forms.spec.ts'
];

const mockCode = `
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Mock global notifications, dashboard stats, and tags queries to prevent UNAUTHORIZED redirects
    await page.route(/\\/notifications\\.getUnreadCount/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: 0 } } }),
      });
    });

    await page.route(/\\/notifications\\.getLatest/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: [] } } }),
      });
    });

    await page.route(/\\/tags\\.getAllWithCounts/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: { rows: [], count: 0 } } } }),
      });
    });

    await page.route(/\\/dashboard\\.getStats/, async (route) => {
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
`;

for (const file of files) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert mockCode inside the first beforeEach hook.
  const beforeEachIndex = content.indexOf('test.beforeEach(async ({ page }) => {');
  if (beforeEachIndex === -1) {
    console.log(`Could not find beforeEach in ${file}`);
    continue;
  }

  // Find the closing bracket or insert right after the opening line
  const insertIndex = beforeEachIndex + 'test.beforeEach(async ({ page }) => {'.length;
  content = content.slice(0, insertIndex) + mockCode + content.slice(insertIndex);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Added global mocks and console logging to ${file}`);
}
