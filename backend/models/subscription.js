const db = require('../db/database');
const moment = require('moment');

class Subscription {
  // 获取所有订阅
  static getAll(callback) {
    const query = `
      SELECT * FROM subscriptions 
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 获取单个订阅
  static getById(id, callback) {
    const query = `
      SELECT * FROM subscriptions 
      WHERE id = ?
    `;
    
    db.get(query, [id], (err, row) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, row);
    });
  }

  // 创建新订阅
  static create(subscription, callback) {
    const {
      name,
      description,
      provider,
      amount,
      currency,
      billing_cycle,
      cycle_count,
      start_date,
      next_payment_date,
      reminder_days,
      category,
      active
    } = subscription;

    const query = `
      INSERT INTO subscriptions (
        name, description, provider, amount, currency, 
        billing_cycle, cycle_count, start_date, next_payment_date, 
        reminder_days, category, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(
      query, 
      [
        name, 
        description, 
        provider,
        amount, 
        currency, 
        billing_cycle, 
        cycle_count || 1, 
        start_date, 
        next_payment_date, 
        reminder_days || 7, 
        category, 
        active || 1
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        callback(null, { id: this.lastID, ...subscription });
      }
    );
  }

  // 更新订阅
  static update(id, subscription, callback) {
    const {
      name,
      description,
      provider,
      amount,
      currency,
      billing_cycle,
      cycle_count,
      start_date,
      next_payment_date,
      reminder_days,
      category,
      active
    } = subscription;

    const query = `
      UPDATE subscriptions 
      SET name = ?,
          description = ?,
          provider = ?,
          amount = ?,
          currency = ?,
          billing_cycle = ?,
          cycle_count = ?,
          start_date = ?,
          next_payment_date = ?,
          reminder_days = ?,
          category = ?,
          active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(
      query, 
      [
        name, 
        description, 
        provider,
        amount, 
        currency, 
        billing_cycle, 
        cycle_count, 
        start_date, 
        next_payment_date, 
        reminder_days, 
        category, 
        active,
        id
      ], 
      function(err) {
        if (err) {
          return callback(err, null);
        }
        callback(null, { id, ...subscription });
      }
    );
  }

  // 删除订阅
  static delete(id, callback) {
    const query = `DELETE FROM subscriptions WHERE id = ?`;
    
    db.run(query, [id], function(err) {
      if (err) {
        return callback(err, null);
      }
      callback(null, { id, deleted: true });
    });
  }

  // 获取即将到期的订阅
  static getUpcoming(days = 7, callback) {
    const today = moment().format('YYYY-MM-DD');
    const futureDate = moment().add(days, 'days').format('YYYY-MM-DD');
    
    const query = `
      SELECT * FROM subscriptions 
      WHERE next_payment_date BETWEEN ? AND ?
      AND active = 1
      ORDER BY next_payment_date ASC
    `;
    
    db.all(query, [today, futureDate], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 计算每月花费
  static getMonthlySpending(callback) {
    const query = `
      SELECT 
        CASE
          WHEN billing_cycle = 'monthly' THEN amount
          WHEN billing_cycle = 'yearly' THEN amount / 12
          WHEN billing_cycle = 'half_yearly' THEN amount / 6
          WHEN billing_cycle = 'quarterly' THEN amount / 3
          WHEN billing_cycle = 'weekly' THEN amount * 4.33
          WHEN billing_cycle = 'daily' THEN amount * 30.44
          ELSE amount
        END as monthly_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 按货币分组计算总额
      const totals = {};
      rows.forEach(row => {
        if (!totals[row.currency]) {
          totals[row.currency] = 0;
        }
        totals[row.currency] += row.monthly_amount;
      });
      
      callback(null, { 
        details: rows,
        totals: totals
      });
    });
  }

  // 计算每年花费
  static getYearlySpending(callback) {
    const query = `
      SELECT 
        CASE
          WHEN billing_cycle = 'monthly' THEN amount * 12
          WHEN billing_cycle = 'yearly' THEN amount
          WHEN billing_cycle = 'half_yearly' THEN amount * 2
          WHEN billing_cycle = 'quarterly' THEN amount * 4
          WHEN billing_cycle = 'weekly' THEN amount * 52
          WHEN billing_cycle = 'daily' THEN amount * 365
          ELSE amount
        END as yearly_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      
      // 按货币分组计算总额
      const totals = {};
      rows.forEach(row => {
        if (!totals[row.currency]) {
          totals[row.currency] = 0;
        }
        totals[row.currency] += row.yearly_amount;
      });
      
      callback(null, { 
        details: rows,
        totals: totals
      });
    });
  }

  // 按类别分组统计
  static getSpendingByCategory(callback) {
    const query = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        currency,
        billing_cycle
      FROM subscriptions
      WHERE active = 1
      GROUP BY category, currency, billing_cycle
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }
}

module.exports = Subscription;
