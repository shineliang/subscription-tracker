const db = require('../db/database');

class SubscriptionHistory {
  // 记录订阅变更
  static recordChange(subscriptionId, userId, changeType, changes, notes = null, callback) {
    // 如果是更新操作且有具体字段变更，记录每个字段的变更
    if (changeType === 'updated' && changes && typeof changes === 'object') {
      const values = [];
      const placeholders = [];
      
      Object.entries(changes).forEach(([fieldName, { oldValue, newValue }]) => {
        values.push(subscriptionId, userId, changeType, fieldName, 
                   oldValue !== undefined ? String(oldValue) : null, 
                   newValue !== undefined ? String(newValue) : null, 
                   notes);
        placeholders.push('(?, ?, ?, ?, ?, ?, ?)');
      });
      
      const query = `
        INSERT INTO subscription_history 
        (subscription_id, user_id, change_type, field_name, old_value, new_value, notes)
        VALUES ${placeholders.join(', ')}
      `;
      
      db.run(query, values, callback);
    } else {
      // 对于创建、取消、重新激活等操作，只记录操作类型
      const query = `
        INSERT INTO subscription_history 
        (subscription_id, user_id, change_type, notes)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(query, [subscriptionId, userId, changeType, notes], callback);
    }
  }
  
  // 获取订阅的历史记录
  static getBySubscriptionId(subscriptionId, userId, callback) {
    const query = `
      SELECT * FROM subscription_history 
      WHERE subscription_id = ? AND user_id = ?
      ORDER BY change_date DESC
    `;
    
    db.all(query, [subscriptionId, userId], callback);
  }
  
  // 获取用户的所有历史记录
  static getAllByUser(userId, limit = 100, offset = 0, callback) {
    const query = `
      SELECT sh.*, s.name as subscription_name
      FROM subscription_history sh
      JOIN subscriptions s ON sh.subscription_id = s.id
      WHERE sh.user_id = ?
      ORDER BY sh.change_date DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [userId, limit, offset], callback);
  }
  
  // 获取价格变化历史
  static getPriceChanges(subscriptionId, userId, callback) {
    const query = `
      SELECT * FROM subscription_history 
      WHERE subscription_id = ? AND user_id = ? AND field_name = 'amount'
      ORDER BY change_date DESC
    `;
    
    db.all(query, [subscriptionId, userId], callback);
  }
  
  // 批量记录变更（用于导入等场景）
  static batchRecord(records, callback) {
    const placeholders = records.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = [];
    
    records.forEach(record => {
      values.push(
        record.subscription_id,
        record.user_id,
        record.change_type,
        record.field_name || null,
        record.old_value || null,
        record.new_value || null,
        record.notes || null
      );
    });
    
    const query = `
      INSERT INTO subscription_history 
      (subscription_id, user_id, change_type, field_name, old_value, new_value, notes)
      VALUES ${placeholders}
    `;
    
    db.run(query, values, callback);
  }
}

module.exports = SubscriptionHistory;