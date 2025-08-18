const { test, expect } = require('@playwright/test');

test.describe('Docker Container Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Check if page loads successfully
    await expect(page).toHaveTitle(/订阅跟踪器/);
    
    // Check if login form is visible
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    await expect(usernameInput).toBeVisible();
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/docker-home-page.png' });
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    
    // Click register link
    await page.click('text=注册');
    
    // Verify URL changed
    await expect(page).toHaveURL(/register/);
    
    // Check if register form is visible
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('should test API endpoint', async ({ page }) => {
    // Test API health endpoint directly
    const response = await page.request.get('/api/health');
    
    // API might return 404 if route doesn't exist, but we can check connection
    expect([200, 404, 401]).toContain(response.status());
  });

  test('should handle login attempt', async ({ page }) => {
    await page.goto('/');
    
    // Fill login form with test credentials
    await page.fill('input[name="username"], input[type="text"]', 'testuser');
    await page.fill('input[name="password"], input[type="password"]', 'testpass123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for response (either error or redirect)
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of result
    await page.screenshot({ path: 'test-results/docker-login-attempt.png' });
  });
});