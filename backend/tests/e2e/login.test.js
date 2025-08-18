const { test, expect } = require('@playwright/test');

test.describe('登录功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到登录页面
    await page.goto('http://localhost:3000/login');
  });

  test('应该显示登录表单', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/订阅跟踪器/);
    
    // 检查登录表单元素
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible();
  });

  test('应该能够成功登录', async ({ page }) => {
    // 填写登录表单
    await page.fill('#username', 'admin');
    await page.fill('#password', '777888');
    
    // 点击登录按钮
    await page.getByRole('button', { name: /登录账户/ }).click();
    
    // 等待导航到仪表板
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // 验证登录成功
    await expect(page.url()).toContain('/dashboard');
    
    // 检查是否显示用户信息
    await expect(page.locator('text=admin')).toBeVisible();
  });

  test('错误的密码应该显示错误消息', async ({ page }) => {
    // 填写错误的密码
    await page.fill('#username', 'admin');
    await page.fill('#password', 'wrongpassword');
    
    // 点击登录按钮
    await page.getByRole('button', { name: /登录账户/ }).click();
    
    // 应该显示错误消息
    await expect(page.locator('text=登录失败')).toBeVisible({ timeout: 5000 });
    
    // 应该仍然在登录页面
    await expect(page.url()).toContain('/login');
  });

  test('使用演示账号按钮', async ({ page }) => {
    // 点击演示账号按钮
    await page.getByRole('button', { name: /演示账号/ }).click();
    
    // 检查是否自动填充了表单
    const usernameValue = await page.inputValue('#username');
    const passwordValue = await page.inputValue('#password');
    
    // 演示账号应该被填充
    expect(usernameValue).toBeTruthy();
    expect(passwordValue).toBeTruthy();
  });

  test('注册链接应该可以点击', async ({ page }) => {
    // 点击注册链接
    await page.click('text=立即注册');
    
    // 应该导航到注册页面
    await expect(page.url()).toContain('/register');
  });
});

test.describe('已登录用户测试', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://localhost:3000',
        localStorage: [{
          name: 'token',
          value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NTU0ODQ2MTQsImV4cCI6MTc1NjA4OTQxNH0.eH5HcJKraXCwFivd3t6cYv97mKKiW_LyruOU1-kgDo0'
        }]
      }]
    }
  });

  test('应该能够访问仪表板', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // 应该在仪表板页面
    await expect(page.url()).toContain('/dashboard');
    
    // 应该显示仪表板内容
    await expect(page.locator('h1:has-text("仪表盘")')).toBeVisible();
  });

  test('应该能够查看订阅列表', async ({ page }) => {
    await page.goto('http://localhost:3000/subscriptions');
    
    // 应该在订阅列表页面
    await expect(page.url()).toContain('/subscriptions');
    
    // 应该显示添加订阅按钮
    await expect(page.getByRole('button', { name: /添加订阅/ })).toBeVisible();
  });
});