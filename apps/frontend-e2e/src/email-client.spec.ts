import { expect, test } from '@playwright/test';

test.describe('Email Client', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

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
        body: JSON.stringify({
          result: {
            data: {
              json: {
                id: 'user-1',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
                role: 'user',
              },
            },
          },
        }),
      });
    });

    // 2. Mock auth.getUsers
    await page.route(/\/users\.getUsers/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: [
                {
                  id: 'user-1',
                  email: 'test@example.com',
                  first_name: 'Test',
                  last_name: 'User',
                  role: 'user',
                },
              ],
            },
          },
        }),
      });
    });

    // 3. Mock emails.getFoldersWithCounts and emails.getFolders
    await page.route(/\/emails\.getFolders/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: [
                {
                  id: 'inbox-folder',
                  name: 'Inbox',
                  icon: 'inbox',
                  sort_order: 1,
                  is_default: true,
                  is_virtual: false,
                  email_count: 2,
                },
                {
                  id: 'sent-folder',
                  name: 'Sent',
                  icon: 'paper-airplane',
                  sort_order: 2,
                  is_default: false,
                  is_virtual: false,
                  email_count: 0,
                },
              ],
            },
          },
        }),
      });
    });

    // 4. Mock emails.getEmails
    await page.route(/\/emails\.getEmails/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: [
                {
                  id: 'email-1',
                  folder_id: 'inbox-folder',
                  from_email: 'sender1@example.com',
                  from_name: 'John Sender',
                  to_email: 'test@example.com',
                  subject: 'Hello World',
                  preview: 'This is a preview of the email content...',
                  assigned_to: null,
                  updated_at: '2026-05-20T00:00:00.000Z',
                  is_favourite: false,
                  attachment_count: 0,
                  has_attachment: false,
                  status: 'open',
                },
                {
                  id: 'email-2',
                  folder_id: 'inbox-folder',
                  from_email: 'sender2@example.com',
                  from_name: 'Jane Sender',
                  to_email: 'test@example.com',
                  subject: 'Important Meeting',
                  preview: 'Just checking in about the meeting today.',
                  assigned_to: null,
                  updated_at: '2026-05-20T01:00:00.000Z',
                  is_favourite: true,
                  attachment_count: 1,
                  has_attachment: true,
                  status: 'open',
                },
              ],
            },
          },
        }),
      });
    });

    // 5. Mock emails.hasAttachmentByEmailIds
    await page.route(/\/emails\.hasAttachmentByEmailIds/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: [
                { email_id: 'email-1', has: false },
                { email_id: 'email-2', has: true },
              ],
            },
          },
        }),
      });
    });

    // 6. Mock emails.getEmailWithHeaders
    await page.route(/\/emails\.getEmailWithHeaders/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              json: {
                email: {
                  id: 'email-1',
                  folder_id: 'inbox-folder',
                  from_email: 'sender1@example.com',
                  from_name: 'John Sender',
                  to_email: 'test@example.com',
                  subject: 'Hello World',
                  preview: 'This is a preview of the email content...',
                  assigned_to: null,
                  updated_at: '2026-05-20T00:00:00.000Z',
                  is_favourite: false,
                  attachment_count: 0,
                  has_attachment: false,
                  status: 'open',
                  to_list: [{ email: 'test@example.com', name: 'Test User' }],
                  cc_list: [],
                  bcc_list: [],
                },
                comments: [],
              },
            },
          },
        }),
      });
    });

    // 7. Mock emails.getEmailBody
    await page.route(/\/emails\.getEmailBody/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: '<p>This is the full body content of the email.</p>' } } }),
      });
    });

    // 8. Mock emails.setFavourite
    await page.route(/\/emails\.setFavourite/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: { success: true } } } }),
      });
    });

    // 9. Mock emails.assign
    await page.route(/\/emails\.assign/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: { success: true } } } }),
      });
    });

    // Mock emails.setEmailReadStatus
    await page.route(/\/emails\.setEmailReadStatus/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { data: { json: { success: true } } } }),
      });
    });

    // Navigate to email client (actual route is /inbox)
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');

    // Expand the Folders list section since real folders are collapsed by default
    await page.locator('pc-email-folder-list').getByText('Folders').click();
  });

  test.describe('Email Folder Navigation', () => {
    test('should display email folders', async ({ page }) => {
      // Check that folder list is visible
      await expect(page.locator('pc-email-folder-list')).toBeVisible();

      // Check for common folders
      await expect(page.locator('pc-email-folder-list').getByText('Inbox')).toBeVisible();
    });

    test('should select folder and load emails', async ({ page }) => {
      // Click on Inbox folder
      await page.locator('pc-email-folder-list').getByText('Inbox').click();

      // Wait for emails to load
      await page.waitForLoadState('networkidle');

      // Check that email list is visible
      await expect(page.locator('pc-email-list')).toBeVisible();
    });

    test('should highlight selected folder', async ({ page }) => {
      // Click on Inbox folder
      await page.locator('pc-email-folder-list').getByText('Inbox').click();

      // Check that the folder has selected styling (bg-primary)
      const inboxFolder = page.locator('pc-email-folder-list li:has-text("Inbox")');
      await expect(inboxFolder).toHaveClass(/bg-primary/);
    });
  });

  test.describe('Email List Display', () => {
    test.beforeEach(async ({ page }) => {
      // Select Inbox folder first
      await page.locator('pc-email-folder-list').getByText('Inbox').click();
      await page.waitForLoadState('networkidle');
    });

    test('should display email list when folder is selected', async ({ page }) => {
      await expect(page.locator('pc-email-list')).toBeVisible();
    });

    test('should show email preview information', async ({ page }) => {
      // Check for email elements (subject, sender, preview)
      const firstEmail = page.locator('pc-email-list ul.email-scrollbar > li').first();
      await expect(firstEmail).toBeVisible();

      // Check for email metadata
      await expect(firstEmail.getByText('sender2@example.com')).toBeVisible();
      await expect(firstEmail.getByText('Important Meeting')).toBeVisible();
      await expect(firstEmail.getByText('Just checking in about the meeting today.')).toBeVisible();
    });

    test('should select email on click', async ({ page }) => {
      const firstEmail = page.locator('pc-email-list ul.email-scrollbar > li').first();
      await firstEmail.click();

      // Check that email details are shown
      await expect(page.locator('pc-email-details')).toBeVisible();
    });
  });

  test.describe('Email Details Display', () => {
    test.beforeEach(async ({ page }) => {
      // Select folder and email
      await page.locator('pc-email-folder-list').getByText('Inbox').click();
      await page.waitForLoadState('networkidle');

      const firstEmail = page.locator('pc-email-list ul.email-scrollbar > li').first();
      await firstEmail.click();
      await page.waitForLoadState('networkidle');
    });

    test('should display email header information', async ({ page }) => {
      const emailHeader = page.locator('pc-email-header');
      await expect(emailHeader).toBeVisible();

      // Check for header elements
      await expect(emailHeader.locator('h1')).toBeVisible();
      await expect(emailHeader.locator('span.font-semibold')).toBeVisible();
      await expect(emailHeader.locator('span.whitespace-nowrap')).toBeVisible();
    });

    test('should display email body content', async ({ page }) => {
      const emailBody = page.locator('pc-email-body');
      await expect(emailBody).toBeVisible();

      // Check that body content is loaded
      await expect(emailBody.locator('.prose')).toBeVisible();
    });
  });

  test.describe('Email Actions', () => {
    test.beforeEach(async ({ page }) => {
      // Select folder and email
      await page.locator('pc-email-folder-list').getByText('Inbox').click();
      await page.waitForLoadState('networkidle');

      const firstEmail = page.locator('pc-email-list ul.email-scrollbar > li').first();
      await firstEmail.click();
      await page.waitForLoadState('networkidle');
    });

    test('should toggle favorite status', async ({ page }) => {
      const favoriteButton = page.locator('[data-testid="favorite-button"]');
      await expect(favoriteButton).toBeVisible();

      // Click to toggle
      await favoriteButton.click();
      await page.waitForLoadState('networkidle');
    });

    test('should show assignment options', async ({ page }) => {
      const assignButton = page.locator('pc-email-assign .dropdown .badge');
      await expect(assignButton).toBeVisible();

      await assignButton.click();

      // Check that assignment dropdown is visible
      await expect(page.locator('pc-email-assign .dropdown-content')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that email client components are visible
      await expect(page.locator('pc-email-folder-list')).toBeVisible();

      // Select folder
      await page.locator('pc-email-folder-list').getByText('Inbox').click();
      await page.waitForLoadState('networkidle');

      // Check that email list is visible
      await expect(page.locator('pc-email-list')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check that all components are visible
      await expect(page.locator('pc-email-folder-list')).toBeVisible();
      await expect(page.locator('pc-email-list')).toBeVisible();
      await expect(page.locator('pc-email-details')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure on getEmails
      await page.route(/\/emails\.getEmails/, (route) => route.abort());

      // Select folder to trigger loading emails which fails
      await page.locator('pc-email-folder-list').getByText('Inbox').click();
      await page.waitForLoadState('networkidle');

      // Should show error alert toast
      await expect(page.locator('pc-alerts .alert').first()).toBeVisible();
    });

    test('should handle empty folder state', async ({ page }) => {
      // Mock empty emails list
      await page.route(/\/emails\.getEmails/, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ result: { data: { json: [] } } }),
        }),
      );

      // Reload page and click Inbox
      await page.reload();
      await page.locator('pc-email-folder-list').getByText('Folders').click();
      await page.locator('pc-email-folder-list').getByText('Inbox').click();
      await page.waitForLoadState('networkidle');

      // No email list items should be shown, or empty state should display
      await expect(page.locator('pc-email-list ul.email-scrollbar > li')).toHaveCount(0);
    });
  });
});
