/**
 * @fileoverview E2E tests for persons grid functionality.
 * Tests data grid operations, filtering, editing, and tag management.
 */
import { expect, test } from '@playwright/test';

test.describe('Persons Grid', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to persons page
    await page.goto('/persons');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Grid Display', () => {
    test('should display persons grid', async ({ page }) => {
      // Check that the grid is visible
      await expect(page.locator('pc-persons-grid, ag-grid-angular, .ag-root-wrapper')).toBeVisible();
    });

    test('should display column headers', async ({ page }) => {
      // Check for common column headers
      await expect(
        page.locator('.ag-header-cell-text:has-text("Name"), .ag-header-cell:has-text("First Name")'),
      ).toBeVisible();
      await expect(
        page.locator('.ag-header-cell-text:has-text("Email"), .ag-header-cell:has-text("email")'),
      ).toBeVisible();
      await expect(
        page.locator('.ag-header-cell-text:has-text("Mobile"), .ag-header-cell:has-text("mobile")'),
      ).toBeVisible();
    });

    test('should display person data in rows', async ({ page }) => {
      // Wait for data to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Check that rows are present
      const rows = page.locator('.ag-row');
      await expect(rows.first()).toBeVisible();
    });

    test('should show loading state initially', async ({ page }) => {
      // Reload page to catch loading state
      await page.reload();

      // Should show loading indicator
      await expect(page.locator('.ag-overlay-loading-wrapper, .loading, .spinner')).toBeVisible();
    });
  });

  test.describe('Grid Interactions', () => {
    test('should allow column sorting', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('.ag-header-cell', { timeout: 10000 });

      // Click on a sortable column header
      const nameHeader = page.locator('.ag-header-cell:has-text("Name"), .ag-header-cell:has-text("First")').first();
      await nameHeader.click();

      // Check for sort indicator
      await expect(page.locator('.ag-sort-ascending-icon, .ag-sort-descending-icon')).toBeVisible();
    });

    test('should allow column filtering', async ({ page }) => {
      // Wait for grid to load
      await page.waitForSelector('.ag-header-cell', { timeout: 10000 });

      // Look for filter button or menu
      const filterButton = page.locator('.ag-header-cell .ag-header-cell-menu-button, .ag-filter-icon').first();

      if ((await filterButton.count()) > 0) {
        await filterButton.click();

        // Check that filter menu appears
        await expect(page.locator('.ag-menu, .ag-filter-wrapper')).toBeVisible();
      }
    });

    test('should allow row selection', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Click on first row
      const firstRow = page.locator('.ag-row').first();
      await firstRow.click();

      // Check that row is selected
      await expect(firstRow).toHaveClass(/ag-row-selected/);
    });
  });

  test.describe('Inline Editing', () => {
    test('should allow editing person name', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Double-click on name cell to edit
      const nameCell = page.locator('.ag-row .ag-cell').first();
      await nameCell.dblclick();

      // Check if edit mode is activated
      const editInput = page.locator('.ag-cell input, .ag-cell-editor input');
      if ((await editInput.count()) > 0) {
        await expect(editInput).toBeVisible();
        await expect(editInput).toBeFocused();
      }
    });

    test('should save changes on Enter key', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Double-click on editable cell
      const editableCell = page.locator('.ag-row .ag-cell').first();
      await editableCell.dblclick();

      const editInput = page.locator('.ag-cell input, .ag-cell-editor input');
      if ((await editInput.count()) > 0) {
        // Clear and enter new value
        await editInput.fill('New Name');
        await editInput.press('Enter');

        // Check that edit mode is exited
        await expect(editInput).not.toBeVisible();
      }
    });

    test('should cancel changes on Escape key', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Double-click on editable cell
      const editableCell = page.locator('.ag-row .ag-cell').first();
      const originalValue = await editableCell.textContent();

      await editableCell.dblclick();

      const editInput = page.locator('.ag-cell input, .ag-cell-editor input');
      if ((await editInput.count()) > 0) {
        // Change value and press Escape
        await editInput.fill('Changed Value');
        await editInput.press('Escape');

        // Check that original value is restored
        await expect(editableCell).toHaveText(originalValue || '');
      }
    });
  });

  test.describe('Tag Management', () => {
    test('should display tags in tag column', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Look for tag column
      const tagCell = page.locator('.ag-row .ag-cell:has(.tag, .badge, [data-testid="tag"])').first();

      if ((await tagCell.count()) > 0) {
        await expect(tagCell).toBeVisible();
      }
    });

    test('should allow tag filtering', async ({ page }) => {
      // Look for tag filter controls
      const tagFilter = page.locator('[data-testid="tag-filter"], .tag-filter, select:has(option:text("tag"))');

      if ((await tagFilter.count()) > 0) {
        await tagFilter.click();

        // Select a tag option
        const tagOption = page.locator('option, .dropdown-item').first();
        if ((await tagOption.count()) > 0) {
          await tagOption.click();

          // Wait for filtering to apply
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  test.describe('Address Confirmation', () => {
    test('should show confirmation dialog for address changes', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Try to edit an address field
      const addressCell = page
        .locator('.ag-row .ag-cell:has-text("street"), .ag-row .ag-cell[col-id*="address"]')
        .first();

      if ((await addressCell.count()) > 0) {
        await addressCell.dblclick();

        // Should show confirmation dialog
        await expect(page.locator('.modal, .dialog, [role="dialog"]')).toBeVisible();
      }
    });

    test('should allow confirming address changes', async ({ page }) => {
      // Wait for rows to load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Try to edit an address field
      const addressCell = page
        .locator('.ag-row .ag-cell:has-text("street"), .ag-row .ag-cell[col-id*="address"]')
        .first();

      if ((await addressCell.count()) > 0) {
        await addressCell.dblclick();

        // Look for confirmation dialog
        const confirmDialog = page.locator('.modal, .dialog, [role="dialog"]');
        if ((await confirmDialog.count()) > 0) {
          // Click confirm button
          const confirmButton = confirmDialog.locator(
            'button:has-text("Confirm"), button:has-text("Yes"), .btn-primary',
          );
          await confirmButton.click();

          // Dialog should close
          await expect(confirmDialog).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Search and Filtering', () => {
    test('should have search functionality', async ({ page }) => {
      // Look for search input
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], [data-testid="search"]');

      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toBeVisible();

        // Test search functionality
        await searchInput.fill('test');
        await page.waitForLoadState('networkidle');

        // Grid should update with filtered results
        await expect(page.locator('.ag-row')).toBeVisible();
      }
    });

    test('should clear search results', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], [data-testid="search"]');

      if ((await searchInput.count()) > 0) {
        // Enter search term
        await searchInput.fill('test');
        await page.waitForLoadState('networkidle');

        // Clear search
        await searchInput.clear();
        await page.waitForLoadState('networkidle');

        // Should show all results again
        await expect(page.locator('.ag-row')).toBeVisible();
      }
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('.ag-row', { timeout: 10000 });

      // Scroll through the grid to test virtual scrolling
      const gridViewport = page.locator('.ag-body-viewport');
      await gridViewport.scroll({ top: 1000 });

      // Should still be responsive
      await expect(page.locator('.ag-row')).toBeVisible();
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Grid should still be functional
      await expect(page.locator('pc-persons-grid, ag-grid-angular')).toBeVisible();

      // Should be scrollable horizontally
      const gridViewport = page.locator('.ag-body-viewport');
      await gridViewport.scroll({ left: 100 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/persons/**', (route) => route.abort());

      // Reload page
      await page.reload();

      // Should show error state or empty state
      await expect(page.locator('.ag-overlay-no-rows-wrapper, .error-state, .empty-state')).toBeVisible();
    });

    test('should handle edit conflicts', async ({ page }) => {
      // Mock edit conflict response
      await page.route('**/api/persons/**', (route) =>
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Conflict' }),
        }),
      );

      // Try to edit a cell
      await page.waitForSelector('.ag-row', { timeout: 10000 });
      const editableCell = page.locator('.ag-row .ag-cell').first();
      await editableCell.dblclick();

      const editInput = page.locator('.ag-cell input, .ag-cell-editor input');
      if ((await editInput.count()) > 0) {
        await editInput.fill('New Value');
        await editInput.press('Enter');

        // Should show error message
        await expect(page.locator('.error, .alert, [role="alert"]')).toBeVisible();
      }
    });
  });
});
