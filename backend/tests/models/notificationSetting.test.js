const NotificationSetting = require('../../models/notificationSetting');
const db = require('../../db/database');

// Mock database
jest.mock('../../db/database', () => ({
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn()
}));

describe('NotificationSetting Model', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createDefaultForUser', () => {
    test('应该创建默认通知设置', (done) => {
      const mockSettings = {
        id: 1,
        user_id: 123,
        email: '',
        notify_days_before: 7,
        email_notifications: true,
        browser_notifications: true
      };

      // Mock successful insertion
      db.run.mockImplementation((query, params, callback) => {
        callback.call({ lastID: 1 }, null);
      });

      NotificationSetting.createDefaultForUser(123, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual(mockSettings);
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO notification_settings'),
          [123, '', 7, true, true],
          expect.any(Function)
        );
        done();
      });
    });
  });

  describe('updateByUser', () => {
    test('应该更新用户的通知设置', (done) => {
      const existingSettings = {
        id: 1,
        user_id: 123,
        email: 'test@example.com',
        notify_days_before: 7,
        email_notifications: true,
        browser_notifications: true
      };

      const updateSettings = {
        email: 'admin@example.com',
        notify_days_before: 5,
        email_notifications: false,
        browser_notifications: true
      };

      // Mock getByUser to return existing settings
      db.get.mockImplementation((query, params, callback) => {
        callback(null, existingSettings);
      });

      // Mock successful update
      db.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      NotificationSetting.updateByUser(123, updateSettings, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual({
          id: 1,
          user_id: 123,
          email: 'admin@example.com',
          notify_days_before: 5,
          email_notifications: false,
          browser_notifications: true
        });
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE notification_settings'),
          ['admin@example.com', 5, false, true, 123],
          expect.any(Function)
        );
        done();
      });
    });

    test('应该支持部分字段更新', (done) => {
      const existingSettings = {
        id: 1,
        user_id: 123,
        email: 'test@example.com',
        notify_days_before: 7,
        email_notifications: true,
        browser_notifications: true
      };

      const updateSettings = {
        email_notifications: false
      };

      // Mock getByUser to return existing settings
      db.get.mockImplementation((query, params, callback) => {
        callback(null, existingSettings);
      });

      // Mock successful update
      db.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      NotificationSetting.updateByUser(123, updateSettings, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual({
          id: 1,
          user_id: 123,
          email: 'test@example.com',
          notify_days_before: 7,
          email_notifications: false,
          browser_notifications: true
        });
        expect(db.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE notification_settings'),
          ['test@example.com', 7, false, true, 123],
          expect.any(Function)
        );
        done();
      });
    });

    test('如果用户设置不存在应该先创建默认设置', (done) => {
      const updateSettings = {
        email: 'new@example.com',
        notify_days_before: 5,
        email_notifications: false,
        browser_notifications: true
      };

      // Mock getByUser to return null (no existing settings)
      db.get.mockImplementationOnce((query, params, callback) => {
        callback(null, null);
      });

      // Mock createDefaultForUser
      db.run.mockImplementationOnce((query, params, callback) => {
        callback.call({ lastID: 1 }, null);
      });

      // Mock getByUser for the recursive call
      db.get.mockImplementationOnce((query, params, callback) => {
        callback(null, {
          id: 1,
          user_id: 123,
          email: '',
          notify_days_before: 7,
          email_notifications: true,
          browser_notifications: true
        });
      });

      // Mock the update call
      db.run.mockImplementationOnce((query, params, callback) => {
        callback(null);
      });

      NotificationSetting.updateByUser(123, updateSettings, (err, result) => {
        expect(err).toBeNull();
        expect(result).toEqual({
          id: 1,
          user_id: 123,
          email: 'new@example.com',
          notify_days_before: 5,
          email_notifications: false,
          browser_notifications: true
        });
        done();
      });
    });
  });

  describe('getAllWithEmailEnabled', () => {
    test('应该返回所有启用邮件通知的用户', (done) => {
      const mockUsers = [
        {
          id: 1,
          user_id: 123,
          email_notifications: true,
          username: 'testuser',
          user_email: 'test@example.com'
        }
      ];

      db.all.mockImplementation((query, params, callback) => {
        callback(null, mockUsers);
      });

      NotificationSetting.getAllWithEmailEnabled((err, users) => {
        expect(err).toBeNull();
        expect(users).toEqual(mockUsers);
        expect(db.all).toHaveBeenCalledWith(
          expect.stringContaining('WHERE ns.email_notifications = true'),
          [],
          expect.any(Function)
        );
        done();
      });
    });
  });
});