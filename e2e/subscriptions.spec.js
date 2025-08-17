const { test, expect } = require('@playwright/test');

test.describe('Subscription Management Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should display subscriptions dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/订阅|Subscription/i);
    await expect(page.locator('.subscription-list')).toBeVisible();
  });

  test('should add a new subscription', async ({ page }) => {
    // Click add subscription button
    await page.click('button:has-text("添加订阅")');
    
    // Fill subscription form
    await page.fill('input[name="name"]', 'Netflix Test');
    await page.fill('input[name="amount"]', '99.99');
    await page.selectOption('select[name="billing_cycle"]', 'monthly');
    await page.fill('input[name="start_date"]', '2024-01-01');
    await page.fill('input[name="next_payment_date"]', '2024-02-01');
    await page.selectOption('select[name="category"]', '娱乐');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify subscription was added
    await expect(page.locator('text=Netflix Test')).toBeVisible();
  });

  test('should edit existing subscription', async ({ page }) => {
    // Find and click edit button for first subscription
    await page.click('.subscription-item button:has-text("编辑")');
    
    // Update subscription details
    await page.fill('input[name="amount"]', '149.99');
    
    // Save changes
    await page.click('button:has-text("保存")');
    
    // Verify changes were saved
    await expect(page.locator('text=149.99')).toBeVisible();
  });

  test('should delete subscription', async ({ page }) => {
    // Count initial subscriptions
    const initialCount = await page.locator('.subscription-item').count();
    
    // Click delete button for first subscription
    await page.click('.subscription-item button:has-text("删除")');
    
    // Confirm deletion
    await page.click('button:has-text("确认")');
    
    // Verify subscription was deleted
    const finalCount = await page.locator('.subscription-item').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should filter subscriptions by status', async ({ page }) => {
    // Select active filter
    await page.selectOption('select[name="status-filter"]', 'active');
    
    // Verify only active subscriptions are shown
    const activeItems = await page.locator('.subscription-item.active').count();
    const totalItems = await page.locator('.subscription-item').count();
    expect(activeItems).toBe(totalItems);
    
    // Select inactive filter
    await page.selectOption('select[name="status-filter"]', 'inactive');
    
    // Verify only inactive subscriptions are shown
    const inactiveItems = await page.locator('.subscription-item.inactive').count();
    const newTotalItems = await page.locator('.subscription-item').count();
    expect(inactiveItems).toBe(newTotalItems);
  });

  test('should search subscriptions', async ({ page }) => {
    // Enter search term
    await page.fill('input[name="search"]', 'Netflix');
    
    // Verify search results
    const searchResults = await page.locator('.subscription-item').count();
    const allHaveNetflix = await page.locator('.subscription-item').evaluateAll((items) => {
      return items.every(item => item.textContent.includes('Netflix'));
    });
    
    expect(allHaveNetflix).toBe(true);
  });

  test('should display subscription statistics', async ({ page }) => {
    // Navigate to statistics page
    await page.click('a:has-text("统计")');
    
    // Verify statistics are displayed
    await expect(page.locator('.total-monthly-cost')).toBeVisible();
    await expect(page.locator('.total-yearly-cost')).toBeVisible();
    await expect(page.locator('.subscription-count')).toBeVisible();
  });

  test('should export subscriptions to CSV', async ({ page }) => {
    // Start waiting for download
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("导出CSV")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('subscriptions');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});