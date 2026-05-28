import { expect, test } from '@playwright/test';

test.describe('Volunteer Events', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock currentUser to bypass AuthGuard
    await page.route(/\/auth\.currentUser/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              id: 'user-1',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              role: 'user',
            }
          }
        }]),
      });
    });

    // 2. Mock persons.getAll for potential volunteers list
    await page.route(/\/persons\.getAll/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              rows: [
                {
                  id: 'person-v1',
                  first_name: 'John',
                  last_name: 'Volunteer',
                  email: 'johnv@example.com',
                }
              ],
              count: 1
            }
          }
        }]),
      });
    });
  });

  test('should display volunteer events grid', async ({ page }) => {
    // Mock volunteer.getAll
    await page.route(/\/volunteer\.getAll/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              rows: [
                {
                  id: 'event-1',
                  name: ' Weekend Door Knocking',
                  description: 'Canvassing weekend',
                  location_address: 'Central Park',
                  start_time: new Date().toISOString(),
                  end_time: new Date().toISOString(),
                  capacity: 10,
                  volunteers_count: 2,
                }
              ],
              count: 1
            }
          }
        }]),
      });
    });

    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('pc-events-grid pc-datagrid')).toBeVisible();
    await expect(page.locator('th[role="columnheader"]:has-text("Event Name")')).toBeVisible();
    await expect(page.locator('tbody tr td[data-col-id="name"]')).toContainText('Weekend Door Knocking');
  });

  test('should allow creating a new volunteer event', async ({ page }) => {
    // Mock volunteer.add mutation
    await page.route(/\/volunteer\.add/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: { id: 'event-1' }
          }
        }]),
      });
    });

    // Mock volunteer.getById query
    await page.route(/\/volunteer\.getById/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              id: 'event-1',
              name: 'Weekend Door Knocking',
              description: 'Canvassing weekend',
              location_address: 'Central Park',
              start_time: new Date().toISOString(),
              end_time: new Date().toISOString(),
              capacity: 10,
              created_at: new Date().toISOString(),
            }
          }
        }]),
      });
    });

    // Mock volunteer.getShiftsForEvent
    await page.route(/\/volunteer\.getShiftsForEvent/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: []
          }
        }]),
      });
    });

    await page.goto('/schedule/add');
    await page.waitForLoadState('networkidle');

    // Fill the configuration form
    await page.locator('#event-name').fill('Weekend Door Knocking');
    await page.locator('#event-desc').fill('Canvassing weekend');
    await page.locator('#event-location').fill('Central Park');
    
    // Fill dates
    const formatDateTimeLocal = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    await page.locator('#start-time').fill(formatDateTimeLocal(new Date()));
    await page.locator('#end-time').fill(formatDateTimeLocal(new Date()));
    await page.locator('#capacity').fill('10');
    
    // Submit
    await page.locator('button[type="submit"]:has-text("Create Event")').click();

    // Verify it saved and navigated to edit URL
    await expect(page).toHaveURL(/\/schedule\/event-1/);
    await expect(page.locator('h1')).toContainText('Weekend Door Knocking');
  });

  test('should allow roster management', async ({ page }) => {
    // Mock volunteer.getById query
    await page.route(/\/volunteer\.getById/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              id: 'event-1',
              name: 'Weekend Door Knocking',
              description: 'Canvassing weekend',
              location_address: 'Central Park',
              start_time: new Date().toISOString(),
              end_time: new Date().toISOString(),
              capacity: 10,
              created_at: new Date().toISOString(),
            }
          }
        }]),
      });
    });

    // Mock shift roster get
    let shiftList = [] as any[];
    await page.route(/\/volunteer\.getShiftsForEvent/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: shiftList
          }
        }]),
      });
    });

    // Mock signup mutation
    await page.route(/\/volunteer\.signupVolunteer/, async (route) => {
      // Update our mocked list so next fetch returns the shift
      shiftList = [{
        id: 'shift-1',
        person_id: 'person-v1',
        first_name: 'John',
        last_name: 'Volunteer',
        email: 'johnv@example.com',
        status: 'signed_up',
        hours_worked: null,
        notes: '',
      }];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: { id: 'shift-1' }
          }
        }]),
      });
    });

    // Mock updateShift mutation
    await page.route(/\/volunteer\.updateShift/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: { success: true }
          }
        }]),
      });
    });

    // Mock deleteShift mutation
    await page.route(/\/volunteer\.deleteShift/, async (route) => {
      shiftList = [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: { success: true }
          }
        }]),
      });
    });

    // 1. Visit details page
    await page.goto('/schedule/event-1');
    await page.waitForLoadState('networkidle');

    // 2. Search and add a volunteer
    await page.locator('input[placeholder*="Search volunteers"]').fill('John');
    await page.locator('.hover\\:bg-base-200').first().click();

    // Verify added to roster
    await expect(page.locator('tbody tr td:has-text("John Volunteer")')).toBeVisible();

    // 3. Edit shift details and save
    await page.locator('select').selectOption('attended');
    await page.locator('input[type="number"]').fill('3.5');
    await page.locator('input[placeholder*="Optional details"]').fill('Great volunteer work');
    await page.locator('button[title="Save shift edits"]').click();

    // Verify success toast appears (AlertService)
    await expect(page.locator('pc-alerts .alert').first()).toBeVisible();

    // 4. Remove volunteer from roster
    page.once('dialog', dialog => dialog.accept()); // Automatically confirm window confirm dialog
    await page.locator('button[title="Remove volunteer"]').click();

    // Verify roster is empty again
    await expect(page.locator('tbody tr td:has-text("No volunteers signed up")')).toBeVisible();
  });
});
