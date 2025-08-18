const Budget = require('../../models/budget');
const db = require('../../db/database');
const moment = require('moment');

// Mock the database module
jest.mock('../../db/database');

describe('Budget Model - getBudgetUsage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('应该正确计算月度总预算使用情况', (done) => {
    const userId = 1;
    const budgetId = 1;
    
    // 模拟预算数据
    const mockBudget = {
      id: 1,
      name: '月度总预算',
      type: 'total',
      period: 'monthly',
      amount: 1000,
      currency: 'CNY'
    };

    // 模拟订阅数据
    const mockSubscriptions = [
      { amount: 100, billing_cycle: 'monthly', currency: 'CNY' },
      { amount: 1200, billing_cycle: 'yearly', currency: 'CNY' }, // 1200/12 = 100
      { amount: 50, billing_cycle: 'weekly', currency: 'CNY' }    // 50*4.33 = 216.5
    ];

    // Mock Budget.getByIdAndUser 和 db.all
    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(null, mockBudget);
    });

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBeNull();
      expect(result).toBeDefined();
      
      expect(result.budget_id).toBe(budgetId);
      expect(result.budget_name).toBe('月度总预算');
      expect(result.budget_type).toBe('total');
      expect(result.budget_period).toBe('monthly');
      expect(result.budget_amount).toBe(1000);
      expect(result.currency).toBe('CNY');
      
      // 计算预期支出: 100 + 100 + 216.5 = 416.5
      const expectedSpent = 100 + 1200/12 + 50*4.33;
      expect(result.spent_amount).toBeCloseTo(expectedSpent, 2);
      
      const expectedRemaining = 1000 - expectedSpent;
      expect(result.remaining_amount).toBeCloseTo(expectedRemaining, 2);
      
      const expectedPercentage = (expectedSpent / 1000 * 100);
      expect(result.usage_percentage).toBeCloseTo(expectedPercentage, 2);
      
      expect(result.exceeded).toBe(false);

      done();
    });
  });

  test('应该正确计算年度分类预算使用情况', (done) => {
    const userId = 1;
    const budgetId = 2;
    
    const mockBudget = {
      id: 2,
      name: '年度娱乐预算',
      type: 'category',
      period: 'yearly',
      amount: 2000,
      currency: 'CNY',
      category: '娱乐'
    };

    const mockSubscriptions = [
      { amount: 50, billing_cycle: 'monthly', currency: 'CNY' }, // 50*12 = 600
      { amount: 365, billing_cycle: 'yearly', currency: 'CNY' }   // 365
    ];

    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(null, mockBudget);
    });

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBeNull();
      
      expect(result.budget_type).toBe('category');
      expect(result.budget_period).toBe('yearly');
      expect(result.budget_category).toBe('娱乐');
      
      // 计算预期年度支出: 50*12 + 365 = 965
      const expectedSpent = 50*12 + 365;
      expect(result.spent_amount).toBe(expectedSpent);
      
      done();
    });
  });

  test('应该正确处理超出预算的情况', (done) => {
    const userId = 1;
    const budgetId = 1;
    
    const mockBudget = {
      id: 1,
      name: '小额预算',
      type: 'total',
      period: 'monthly',
      amount: 100,
      currency: 'CNY'
    };

    const mockSubscriptions = [
      { amount: 200, billing_cycle: 'monthly', currency: 'CNY' }
    ];

    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(null, mockBudget);
    });

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBeNull();
      
      expect(result.spent_amount).toBe(200);
      expect(result.remaining_amount).toBe(-100); // 负数表示超支
      expect(result.usage_percentage).toBe(200);  // 200%
      expect(result.exceeded).toBe(true);

      done();
    });
  });

  test('应该正确处理不同计费周期的转换', (done) => {
    const userId = 1;
    const budgetId = 1;
    
    const mockBudget = {
      id: 1,
      name: '月度预算',
      type: 'total',
      period: 'monthly',
      amount: 1000,
      currency: 'CNY'
    };

    const mockSubscriptions = [
      { amount: 365, billing_cycle: 'daily', currency: 'CNY' },      // 365 * 30.44
      { amount: 52, billing_cycle: 'weekly', currency: 'CNY' },      // 52 * 4.33
      { amount: 12, billing_cycle: 'quarterly', currency: 'CNY' },   // 12 / 3
      { amount: 12, billing_cycle: 'half_yearly', currency: 'CNY' }  // 12 / 6
    ];

    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(null, mockBudget);
    });

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBeNull();
      
      const expectedSpent = 365 * 30.44 + 52 * 4.33 + 12 / 3 + 12 / 6;
      expect(result.spent_amount).toBeCloseTo(expectedSpent, 2);

      done();
    });
  });

  test('应该正确处理预算不存在的情况', (done) => {
    const userId = 1;
    const budgetId = 999;
    
    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(null, null); // 预算不存在
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBeDefined();
      expect(err.message).toBe('预算不存在');
      expect(result).toBeUndefined();

      done();
    });
  });

  test('应该正确处理数据库错误', (done) => {
    const userId = 1;
    const budgetId = 1;
    
    const mockError = new Error('Database connection failed');
    
    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(mockError, null);
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBe(mockError);
      expect(result).toBeUndefined();

      done();
    });
  });

  test('应该正确处理空订阅列表', (done) => {
    const userId = 1;
    const budgetId = 1;
    
    const mockBudget = {
      id: 1,
      name: '空预算测试',
      type: 'total',
      period: 'monthly',
      amount: 1000,
      currency: 'CNY'
    };

    Budget.getByIdAndUser = jest.fn((budgetId, userId, callback) => {
      callback(null, mockBudget);
    });

    db.all.mockImplementation((query, params, callback) => {
      callback(null, []); // 空的订阅列表
    });

    Budget.getBudgetUsage(userId, budgetId, (err, result) => {
      expect(err).toBeNull();
      
      expect(result.spent_amount).toBe(0);
      expect(result.remaining_amount).toBe(1000);
      expect(result.usage_percentage).toBe(0);
      expect(result.exceeded).toBe(false);

      done();
    });
  });
});