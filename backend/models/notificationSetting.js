const db = require('../db/database');

class NotificationSetting {
  // 获取用户的通知设置
  static getByUser(userId, callback) {
    const query = `
      SELECT * FROM notification_settings
      WHERE user_id = ?
    `;
    
    db.get(query, [userId], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      
      if (!row) {
        // 如果不存在，创建默认设置
        this.createDefaultForUser(userId, (err, settings) => {
          if (err) {
            return callback(err, null);
          }
          callback(null, settings);
        });
      } else {
        callback(null, row);
      }
    });
  }
  
  // 获取通知设置（兼容旧代码）
  static get(callback) {
    // 默认获取用户ID为1的设置（管理员）
    this.getByUser(1, callback);
  }

  // 为用户创建默认通知设置
  static createDefaultForUser(userId, callback) {
    const defaultSettings = {
      user_id: userId,
      email: '',
      notify_days_before: 7,
      email_notifications: true,
      browser_notifications: true
    };

    const query = `
      INSERT INTO notification_settings 
      (user_id, email, notify_days_before, email_notifications, browser_notifications)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(
      query, 
      [
        userId,
        defaultSettings.email,
        defaultSettings.notify_days_before,
        defaultSettings.email_notifications,
        defaultSettings.browser_notifications
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        callback(null, { id: this.lastID, ...defaultSettings });
      }
    );
  }
  
  // 创建默认通知设置（兼容旧代码）
  static createDefault(callback) {
    this.createDefaultForUser(1, callback);
  }

  // 更新用户的通知设置
  static updateByUser(userId, settings, callback) {
    const {
      email,
      notify_days_before,
      email_notifications,
      browser_notifications
    } = settings;

    // 先检查是否已存在设置
    this.getByUser(userId, (err, existingSettings) => {
      if (err) {
        return callback(err, null);
      }

      if (!existingSettings) {
        // 不存在，创建新设置
        this.createDefaultForUser(userId, (err, defaultSettings) => {
          if (err) {
            return callback(err, null);
          }
          
          // 然后更新这些设置
          this.updateByUser(userId, settings, callback);
        });
      } else {
        // 存在，更新设置
        const query = `
          UPDATE notification_settings
          SET email = ?,
              notify_days_before = ?,
              email_notifications = ?,
              browser_notifications = ?
          WHERE user_id = ?
        `;
        
        db.run(
          query,
          [
            email !== undefined ? email : existingSettings.email,
            notify_days_before !== undefined ? notify_days_before : existingSettings.notify_days_before,
            email_notifications !== undefined ? email_notifications : existingSettings.email_notifications,
            browser_notifications !== undefined ? browser_notifications : existingSettings.browser_notifications,
            userId
          ],
          function(err) {
            if (err) {
              return callback(err, null);
            }
            callback(null, { 
              id: existingSettings.id,
              user_id: userId,
              email: email !== undefined ? email : existingSettings.email,
              notify_days_before: notify_days_before !== undefined ? notify_days_before : existingSettings.notify_days_before,
              email_notifications: email_notifications !== undefined ? email_notifications : existingSettings.email_notifications,
              browser_notifications: browser_notifications !== undefined ? browser_notifications : existingSettings.browser_notifications
            });
          }
        );
      }
    });
  }
  
  // 更新通知设置（兼容旧代码）
  static update(settings, callback) {
    this.updateByUser(1, settings, callback);
  }
  
  // 获取所有启用邮件通知的用户
  static getAllWithEmailEnabled(callback) {
    const query = `
      SELECT ns.*, u.username, u.email as user_email
      FROM notification_settings ns
      JOIN users u ON ns.user_id = u.id
      WHERE ns.email_notifications = true 
      AND u.email IS NOT NULL 
      AND u.email != ''
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }
}

module.exports = NotificationSetting;