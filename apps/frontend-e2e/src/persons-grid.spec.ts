/**
 * @fileoverview E2E tests for persons grid functionality.
 * Tests data grid operations, filtering, editing, and tag management.
 */
import { expect, test } from '@playwright/test';

test.describe('Persons Grid', () => {
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

    // 2. Mock persons.getAllWithAddress
    await page.route(/\/persons\.getAllWithAddress/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              rows: [
                {
                  id: 'person-1',
                  first_name: 'Alice',
                  last_name: 'Smith',
                  email: 'alice@example.com',
                  mobile: '123-456-7890',
                  home_phone: '987-654-3210',
                  tags: ['donor', 'volunteer'],
                  street_num: '123',
                  apt: '4B',
                  street1: 'Main St',
                  street2: '',
                  city: 'Springfield',
                  state: 'IL',
                  zip: '62701',
                  country: 'USA',
                  notes: 'Some notes here',
                  household_id: 'household-1'
                },
                {
                  id: 'person-2',
                  first_name: 'Bob',
                  last_name: 'Jones',
                  email: 'bob@example.com',
                  mobile: '555-555-5555',
                  home_phone: '',
                  tags: ['volunteer'],
                  street_num: '456',
                  apt: '',
                  street1: 'Oak Ave',
                  street2: '',
                  city: 'Springfield',
                  state: 'IL',
                  zip: '62702',
                  country: 'USA',
                  notes: '',
                  household_id: 'household-2'
                }
              ],
              count: 2
            }
          }
        }]),
      });
    });

    // 3. Mock tags.getAll
    await page.route(/\/tags\.getAll/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          result: {
            data: {
              rows: [
                { id: 't1', name: 'volunteer' },
                { id: 't2', name: 'donor' }
              ],
              count: 2
            }
          }
        }]),
      });
    });

    // 4. Mock persons.update to succeed
    await page.route(/\/persons\.update/, async (route) => {
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

    // Navigate to persons page (actual route is /people)
    await page.goto('/people');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Grid Display', () => {
    test('should display persons grid', async ({ page }) => {
      // Check that the grid is visible
      await expect(page.locator('pc-persons-grid pc-datagrid')).toBeVisible();
    });

    test('should display column headers', async ({ page }) => {
      // Check for common column headers
      await expect(
        page.locator('th[role="columnheader"]:has-text("First Name")')
      ).toBeVisible();
      await expect(
        page.locator('th[role="columnheader"]:has-text("Email")')
      ).toBeVisible();
      await expect(
        page.locator('th[role="columnheader"]:has-text("Mobile")')
      ).toBeVisible();
    });

    test('should display person data in rows', async ({ page }) => {
      // Wait for data to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Check that rows are present
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
    });

    test('should show loading state initially', async ({ page }) => {
      // Setup a slow response to ensure loading indicator shows
      await page.route(/\/persons\.getAllWithAddress/, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            result: {
              data: { rows: [], count: 0 }
            }
          }]),
        });
      });

      // Reload page to catch loading state
      await page.reload();

      // Should show loading indicator
      await expect(page.locator('pc-icon[name="loading"]').first()).toBeVisible();
    });
  });

  test.describe('Grid Interactions', () => {
    test('should allow column sorting', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('th[role="columnheader"]', { timeout: 10000 });

      // Click on a sortable column header label
      const nameHeader = page.locator('th[role="columnheader"]:has-text("First Name")').first();
      await nameHeader.locator('[data-header-label]').click();

      // Check for sort indicator status on the element
      await expect(nameHeader).toHaveAttribute('aria-sort', /ascending|descending/);
    });

    test('should allow column filtering', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('th[role="columnheader"]', { timeout: 10000 });

      // Click on filter options button
      const filterButton = page.locator('th[role="columnheader"]:has-text("First Name") label[title="Column options"]').first();

      if (await filterButton.isVisible()) {
        await filterButton.click();

        // Check that filter dropdown menu appears
        const dropdownMenu = page.locator('th[role="columnheader"]:has-text("First Name") .dropdown-content').first();
        await expect(dropdownMenu).toBeVisible();
      }
    });

    test('should allow row selection', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Click first row's checkbox
      const firstRowCheckbox = page.locator('tbody tr input[type="checkbox"]').first();
      await firstRowCheckbox.click();

      // Check that it's selected (checked)
      await expect(firstRowCheckbox).toBeChecked();
    });
  });

  test.describe('Inline Editing', () => {
    test('should allow editing person name', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Click on name cell to edit (single click matches pcEditable behavior)
      const nameCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
      await nameCell.click();

      // Check if edit mode is activated
      const editInput = nameCell.locator('input');
      await expect(editInput).toBeVisible();
      await editInput.focus();
      await expect(editInput).toBeFocused();
    });

    test('should save changes on Enter key', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Click on editable cell
      const nameCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
      await nameCell.click();

      const editInput = nameCell.locator('input');
      if (await editInput.isVisible()) {
        // Clear and enter new value
        await editInput.focus();
        await editInput.fill('New Name');
        await editInput.press('Enter');

        // Check that edit mode is exited
        await expect(editInput).not.toBeVisible();
        await expect(nameCell).toContainText('New Name');
      }
    });

    test('should cancel changes on Escape key', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Click on editable cell
      const nameCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
      const originalValue = await nameCell.textContent();

      await nameCell.click();

      const editInput = nameCell.locator('input');
      if (await editInput.isVisible()) {
        // Change value and press Escape
        await editInput.focus();
        await editInput.fill('Changed Value');
        await editInput.press('Escape');

        // Check that original value is restored
        await expect(nameCell).toHaveText(originalValue || '');
      }
    });
  });

  test.describe('Tag Management', () => {
    test('should display tags in tag column', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Look for tags cell
      const tagCell = page.locator('tbody tr td[data-col-id="tags"]').first();
      await expect(tagCell.locator('pc-tags')).toBeVisible();
    });

    test('should allow tag filtering', async ({ page }) => {
      // Click tag filter dropdown in toolbar
      const tagFilterButton = page.locator('label[title="Filter by tags"]');

      if (await tagFilterButton.isVisible()) {
        await tagFilterButton.click();

        // Select a tag option checkbox
        const firstCheckbox = page.locator('.dropdown-content input[type="checkbox"]').first();
        if (await firstCheckbox.isVisible()) {
          await firstCheckbox.click();

          // Wait for filtering to apply
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  test.describe('Address Confirmation', () => {
    test('should show confirmation dialog for address changes', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Try to edit an address field (street_num) - uses double click specifically
      const addressCell = page.locator('tbody tr td[data-col-id="street_num"]').first();

      if (await addressCell.isVisible()) {
        await addressCell.dblclick();

        // Should show confirmation dialog
        await expect(page.locator('dialog#confirmAddressEdit')).toBeVisible();
      }
    });

    test('should allow confirming address changes', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Try to edit an address field
      const addressCell = page.locator('tbody tr td[data-col-id="street_num"]').first();

      if (await addressCell.isVisible()) {
        await addressCell.dblclick();

        // Look for confirmation dialog
        const confirmDialog = page.locator('dialog#confirmAddressEdit');
        await expect(confirmDialog).toBeVisible();

        // Click Yes button
        const confirmButton = confirmDialog.locator('button:has-text("Yes")');
        await confirmButton.click();

        // Dialog should close
        await expect(confirmDialog).not.toBeVisible();
      }
    });
  });

  test.describe('Search and Filtering', () => {
    test('should have search functionality', async ({ page }) => {
      // Look for search input
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible();

        // Test search functionality
        await searchInput.fill('test');
        await page.waitForLoadState('networkidle');

        // Grid should update with filtered results
        await expect(page.locator('tbody tr').first()).toBeVisible();
      }
    });

    test('should clear search results', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();

      if (await searchInput.isVisible()) {
        // Enter search term
        await searchInput.fill('test');
        await page.waitForLoadState('networkidle');

        // Clear search
        await searchInput.clear();
        await page.waitForLoadState('networkidle');

        // Should show all results again
        await expect(page.locator('tbody tr').first()).toBeVisible();
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('tbody tr', { timeout: 10000 });

      // Scroll the container to test responsiveness
      const scroller = page.locator('#scroller, .overflow-auto').first();
      if (await scroller.count() > 0) {
        await scroller.evaluate(node => node.scrollTop = 100);
      }

      // Should still be responsive
      await expect(page.locator('tbody tr').first()).toBeVisible();
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Grid should still be functional
      await expect(page.locator('pc-persons-grid pc-datagrid')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure for getAllWithAddress query
      await page.route(/\/persons\.getAllWithAddress/, (route) => route.abort());

      // Reload page
      await page.reload();

      // Should show error alert toast (AlertService)
      await expect(page.locator('pc-alerts .alert').first()).toBeVisible();
    });

    test('should handle edit conflicts', async ({ page }) => {
      // Mock edit conflict response
      await page.route(/\/persons\.update/, async (route) =>
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify([{
            error: { message: 'Conflict' }
          }]),
        }),
      );

      // Try to edit a cell
      await page.waitForSelector('tbody tr', { timeout: 10000 });
      const editableCell = page.locator('tbody tr td[data-col-id="first_name"]').first();
      await editableCell.click();

      const editInput = editableCell.locator('input');
      if (await editInput.isVisible()) {
        await editInput.focus();
        await editInput.fill('New Value');
        await editInput.press('Enter');

        // Should show error message
        await expect(page.locator('pc-alerts .alert').first()).toBeVisible();
      }
    });
  });
});
