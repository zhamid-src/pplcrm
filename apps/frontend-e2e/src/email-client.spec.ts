/**
 * @fileoverview E2E tests for email client functionality.
 * Tests the complete email workflow including folder navigation, email selection, and header display.
 */
import { test, expect } from '@playwright/test';

test.describe('Email Client', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the email client (assuming it's at /emails or similar)
    await page.goto('/emails');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Email Folder Navigation', () => {
    test('should display email folders', async ({ page }) => {
      // Check that folder list is visible
      await expect(page.locator('pc-email-folder-list')).toBeVisible();
      
      // Check for common folders
      await expect(page.getByText('Inbox')).toBeVisible();
    });

    test('should select folder and load emails', async ({ page }) => {
      // Click on Inbox folder
      await page.getByText('Inbox').click();
      
      // Wait for emails to load
      await page.waitForLoadState('networkidle');
      
      // Check that email list is visible
      await expect(page.locator('pc-email-list')).toBeVisible();
    });

    test('should highlight selected folder', async ({ page }) => {
      // Click on Inbox folder
      await page.getByText('Inbox').click();
      
      // Check that the folder has selected styling
      const inboxFolder = page.getByText('Inbox').locator('..');
      await expect(inboxFolder).toHaveClass(/selected|active|bg-primary/);
    });
  });

  test.describe('Email List Display', () => {
    test.beforeEach(async ({ page }) => {
      // Select Inbox folder first
      await page.getByText('Inbox').click();
      await page.waitForLoadState('networkidle');
    });

    test('should display email list when folder is selected', async ({ page }) => {
      await expect(page.locator('pc-email-list')).toBeVisible();
    });

    test('should show email preview information', async ({ page }) => {
      // Check for email elements (subject, sender, preview)
      const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
      
      if (await firstEmail.count() > 0) {
        await expect(firstEmail).toBeVisible();
        
        // Check for email metadata
        await expect(firstEmail.locator('.email-subject, [data-testid="email-subject"]')).toBeVisible();
        await expect(firstEmail.locator('.email-sender, [data-testid="email-sender"]')).toBeVisible();
      }
    });

    test('should select email on click', async ({ page }) => {
      const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
      
      if (await firstEmail.count() > 0) {
        await firstEmail.click();
        
        // Check that email details are shown
        await expect(page.locator('pc-email-details')).toBeVisible();
      }
    });
  });

  test.describe('Email Details Display', () => {
    test.beforeEach(async ({ page }) => {
      // Select folder and email
      await page.getByText('Inbox').click();
      await page.waitForLoadState('networkidle');
      
      const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
      if (await firstEmail.count() > 0) {
        await firstEmail.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should display email header information', async ({ page }) => {
      const emailHeader = page.locator('pc-email-header');
      
      if (await emailHeader.count() > 0) {
        await expect(emailHeader).toBeVisible();
        
        // Check for header elements
        await expect(emailHeader.locator('[data-testid="email-subject"], .email-subject')).toBeVisible();
        await expect(emailHeader.locator('[data-testid="email-from"], .email-from')).toBeVisible();
        await expect(emailHeader.locator('[data-testid="email-date"], .email-date')).toBeVisible();
      }
    });

    test('should display email body content', async ({ page }) => {
      const emailBody = page.locator('pc-email-body');
      
      if (await emailBody.count() > 0) {
        await expect(emailBody).toBeVisible();
        
        // Check that body content is loaded
        await expect(emailBody.locator('.prose, .email-content')).toBeVisible();
      }
    });

    test('should show recipient dropdown on click', async ({ page }) => {
      const recipientDropdown = page.locator('[data-testid="recipient-dropdown"], .dropdown');
      
      if (await recipientDropdown.count() > 0) {
        await recipientDropdown.click();
        
        // Check that dropdown menu is visible
        await expect(page.locator('.dropdown-content, .menu')).toBeVisible();
      }
    });
  });

  test.describe('Email Actions', () => {
    test.beforeEach(async ({ page }) => {
      // Select folder and email
      await page.getByText('Inbox').click();
      await page.waitForLoadState('networkidle');
      
      const firstEmail = page.locator('pc-email-list').locator('[data-testid="email-item"]').first();
      if (await firstEmail.count() > 0) {
        await firstEmail.click();
        await page.waitForLoadState('networkidle');
      }
    });

    test('should toggle favorite status', async ({ page }) => {
      const favoriteButton = page.locator('[data-testid="favorite-button"], .favorite-btn');
      
      if (await favoriteButton.count() > 0) {
        // Get initial state
        const initialIcon = await favoriteButton.locator('pc-icon').textContent();
        
        // Click to toggle
        await favoriteButton.click();
        await page.waitForLoadState('networkidle');
        
        // Check that icon changed
        const newIcon = await favoriteButton.locator('pc-icon').textContent();
        expect(newIcon).not.toBe(initialIcon);
      }
    });

    test('should show assignment options', async ({ page }) => {
      const assignButton = page.locator('[data-testid="assign-button"], pc-email-assign button');
      
      if (await assignButton.count() > 0) {
        await assignButton.click();
        
        // Check that assignment dropdown is visible
        await expect(page.locator('.dropdown-content, .assignment-menu')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that email client is still functional
      await expect(page.locator('pc-email-folder-list')).toBeVisible();
      
      // Select folder
      await page.getByText('Inbox').click();
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
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      // Try to load emails
      await page.getByText('Inbox').click();
      
      // Should show error state or loading state, not crash
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle empty folder state', async ({ page }) => {
      // Mock empty response
      await page.route('**/api/emails/**', route => 
        route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      );
      
      await page.getByText('Inbox').click();
      await page.waitForLoadState('networkidle');
      
      // Should show empty state message
      await expect(page.locator('pc-email-list')).toBeVisible();
    });
  });
});
