const User = require('../models/user');
const Subscription = require('../models/subscription');
const Budget = require('../models/budget');
const NotificationSetting = require('../models/notificationSetting');
const db = require('../db/database');
require('dotenv').config();

describe('Model Tests', () => {
  let testUserId;
  let testSubscriptionId;
  let testBudgetId;
  
  beforeAll(async () => {
    // Create a test user for all tests
    const user = await new Promise((resolve, reject) => {
      User.create({
        username: 'modeltest_' + Date.now(),
        email: 'modeltest' + Date.now() + '@test.com',
        password: 'testpassword123',
        full_name: 'Model Test User'
      }, (err, userId) => {
        if (err) reject(err);
        else resolve(userId);
      });
    });
    testUserId = user;
  });
  
  describe('User Model', () => {
    test('Should find user by ID', async () => {
      const user = await new Promise((resolve, reject) => {
        User.findById(testUserId, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
      expect(user.username).toContain('modeltest_');
    });
    
    test('Should find user by email', async () => {
      const user = await new Promise((resolve, reject) => {
        User.findById(testUserId, (err, user) => {
          if (err) reject(err);
          else {
            User.findByEmail(user.email, (err, foundUser) => {
              if (err) reject(err);
              else resolve(foundUser);
            });
          }
        });
      });
      
      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
    });
    
    test('Should update user profile', async () => {
      const updated = await new Promise((resolve, reject) => {
        User.updateProfile(testUserId, {
          full_name: 'Updated Test User'
        }, (err, success) => {
          if (err) reject(err);
          else resolve(success);
        });
      });
      
      expect(updated).toBe(true);
      
      const user = await new Promise((resolve, reject) => {
        User.findById(testUserId, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });
      
      expect(user.full_name).toBe('Updated Test User');
    });
  });
  
  describe('Subscription Model', () => {
    test('Should create a subscription', async () => {
      const subId = await new Promise((resolve, reject) => {
        Subscription.create({
          name: 'Test Subscription',
          amount: 99.99,
          billing_cycle: 'monthly',
          start_date: '2024-01-01',
          next_payment_date: '2024-02-01',
          user_id: testUserId,
          category: 'test'
        }, (err, id) => {
          if (err) reject(err);
          else resolve(id);
        });
      });
      
      testSubscriptionId = subId;
      expect(subId).toBeDefined();
      expect(subId).toBeGreaterThan(0);
    });
    
    test('Should find subscription by ID', async () => {
      const subscription = await new Promise((resolve, reject) => {
        Subscription.findById(testSubscriptionId, (err, sub) => {
          if (err) reject(err);
          else resolve(sub);
        });
      });
      
      expect(subscription).toBeDefined();
      expect(subscription.id).toBe(testSubscriptionId);
      expect(subscription.name).toBe('Test Subscription');
      expect(subscription.amount).toBe('99.99');
    });
    
    test('Should find all subscriptions for user', async () => {
      const subscriptions = await new Promise((resolve, reject) => {
        Subscription.findByUserId(testUserId, (err, subs) => {
          if (err) reject(err);
          else resolve(subs);
        });
      });
      
      expect(subscriptions).toBeDefined();
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions.length).toBeGreaterThan(0);
      expect(subscriptions.some(s => s.id === testSubscriptionId)).toBe(true);
    });
    
    test('Should update subscription', async () => {
      const updated = await new Promise((resolve, reject) => {
        Subscription.update(testSubscriptionId, {
          name: 'Updated Subscription',
          amount: 149.99
        }, (err, success) => {
          if (err) reject(err);
          else resolve(success);
        });
      });
      
      expect(updated).toBe(true);
      
      const subscription = await new Promise((resolve, reject) => {
        Subscription.findById(testSubscriptionId, (err, sub) => {
          if (err) reject(err);
          else resolve(sub);
        });
      });
      
      expect(subscription.name).toBe('Updated Subscription');
      expect(subscription.amount).toBe('149.99');
    });
    
    test('Should delete subscription', async () => {
      const deleted = await new Promise((resolve, reject) => {
        Subscription.delete(testSubscriptionId, (err, success) => {
          if (err) reject(err);
          else resolve(success);
        });
      });
      
      expect(deleted).toBe(true);
      
      const subscription = await new Promise((resolve, reject) => {
        Subscription.findById(testSubscriptionId, (err, sub) => {
          if (err) reject(err);
          else resolve(sub);
        });
      });
      
      expect(subscription).toBeNull();
    });
  });
  
  describe('Budget Model', () => {
    test('Should create a budget', async () => {
      const budgetId = await new Promise((resolve, reject) => {
        Budget.create({
          user_id: testUserId,
          name: 'Test Budget',
          type: 'total',
          period: 'monthly',
          amount: 1000.00,
          currency: 'CNY'
        }, (err, id) => {
          if (err) reject(err);
          else resolve(id);
        });
      });
      
      testBudgetId = budgetId;
      expect(budgetId).toBeDefined();
      expect(budgetId).toBeGreaterThan(0);
    });
    
    test('Should find budget by ID', async () => {
      const budget = await new Promise((resolve, reject) => {
        Budget.findById(testBudgetId, (err, budget) => {
          if (err) reject(err);
          else resolve(budget);
        });
      });
      
      expect(budget).toBeDefined();
      expect(budget.id).toBe(testBudgetId);
      expect(budget.name).toBe('Test Budget');
      expect(budget.amount).toBe('1000.00');
    });
    
    test('Should find all budgets for user', async () => {
      const budgets = await new Promise((resolve, reject) => {
        Budget.findByUserId(testUserId, (err, budgets) => {
          if (err) reject(err);
          else resolve(budgets);
        });
      });
      
      expect(budgets).toBeDefined();
      expect(Array.isArray(budgets)).toBe(true);
      expect(budgets.length).toBeGreaterThan(0);
      expect(budgets.some(b => b.id === testBudgetId)).toBe(true);
    });
    
    test('Should delete budget', async () => {
      const deleted = await new Promise((resolve, reject) => {
        Budget.delete(testBudgetId, (err, success) => {
          if (err) reject(err);
          else resolve(success);
        });
      });
      
      expect(deleted).toBe(true);
    });
  });
  
  describe('NotificationSetting Model', () => {
    test('Should create or update notification settings', async () => {
      const settingId = await new Promise((resolve, reject) => {
        NotificationSetting.createOrUpdate({
          user_id: testUserId,
          email: 'notification@test.com',
          notify_days_before: 3,
          email_notifications: true,
          browser_notifications: false
        }, (err, id) => {
          if (err) reject(err);
          else resolve(id);
        });
      });
      
      expect(settingId).toBeDefined();
      expect(settingId).toBeGreaterThan(0);
    });
    
    test('Should find notification settings by user ID', async () => {
      const settings = await new Promise((resolve, reject) => {
        NotificationSetting.findByUserId(testUserId, (err, settings) => {
          if (err) reject(err);
          else resolve(settings);
        });
      });
      
      expect(settings).toBeDefined();
      expect(settings.user_id).toBe(testUserId);
      expect(settings.email).toBe('notification@test.com');
      expect(settings.notify_days_before).toBe(3);
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    await new Promise((resolve) => {
      db.run('DELETE FROM notification_settings WHERE user_id = $1', [testUserId], resolve);
    });
    
    await new Promise((resolve) => {
      db.run('DELETE FROM subscriptions WHERE user_id = $1', [testUserId], resolve);
    });
    
    await new Promise((resolve) => {
      db.run('DELETE FROM budgets WHERE user_id = $1', [testUserId], resolve);
    });
    
    await new Promise((resolve) => {
      db.run('DELETE FROM users WHERE id = $1', [testUserId], resolve);
    });
    
    await db.close();
  });
});