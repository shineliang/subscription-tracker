const Subscription = require('../../models/subscription');
const db = require('../../db/database');

// Mock the database module
jest.mock('../../db/database');

describe('Subscription Model - getSpendingByCategoryByUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('应该正确计算月度支出并按类别分组', (done) => {
    const userId = 1;
    const timeframe = 'monthly';
    
    // 模拟数据库返回的订阅数据
    const mockSubscriptions = [
      { category: '娱乐', amount: 30, currency: 'CNY', billing_cycle: 'monthly' },
      { category: '娱乐', amount: 120, currency: 'CNY', billing_cycle: 'yearly' },
      { category: '工具', amount: 50, currency: 'CNY', billing_cycle: 'monthly' },
      { category: null, amount: 20, currency: 'CNY', billing_cycle: 'monthly' }
    ];

    // 模拟db.all调用
    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Subscription.getSpendingByCategoryByUser(userId, timeframe, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveLength(3); // 娱乐, 工具, 未分类

      // 检查娱乐类别 (30 + 120/12 = 30 + 10 = 40)
      const entertainment = result.find(r => r.category === '娱乐');
      expect(entertainment).toBeDefined();
      expect(entertainment.subscription_count).toBe(2);
      expect(entertainment.total_amount).toBe(40);
      expect(entertainment.currency).toBe('CNY');

      // 检查工具类别
      const tools = result.find(r => r.category === '工具');
      expect(tools).toBeDefined();
      expect(tools.subscription_count).toBe(1);
      expect(tools.total_amount).toBe(50);

      // 检查未分类
      const uncategorized = result.find(r => r.category === '未分类');
      expect(uncategorized).toBeDefined();
      expect(uncategorized.subscription_count).toBe(1);
      expect(uncategorized.total_amount).toBe(20);

      done();
    });
  });

  test('应该正确计算年度支出并按类别分组', (done) => {
    const userId = 1;
    const timeframe = 'yearly';
    
    const mockSubscriptions = [
      { category: '娱乐', amount: 30, currency: 'CNY', billing_cycle: 'monthly' },
      { category: '娱乐', amount: 120, currency: 'CNY', billing_cycle: 'yearly' }
    ];

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Subscription.getSpendingByCategoryByUser(userId, timeframe, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveLength(1);

      const entertainment = result[0];
      expect(entertainment.category).toBe('娱乐');
      expect(entertainment.subscription_count).toBe(2);
      // 月度30*12 + 年度120 = 360 + 120 = 480
      expect(entertainment.total_amount).toBe(480);

      done();
    });
  });

  test('应该正确处理不同的计费周期转换', (done) => {
    const userId = 1;
    const timeframe = 'monthly';
    
    const mockSubscriptions = [
      { category: '测试', amount: 365, currency: 'CNY', billing_cycle: 'daily' },
      { category: '测试', amount: 52, currency: 'CNY', billing_cycle: 'weekly' },
      { category: '测试', amount: 12, currency: 'CNY', billing_cycle: 'quarterly' },
      { category: '测试', amount: 12, currency: 'CNY', billing_cycle: 'half_yearly' }
    ];

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Subscription.getSpendingByCategoryByUser(userId, timeframe, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveLength(1);

      const testCategory = result[0];
      expect(testCategory.category).toBe('测试');
      expect(testCategory.subscription_count).toBe(4);
      
      // 计算预期值:
      // daily: 365 * 30.44 = 11110.6
      // weekly: 52 * 4.33 = 225.16
      // quarterly: 12 / 3 = 4
      // half_yearly: 12 / 6 = 2
      const expectedTotal = 365 * 30.44 + 52 * 4.33 + 12 / 3 + 12 / 6;
      expect(testCategory.total_amount).toBeCloseTo(expectedTotal, 2);

      done();
    });
  });

  test('应该正确处理数据库错误', (done) => {
    const userId = 1;
    const timeframe = 'monthly';
    
    const mockError = new Error('Database connection failed');
    db.all.mockImplementation((query, params, callback) => {
      callback(mockError, null);
    });

    Subscription.getSpendingByCategoryByUser(userId, timeframe, (err, result) => {
      expect(err).toBe(mockError);
      expect(result).toBeNull();
      done();
    });
  });

  test('应该正确处理空订阅列表', (done) => {
    const userId = 1;
    const timeframe = 'monthly';
    
    db.all.mockImplementation((query, params, callback) => {
      callback(null, []);
    });

    Subscription.getSpendingByCategoryByUser(userId, timeframe, (err, result) => {
      expect(err).toBeNull();
      expect(result).toEqual([]);
      done();
    });
  });

  test('应该正确处理无效的金额数据', (done) => {
    const userId = 1;
    const timeframe = 'monthly';
    
    const mockSubscriptions = [
      { category: '测试', amount: null, currency: 'CNY', billing_cycle: 'monthly' },
      { category: '测试', amount: undefined, currency: 'CNY', billing_cycle: 'monthly' },
      { category: '测试', amount: 'invalid', currency: 'CNY', billing_cycle: 'monthly' },
      { category: '测试', amount: 10, currency: 'CNY', billing_cycle: 'monthly' }
    ];

    db.all.mockImplementation((query, params, callback) => {
      callback(null, mockSubscriptions);
    });

    Subscription.getSpendingByCategoryByUser(userId, timeframe, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveLength(1);

      const testCategory = result[0];
      expect(testCategory.category).toBe('测试');
      expect(testCategory.subscription_count).toBe(4);
      // 只有最后一个有效金额10应该被计算
      expect(testCategory.total_amount).toBe(10);

      done();
    });
  });
});