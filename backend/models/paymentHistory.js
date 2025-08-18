const db = require('../db/database');
const moment = require('moment');

class PaymentHistory {
  // 记录付款
  static recordPayment(paymentData, callback) {
    const query = `
      INSERT INTO payment_history 
      (subscription_id, user_id, amount, currency, payment_date, payment_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
      WHERE subscription_id = ? AND user_id = ?
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
      WHERE ph.user_id = ?
      ORDER BY ph.payment_date DESC
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [userId, limit, offset], callback);
  }
  
  // 获取指定时间段的付款历史
  static getByDateRange(userId, startDate, endDate, callback) {
    // 先获取付款历史记录
    const paymentQuery = `
      SELECT * FROM payment_history
      WHERE user_id = ?
      ORDER BY payment_date DESC
    `;
    
    db.all(paymentQuery, [userId], (err, payments) => {
      if (err) {
        return callback(err, null);
      }
      
      // 过滤日期范围并获取订阅信息
      const filteredPayments = payments.filter(payment => {
        if (!payment.payment_date) return false;
        const paymentDate = payment.payment_date;
        return paymentDate >= startDate && paymentDate <= endDate;
      });
      
      if (filteredPayments.length === 0) {
        return callback(null, []);
      }
      
      // 获取相关的订阅信息
      const subscriptionIds = [...new Set(filteredPayments.map(p => p.subscription_id))];
      
      if (subscriptionIds.length === 0) {
        return callback(null, filteredPayments);
      }
      
      // 为了简化，我们单独查询订阅信息
      const subscriptionQuery = `
        SELECT id, name, provider, category
        FROM subscriptions
        WHERE user_id = ?
      `;
      
      db.all(subscriptionQuery, [userId], (subErr, subscriptions) => {
        if (subErr) {
          // 如果订阅查询失败，返回基础付款信息
          return callback(null, filteredPayments);
        }
        
        // 创建订阅映射
        const subscriptionMap = {};
        subscriptions.forEach(sub => {
          subscriptionMap[sub.id] = sub;
        });
        
        // 合并付款和订阅信息
        const enrichedPayments = filteredPayments.map(payment => {
          const subscription = subscriptionMap[payment.subscription_id];
          return {
            ...payment,
            subscription_name: subscription ? subscription.name : '未知订阅',
            provider: subscription ? subscription.provider : '',
            category: subscription ? subscription.category : ''
          };
        });
        
        callback(null, enrichedPayments);
      });
    });
  }
  
  // 获取付款统计
  static getPaymentStats(userId, year, callback) {
    // 使用简化查询，在应用层进行计算
    const query = `
      SELECT 
        payment_date,
        amount,
        currency
      FROM payment_history
      WHERE user_id = ?
    `;
    
    db.all(query, [userId], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 在 JavaScript 中进行分组和统计
      const monthStats = {};
      const targetYear = String(year);
      
      rows.forEach(row => {
        if (!row.payment_date) return;
        
        // 解析日期并检查年份
        const paymentDate = new Date(row.payment_date);
        const paymentYear = paymentDate.getFullYear().toString();
        
        if (paymentYear === targetYear) {
          const month = (paymentDate.getMonth() + 1).toString().padStart(2, '0');
          
          if (!monthStats[month]) {
            monthStats[month] = {
              month: month,
              payment_count: 0,
              total_amount: 0
            };
          }
          
          monthStats[month].payment_count++;
          
          // 转换金额（非CNY货币简单乘以7）
          const amount = parseFloat(row.amount) || 0;
          const convertedAmount = row.currency === 'CNY' ? amount : amount * 7;
          monthStats[month].total_amount += convertedAmount;
        }
      });
      
      // 转换为数组并排序
      const result = Object.values(monthStats).sort((a, b) => a.month.localeCompare(b.month));
      
      // 确保total_amount保留两位小数
      result.forEach(stat => {
        stat.total_amount = Math.round(stat.total_amount * 100) / 100;
      });
      
      callback(null, result);
    });
  }
  
  // 获取最近的付款记录
  static getRecentPayments(userId, days = 30, callback) {
    const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');
    const query = `
      SELECT ph.*, s.name as subscription_name, s.provider
      FROM payment_history ph
      JOIN subscriptions s ON ph.subscription_id = s.id
      WHERE ph.user_id = ? AND ph.payment_date >= ?
      ORDER BY ph.payment_date DESC
    `;
    
    db.all(query, [userId, startDate], callback);
  }
  
  // 更新付款状态
  static updateStatus(paymentId, userId, status, callback) {
    const query = `
      UPDATE payment_history 
      SET status = ?
      WHERE id = ? AND user_id = ?
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
      WHERE subscription_id = ? AND user_id = ? AND payment_date = ?
    `;
    
    db.get(query, [subscriptionId, userId, paymentDate], (err, row) => {
      if (err) return callback(err);
      callback(null, row.count > 0);
    });
  }
}

module.exports = PaymentHistory;