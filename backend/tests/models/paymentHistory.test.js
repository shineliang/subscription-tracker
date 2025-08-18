const PaymentHistory = require('../../models/paymentHistory');
const db = require('../../db/database');

// Mock the database module
jest.mock('../../db/database');

describe('PaymentHistory Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentStats', () => {
    test('应该正确计算指定年份的月度付款统计', (done) => {
      const userId = 1;
      const year = 2023;
      
      // 模拟付款历史数据
      const mockPayments = [
        { payment_date: '2023-01-15', amount: 100, currency: 'CNY' },
        { payment_date: '2023-01-25', amount: 50, currency: 'CNY' },
        { payment_date: '2023-02-10', amount: 200, currency: 'USD' }, // 200 * 7 = 1400
        { payment_date: '2023-03-05', amount: 75, currency: 'CNY' },
        { payment_date: '2022-12-31', amount: 999, currency: 'CNY' }, // 应该被过滤掉
        { payment_date: '2024-01-01', amount: 888, currency: 'CNY' }  // 应该被过滤掉
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockPayments);
      });

      PaymentHistory.getPaymentStats(userId, year, (err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(3); // 1月, 2月, 3月

        // 检查1月统计 (100 + 50 = 150)
        const jan = result.find(r => r.month === '01');
        expect(jan).toBeDefined();
        expect(jan.payment_count).toBe(2);
        expect(jan.total_amount).toBe(150);

        // 检查2月统计 (200 * 7 = 1400)
        const feb = result.find(r => r.month === '02');
        expect(feb).toBeDefined();
        expect(feb.payment_count).toBe(1);
        expect(feb.total_amount).toBe(1400);

        // 检查3月统计
        const mar = result.find(r => r.month === '03');
        expect(mar).toBeDefined();
        expect(mar.payment_count).toBe(1);
        expect(mar.total_amount).toBe(75);

        // 确保结果按月份排序
        expect(result[0].month).toBe('01');
        expect(result[1].month).toBe('02');
        expect(result[2].month).toBe('03');

        done();
      });
    });

    test('应该正确处理无效的日期数据', (done) => {
      const userId = 1;
      const year = 2023;
      
      const mockPayments = [
        { payment_date: null, amount: 100, currency: 'CNY' },
        { payment_date: undefined, amount: 50, currency: 'CNY' },
        { payment_date: 'invalid-date', amount: 75, currency: 'CNY' },
        { payment_date: '2023-01-15', amount: 200, currency: 'CNY' }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockPayments);
      });

      PaymentHistory.getPaymentStats(userId, year, (err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(1); // 只有一个有效记录

        const jan = result[0];
        expect(jan.month).toBe('01');
        expect(jan.payment_count).toBe(1);
        expect(jan.total_amount).toBe(200);

        done();
      });
    });

    test('应该正确处理空付款记录', (done) => {
      const userId = 1;
      const year = 2023;

      db.all.mockImplementation((query, params, callback) => {
        callback(null, []);
      });

      PaymentHistory.getPaymentStats(userId, year, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual([]);
        done();
      });
    });

    test('应该正确处理数据库错误', (done) => {
      const userId = 1;
      const year = 2023;
      
      const mockError = new Error('Database connection failed');
      db.all.mockImplementation((query, params, callback) => {
        callback(mockError, null);
      });

      PaymentHistory.getPaymentStats(userId, year, (err, result) => {
        expect(err).toBe(mockError);
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('getByDateRange', () => {
    test('应该正确获取日期范围内的付款记录并关联订阅信息', (done) => {
      const userId = 1;
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      const mockPayments = [
        { 
          id: 1, 
          user_id: 1, 
          subscription_id: 101, 
          payment_date: '2023-01-15', 
          amount: 100, 
          currency: 'CNY' 
        },
        { 
          id: 2, 
          user_id: 1, 
          subscription_id: 102, 
          payment_date: '2023-02-15', 
          amount: 200, 
          currency: 'CNY' 
        }
      ];

      const mockSubscriptions = [
        { id: 101, name: 'Netflix', provider: 'Netflix Inc', category: '娱乐' },
        { id: 102, name: 'Spotify', provider: 'Spotify AB', category: '音乐' }
      ];

      // 第一次调用返回付款记录，第二次调用返回订阅信息
      let callCount = 0;
      db.all.mockImplementation((query, params, callback) => {
        callCount++;
        if (callCount === 1) {
          // 返回付款记录
          callback(null, mockPayments);
        } else {
          // 返回订阅信息
          callback(null, mockSubscriptions);
        }
      });

      PaymentHistory.getByDateRange(userId, startDate, endDate, (err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(1); // 只有一个记录在日期范围内

        const payment = result[0];
        expect(payment.id).toBe(1);
        expect(payment.payment_date).toBe('2023-01-15');
        expect(payment.amount).toBe(100);
        expect(payment.subscription_name).toBe('Netflix');
        expect(payment.provider).toBe('Netflix Inc');
        expect(payment.category).toBe('娱乐');

        done();
      });
    });

    test('应该正确处理无订阅信息的情况', (done) => {
      const userId = 1;
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      const mockPayments = [
        { 
          id: 1, 
          user_id: 1, 
          subscription_id: 999, // 不存在的订阅ID
          payment_date: '2023-01-15', 
          amount: 100, 
          currency: 'CNY' 
        }
      ];

      const mockSubscriptions = []; // 空的订阅列表

      let callCount = 0;
      db.all.mockImplementation((query, params, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, mockPayments);
        } else {
          callback(null, mockSubscriptions);
        }
      });

      PaymentHistory.getByDateRange(userId, startDate, endDate, (err, result) => {
        expect(err).toBeNull();
        expect(result).toHaveLength(1);

        const payment = result[0];
        expect(payment.subscription_name).toBe('未知订阅');
        expect(payment.provider).toBe('');
        expect(payment.category).toBe('');

        done();
      });
    });

    test('应该正确处理空日期范围', (done) => {
      const userId = 1;
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      const mockPayments = [
        { 
          payment_date: '2022-12-31', // 在范围外
          amount: 100, 
          currency: 'CNY' 
        }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockPayments);
      });

      PaymentHistory.getByDateRange(userId, startDate, endDate, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual([]);
        done();
      });
    });
  });
});