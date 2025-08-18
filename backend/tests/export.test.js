const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const apiRoutes = require('../routes/api');
const { JWT_SECRET } = require('../middleware/auth');

// Mock dependencies
jest.mock('../models/subscription');
jest.mock('../models/user');
jest.mock('../db/database');

const Subscription = require('../models/subscription');
const User = require('../models/user');

// Create test app
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('导出数据功能测试', () => {
  let authToken;
  let testUser;

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();
    
    // 创建测试用户和token
    testUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true
    };
    
    authToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
    
    // Mock User.getById for auth middleware
    User.getById.mockImplementation((userId, callback) => {
      if (userId === testUser.id) {
        callback(null, testUser);
      } else {
        callback(new Error('User not found'));
      }
    });
  });

  describe('GET /api/export-data', () => {
    test('应该成功导出用户的订阅数据', async () => {
      // Mock subscription data
      const mockSubscriptions = [
        {
          id: 1,
          name: 'Netflix',
          description: '视频流媒体服务',
          provider: 'Netflix Inc.',
          amount: 15.99,
          currency: 'USD',
          billing_cycle: 'monthly',
          start_date: '2025-01-01',
          next_payment_date: '2025-02-01',
          reminder_days: 3,
          cycle_count: 1,
          active: 1,
          created_at: '2025-01-01 00:00:00',
          updated_at: '2025-01-01 00:00:00'
        },
        {
          id: 2,
          name: 'Spotify',
          description: '音乐流媒体服务',
          provider: 'Spotify AB',
          amount: 9.99,
          currency: 'USD',
          billing_cycle: 'monthly',
          start_date: '2025-01-15',
          next_payment_date: '2025-02-15',
          reminder_days: 7,
          cycle_count: 1,
          active: 1,
          created_at: '2025-01-15 00:00:00',
          updated_at: '2025-01-15 00:00:00'
        }
      ];

      // Mock Subscription.getAllByUser
      Subscription.getAllByUser.mockImplementation((userId, callback) => {
        expect(userId).toBe(testUser.id);
        callback(null, mockSubscriptions);
      });

      const response = await request(app)
        .get('/api/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 验证响应头
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename=subscriptions.csv');

      // 验证CSV内容
      const csvContent = response.text;
      expect(csvContent).toContain('"id","name","description","provider","amount","currency"');
      expect(csvContent).toContain('Netflix');
      expect(csvContent).toContain('Spotify');
      expect(csvContent).toContain('15.99');
      expect(csvContent).toContain('9.99');

      // 验证调用了正确的方法
      expect(Subscription.getAllByUser).toHaveBeenCalledTimes(1);
      expect(Subscription.getAllByUser).toHaveBeenCalledWith(
        testUser.id,
        expect.any(Function)
      );
    });

    test('应该在没有认证token时返回401错误', async () => {
      const response = await request(app)
        .get('/api/export-data')
        .expect(401);

      expect(response.body.error).toBe('未提供认证令牌');
      expect(Subscription.getAllByUser).not.toHaveBeenCalled();
    });

    test('应该在token无效时返回403错误', async () => {
      const invalidToken = 'invalid-token';

      const response = await request(app)
        .get('/api/export-data')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(403);

      expect(response.body.error).toBe('无效的认证令牌');
      expect(Subscription.getAllByUser).not.toHaveBeenCalled();
    });

    test('应该在数据库错误时返回500错误', async () => {
      const dbError = new Error('数据库连接失败');

      // Mock database error
      Subscription.getAllByUser.mockImplementation((userId, callback) => {
        callback(dbError);
      });

      const response = await request(app)
        .get('/api/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('数据库连接失败');
      expect(Subscription.getAllByUser).toHaveBeenCalledWith(
        testUser.id,
        expect.any(Function)
      );
    });

    test('应该正确处理空的订阅数据', async () => {
      // Mock empty subscription data
      Subscription.getAllByUser.mockImplementation((userId, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 验证响应头
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename=subscriptions.csv');

      // 验证CSV只包含标题行
      const csvContent = response.text;
      expect(csvContent).toContain('"id","name","description","provider","amount","currency"');
      
      // 确保没有数据行（只有标题行）
      const lines = csvContent.trim().split('\n');
      expect(lines).toHaveLength(1); // 只有标题行

      expect(Subscription.getAllByUser).toHaveBeenCalledWith(
        testUser.id,
        expect.any(Function)
      );
    });

    test('应该包含所有必要的CSV字段', async () => {
      const mockSubscriptions = [{
        id: 1,
        name: 'Test Service',
        description: 'Test Description',
        provider: 'Test Provider',
        amount: 10.00,
        currency: 'USD',
        billing_cycle: 'monthly',
        start_date: '2025-01-01',
        next_payment_date: '2025-02-01',
        reminder_days: 3,
        cycle_count: 1,
        active: 1,
        created_at: '2025-01-01 00:00:00',
        updated_at: '2025-01-01 00:00:00'
      }];

      Subscription.getAllByUser.mockImplementation((userId, callback) => {
        callback(null, mockSubscriptions);
      });

      const response = await request(app)
        .get('/api/export-data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const csvContent = response.text;
      const expectedFields = [
        'id', 'name', 'description', 'provider', 'amount', 'currency',
        'billing_cycle', 'start_date', 'next_payment_date', 'reminder_days',
        'cycle_count', 'active', 'created_at', 'updated_at'
      ];

      expectedFields.forEach(field => {
        expect(csvContent).toContain(field);
      });
    });
  });
});