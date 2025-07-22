const db = require('../db/database');
const moment = require('moment');

class Reminder {
  // 获取所有未发送的提醒
  static getPendingReminders(callback) {
    const today = moment().format('YYYY-MM-DD');
    
    const query = `
      SELECT r.*, s.name, s.amount, s.currency, s.next_payment_date
      FROM reminders r
      JOIN subscriptions s ON r.subscription_id = s.id
      WHERE r.reminder_date <= ? 
      AND r.sent = 0
      AND s.active = 1
    `;
    
    db.all(query, [today], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 创建新提醒
  static create(reminder, callback) {
    const { subscription_id, reminder_date } = reminder;

    const query = `
      INSERT INTO reminders (subscription_id, reminder_date)
      VALUES (?, ?)
    `;
    
    db.run(query, [subscription_id, reminder_date], function(err) {
      if (err) {
        return callback(err, null);
      }
      callback(null, { id: this.lastID, ...reminder });
    });
  }

  // 标记提醒为已发送
  static markAsSent(id, callback) {
    const query = `
      UPDATE reminders
      SET sent = 1
      WHERE id = ?
    `;
    
    db.run(query, [id], function(err) {
      if (err) {
        return callback(err, null);
      }
      callback(null, { id, updated: true });
    });
  }

  // 为新订阅创建提醒
  static createForSubscription(subscriptionId, nextPaymentDate, reminderDays, callback) {
    const reminderDate = moment(nextPaymentDate).subtract(reminderDays, 'days').format('YYYY-MM-DD');
    
    this.create({
      subscription_id: subscriptionId,
      reminder_date: reminderDate
    }, callback);
  }

  // 为即将到期的订阅更新提醒
  static updateForSubscription(subscriptionId, nextPaymentDate, reminderDays, callback) {
    // 先删除该订阅的未发送提醒
    const deleteQuery = `
      DELETE FROM reminders
      WHERE subscription_id = ? AND sent = 0
    `;
    
    db.run(deleteQuery, [subscriptionId], (err) => {
      if (err) {
        return callback(err, null);
      }
      
      // 创建新提醒
      const reminderDate = moment(nextPaymentDate).subtract(reminderDays, 'days').format('YYYY-MM-DD');
      
      this.create({
        subscription_id: subscriptionId,
        reminder_date: reminderDate
      }, callback);
    });
  }
}

module.exports = Reminder;
