const { test, expect } = require('@playwright/test');

test.describe('Notification Settings Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    
    // Navigate to settings page
    await page.click('a:has-text("设置")');
  });

  test('should display notification settings', async ({ page }) => {
    await expect(page.locator('h2:has-text("通知设置")')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="notify_days_before"]')).toBeVisible();
  });

  test('should update email notification settings', async ({ page }) => {
    // Update email
    await page.fill('input[name="email"]', 'newemail@example.com');
    
    // Update notification days
    await page.fill('input[name="notify_days_before"]', '5');
    
    // Enable email notifications
    await page.check('input[name="email_notifications"]');
    
    // Save settings
    await page.click('button:has-text("保存设置")');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('should toggle browser notifications', async ({ page }) => {
    // Get initial state
    const initialChecked = await page.isChecked('input[name="browser_notifications"]');
    
    // Toggle browser notifications
    if (initialChecked) {
      await page.uncheck('input[name="browser_notifications"]');
    } else {
      await page.check('input[name="browser_notifications"]');
    }
    
    // Save settings
    await page.click('button:has-text("保存设置")');
    
    // Verify change was saved
    await page.reload();
    const newChecked = await page.isChecked('input[name="browser_notifications"]');
    expect(newChecked).toBe(!initialChecked);
  });

  test('should display upcoming payment reminders', async ({ page }) => {
    // Navigate to reminders section
    await page.click('a:has-text("提醒")');
    
    // Verify reminders are displayed
    await expect(page.locator('.reminders-list')).toBeVisible();
    await expect(page.locator('.reminder-item')).toHaveCount({ min: 0 });
  });

  test('should test email notification', async ({ page }) => {
    // Click test email button
    await page.click('button:has-text("发送测试邮件")');
    
    // Verify success message
    await expect(page.locator('.success-message:has-text("测试邮件已发送")')).toBeVisible();
  });
});

test.describe('User Profile Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    
    // Navigate to profile page
    await page.click('a:has-text("个人资料")');
  });

  test('should display user profile', async ({ page }) => {
    await expect(page.locator('h1:has-text("个人资料")')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should update user profile', async ({ page }) => {
    // Update full name
    await page.fill('input[name="full_name"]', 'Test User Updated');
    
    // Save changes
    await page.click('button:has-text("更新资料")');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Verify changes were saved
    await page.reload();
    const fullName = await page.inputValue('input[name="full_name"]');
    expect(fullName).toBe('Test User Updated');
  });

  test('should change password', async ({ page }) => {
    // Click change password button
    await page.click('button:has-text("修改密码")');
    
    // Fill password change form
    await page.fill('input[name="current_password"]', 'TestPass123!');
    await page.fill('input[name="new_password"]', 'NewTestPass123!');
    await page.fill('input[name="confirm_password"]', 'NewTestPass123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success message
    await expect(page.locator('.success-message:has-text("密码已更新")')).toBeVisible();
  });
});

test.describe('Data Import/Export Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test('should import subscriptions from CSV', async ({ page }) => {
    // Navigate to import page
    await page.click('button:has-text("导入数据")');
    
    // Create a test CSV file
    const csvContent = `name,amount,billing_cycle,start_date,category
Test Import Sub,29.99,monthly,2024-01-01,娱乐
Another Import,19.99,yearly,2024-01-01,工具`;
    
    // Upload CSV file
    await page.setInputFiles('input[type="file"]', {
      name: 'test-import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Click import button
    await page.click('button:has-text("开始导入")');
    
    // Verify success message
    await expect(page.locator('.success-message:has-text("导入成功")')).toBeVisible();
    
    // Verify subscriptions were imported
    await expect(page.locator('text=Test Import Sub')).toBeVisible();
    await expect(page.locator('text=Another Import')).toBeVisible();
  });

  test('should export all data', async ({ page }) => {
    // Navigate to settings
    await page.click('a:has-text("设置")');
    
    // Start waiting for download
    const downloadPromise = page.waitForEvent('download');
    
    // Click export all data button
    await page.click('button:has-text("导出所有数据")');
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('subscription_data');
    expect(download.suggestedFilename()).toMatch(/\.(csv|json)$/);
  });
});