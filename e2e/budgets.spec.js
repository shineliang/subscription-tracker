const { test, expect } = require('@playwright/test');

test.describe('Budget Management Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    
    // Navigate to budgets page
    await page.click('a:has-text("预算")');
  });

  test('should display budgets page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/预算|Budget/i);
    await expect(page.locator('.budget-list')).toBeVisible();
  });

  test('should create a monthly budget', async ({ page }) => {
    // Click add budget button
    await page.click('button:has-text("添加预算")');
    
    // Fill budget form
    await page.fill('input[name="name"]', '月度总预算');
    await page.selectOption('select[name="type"]', 'total');
    await page.selectOption('select[name="period"]', 'monthly');
    await page.fill('input[name="amount"]', '5000');
    await page.fill('input[name="warning_threshold"]', '80');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify budget was created
    await expect(page.locator('text=月度总预算')).toBeVisible();
    await expect(page.locator('text=¥5000')).toBeVisible();
  });

  test('should create a category budget', async ({ page }) => {
    // Click add budget button
    await page.click('button:has-text("添加预算")');
    
    // Fill budget form
    await page.fill('input[name="name"]', '娱乐预算');
    await page.selectOption('select[name="type"]', 'category');
    await page.selectOption('select[name="period"]', 'monthly');
    await page.selectOption('select[name="category"]', '娱乐');
    await page.fill('input[name="amount"]', '1000');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify budget was created
    await expect(page.locator('text=娱乐预算')).toBeVisible();
  });

  test('should display budget usage', async ({ page }) => {
    // Verify budget usage indicators are visible
    await expect(page.locator('.budget-progress-bar')).toBeVisible();
    await expect(page.locator('.budget-usage-percentage')).toBeVisible();
    await expect(page.locator('.budget-remaining')).toBeVisible();
  });

  test('should show budget warning when threshold exceeded', async ({ page }) => {
    // Create a budget with low amount to trigger warning
    await page.click('button:has-text("添加预算")');
    await page.fill('input[name="name"]', '测试预算');
    await page.selectOption('select[name="type"]', 'total');
    await page.selectOption('select[name="period"]', 'monthly');
    await page.fill('input[name="amount"]', '100'); // Low amount
    await page.fill('input[name="warning_threshold"]', '50');
    await page.click('button[type="submit"]');
    
    // Check for warning indicator
    await expect(page.locator('.budget-warning')).toBeVisible();
  });

  test('should edit budget', async ({ page }) => {
    // Click edit button for first budget
    await page.click('.budget-item button:has-text("编辑")');
    
    // Update budget amount
    await page.fill('input[name="amount"]', '8000');
    
    // Save changes
    await page.click('button:has-text("保存")');
    
    // Verify changes were saved
    await expect(page.locator('text=¥8000')).toBeVisible();
  });

  test('should delete budget', async ({ page }) => {
    // Count initial budgets
    const initialCount = await page.locator('.budget-item').count();
    
    // Click delete button for first budget
    await page.click('.budget-item button:has-text("删除")');
    
    // Confirm deletion
    await page.click('button:has-text("确认")');
    
    // Verify budget was deleted
    const finalCount = await page.locator('.budget-item').count();
    expect(finalCount).toBe(initialCount - 1);
  });

  test('should display budget history', async ({ page }) => {
    // Click on a budget to view details
    await page.click('.budget-item');
    
    // Verify history is displayed
    await expect(page.locator('.budget-history')).toBeVisible();
    await expect(page.locator('.history-item')).toHaveCount({ min: 1 });
  });

  test('should show budget alerts', async ({ page }) => {
    // Navigate to alerts section
    await page.click('a:has-text("预算警报")');
    
    // Verify alerts are displayed
    await expect(page.locator('.budget-alerts')).toBeVisible();
    
    // Mark an alert as read
    const unreadAlerts = await page.locator('.alert-unread').count();
    if (unreadAlerts > 0) {
      await page.click('.alert-unread button:has-text("标记已读")');
      
      // Verify alert was marked as read
      const newUnreadCount = await page.locator('.alert-unread').count();
      expect(newUnreadCount).toBe(unreadAlerts - 1);
    }
  });
});