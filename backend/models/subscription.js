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

  // 按类别分组统计(增强版本)
  static getSpendingByCategory(timeframe = 'monthly', callback) {
    // 根据时间范围选择合适的计算方法
    const amountExpression = timeframe === 'monthly' ? 
      `CASE
        WHEN billing_cycle = 'monthly' THEN amount
        WHEN billing_cycle = 'yearly' THEN amount / 12
        WHEN billing_cycle = 'half_yearly' THEN amount / 6
        WHEN billing_cycle = 'quarterly' THEN amount / 3
        WHEN billing_cycle = 'weekly' THEN amount * 4.33
        WHEN billing_cycle = 'daily' THEN amount * 30.44
        ELSE amount
      END` : 
      `CASE
        WHEN billing_cycle = 'monthly' THEN amount * 12
        WHEN billing_cycle = 'yearly' THEN amount
        WHEN billing_cycle = 'half_yearly' THEN amount * 2
        WHEN billing_cycle = 'quarterly' THEN amount * 4
        WHEN billing_cycle = 'weekly' THEN amount * 52
        WHEN billing_cycle = 'daily' THEN amount * 365
        ELSE amount
      END`;
    
    const query = `
      SELECT 
        category,
        COUNT(*) as subscription_count,
        SUM(${amountExpression}) as total_amount,
        currency
      FROM subscriptions
      WHERE active = 1
      GROUP BY category, currency
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return callback(err, null);
      }
      callback(null, rows);
    });
  }

  // 获取月度趋势数据
  static getMonthlyTrend(callback) {
    const months = 12; // 获取过去12个月的数据
    const results = [];
    
    // 生成过去12个月的月份列表
    for (let i = 0; i < months; i++) {
      const monthDate = moment().subtract(i, 'months');
      const monthName = monthDate.format('YYYY-MM');
      const monthStart = monthDate.startOf('month').format('YYYY-MM-DD');
      const monthEnd = monthDate.endOf('month').format('YYYY-MM-DD');
      
      results.push({
        month: monthName,
        label: monthDate.format('YYYY年M月'),
        monthStart: monthStart,
        monthEnd: monthEnd
      });
    }
    
    // 查询所有活跃订阅
    const query = `
      SELECT 
        id,
        name,
        amount,
        currency,
        billing_cycle,
        start_date,
        next_payment_date
      FROM subscriptions
      WHERE active = 1
    `;
    
    db.all(query, [], (err, subscriptions) => {
      if (err) {
        return callback(err, null);
      }
      
      // 计算每个订阅在每个月的支出
      results.forEach(month => {
        const monthlyCosts = {};
        
        subscriptions.forEach(sub => {
          // 检查订阅在当前月是否应该计算（开始日期早于或等于月末）
          const startDate = moment(sub.start_date);
          const monthEnd = moment(month.monthEnd);
          
          if (startDate.isSameOrBefore(monthEnd)) {
            // 根据计费周期计算该月应该的支出
            let monthlyAmount = 0;
            
            switch (sub.billing_cycle) {
              case 'monthly':
                // 每月付款
                monthlyAmount = sub.amount;
                break;
              case 'yearly':
                // 年付，分摊到每个月
                monthlyAmount = sub.amount / 12;
                break;
              case 'half_yearly':
                // 半年付，分摊到每个月
                monthlyAmount = sub.amount / 6;
                break;
              case 'quarterly':
                // 季付，分摊到每个月
                monthlyAmount = sub.amount / 3;
                break;
              case 'weekly':
                // 周付，乘以一个月的平均周数
                monthlyAmount = sub.amount * 4.33;
                break;
              case 'daily':
                // 日付，乘以一个月的平均天数
                monthlyAmount = sub.amount * 30.44;
                break;
              default:
                monthlyAmount = sub.amount;
            }
            
            // 增加到该货币的总额中
            if (!monthlyCosts[sub.currency]) {
              monthlyCosts[sub.currency] = 0;
            }
            monthlyCosts[sub.currency] += monthlyAmount;
          }
        });
        
        // 设置该月的总支出
        month.amounts = monthlyCosts;
        month.amount = monthlyCosts['CNY'] || 0; // 默认展示CNY
        month.currency = 'CNY';
      });
      
      // 按月份降序排序（从最近到最远）
      results.sort((a, b) => {
        return moment(b.month).diff(moment(a.month));
      });
      
      callback(null, results);
    });
  }
}

module.exports = Subscription;
