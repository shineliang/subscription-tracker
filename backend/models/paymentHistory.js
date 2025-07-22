const db = require('../db/database');
const moment = require('moment');

class PaymentHistory {
  // 记录付款
  static recordPayment(paymentData, callback) {
    const query = `
      INSERT INTO payment_history 
      (subscription_id, user_id, amount, currency, payment_date, payment_method, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const values = [
      paymentData.subscription_id,
      paymentData.user_id,
      paymentData.amount,
      paymentData.currency || 'CNY',
      paymentData.payment_date,
      paymentData.payment_method || null,
      paymentData.status || 'completed',
      paymentData.notes || null
    ];
    
    db.run(query, values, function(err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, ...paymentData });
    });
  }
  
  // 获取订阅的付款历史
  static getBySubscriptionId(subscriptionId, userId, callback) {
    const query = `
      SELECT * FROM payment_history 
      WHERE subscription_id = $1 AND user_id = $2
      ORDER BY payment_date DESC
    `;
    
    db.all(query, [subscriptionId, userId], callback);
  }
  
  // 获取用户的所有付款历史
  static getAllByUser(userId, limit = 100, offset = false, callback) {
    const query = `
      SELECT ph.*, s.name as subscription_name, s.provider
      FROM payment_history ph
      JOIN subscriptions s ON ph.subscription_id = s.id
      WHERE ph.user_id = $1
      ORDER BY ph.payment_date DESC
      LIMIT $2 OFFSET $3
    `;
    
    db.all(query, [userId, limit, offset], callback);
  }
  
  // 获取指定时间段的付款历史
  static getByDateRange(userId, startDate, endDate, callback) {
    const query = `
      SELECT ph.*, s.name as subscription_name, s.provider, s.category
      FROM payment_history ph
      JOIN subscriptions s ON ph.subscription_id = s.id
      WHERE ph.user_id = $1 AND ph.payment_date BETWEEN $2 AND $3
      ORDER BY ph.payment_date DESC
    `;
    
    db.all(query, [userId, startDate, endDate], callback);
  }
  
  // 获取付款统计
  static getPaymentStats(userId, year, callback) {
    const query = `
      SELECT 
        strftime('%m', payment_date) as month,
        COUNT(*) as payment_count,
        SUM(CASE WHEN currency = 'CNY' THEN amount ELSE amount * 7 END) as total_amount
      FROM payment_history
      WHERE user_id = ? AND TO_CHAR(payment_date, 'YYYY') = ?
      GROUP BY month
      ORDER BY month
    `;
    
    db.all(query, [userId, String(year)], callback);
  }
  
  // 获取最近的付款记录
  static getRecentPayments(userId, days = 30, callback) {
    const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
    const query = `
      SELECT ph.*, s.name as subscription_name, s.provider
      FROM payment_history ph
      JOIN subscriptions s ON ph.subscription_id = s.id
      WHERE ph.user_id = $1 AND ph.payment_date >= $2
      ORDER BY ph.payment_date DESC
    `;
    
    db.all(query, [userId, startDate], callback);
  }
  
  // 更新付款状态
  static updateStatus(paymentId, userId, status, callback) {
    const query = `
      UPDATE payment_history 
      SET status = $1
      WHERE id = $2 AND user_id = $3
    `;
    
    db.run(query, [status, paymentId, userId], callback);
  }
  
  // 批量记录付款（用于导入历史数据）
  static batchRecord(payments, callback) {
    const placeholders = payments.map((_, i) => `(${i*8+1}, ${i*8+2}, ${i*8+3}, ${i*8+4}, ${i*8+5}, ${i*8+6}, ${i*8+7}, ${i*8+8})`).join(', ');
    const values = [];
    
    payments.forEach(payment => {
      values.push(
        payment.subscription_id,
        payment.user_id,
        payment.amount,
        payment.currency || 'CNY',
        payment.payment_date,
        payment.payment_method || null,
        payment.status || 'completed',
        payment.notes || null
      );
    });
    
    const query = `
      INSERT INTO payment_history 
      (subscription_id, user_id, amount, currency, payment_date, payment_method, status, notes)
      VALUES ${placeholders}
    `;
    
    db.run(query, values, callback);
  }
  
  // 检查是否已存在付款记录（避免重复）
  static checkDuplicate(subscriptionId, userId, paymentDate, callback) {
    const query = `
      SELECT COUNT(*) as count
      FROM payment_history
      WHERE subscription_id = $1 AND user_id = $2 AND payment_date = $3
    `;
    
    db.get(query, [subscriptionId, userId, paymentDate], (err, row) => {
      if (err) return callback(err);
      callback(null, row.count > 0);
    });
  }
}

module.exports = PaymentHistory;