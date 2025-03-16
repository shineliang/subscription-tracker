const db = require('../db/database');

class NotificationSetting {
  // 获取通知设置
  static get(callback) {
    const query = `
      SELECT * FROM notification_settings
      LIMIT 1
    `;
    
    db.get(query, [], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      
      if (!row) {
        // 如果不存在，创建默认设置
        this.createDefault((err, settings) => {
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

  // 创建默认通知设置
  static createDefault(callback) {
    const defaultSettings = {
      email: '',
      notify_days_before: 7,
      email_notifications: 0,
      browser_notifications: 1
    };

    const query = `
      INSERT INTO notification_settings 
      (email, notify_days_before, email_notifications, browser_notifications)
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(
      query, 
      [
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

  // 更新通知设置
  static update(settings, callback) {
    const {
      email,
      notify_days_before,
      email_notifications,
      browser_notifications
    } = settings;

    // 先检查是否已存在设置
    this.get((err, existingSettings) => {
      if (err) {
        return callback(err, null);
      }

      if (!existingSettings) {
        // 不存在，创建新设置
        this.createDefault((err, defaultSettings) => {
          if (err) {
            return callback(err, null);
          }
          
          // 然后更新这些设置
          this.update(settings, callback);
        });
      } else {
        // 存在，更新设置
        const query = `
          UPDATE notification_settings
          SET email = ?,
              notify_days_before = ?,
              email_notifications = ?,
              browser_notifications = ?
          WHERE id = ?
        `;
        
        db.run(
          query,
          [
            email,
            notify_days_before,
            email_notifications,
            browser_notifications,
            existingSettings.id
          ],
          function(err) {
            if (err) {
              return callback(err, null);
            }
            callback(null, { 
              id: existingSettings.id, 
              email, 
              notify_days_before, 
              email_notifications, 
              browser_notifications 
            });
          }
        );
      }
    });
  }
}

module.exports = NotificationSetting;
