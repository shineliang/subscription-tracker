/**
 * 数据库种子脚本 - 用于创建测试数据
 * 
 * 运行方式: node seedDB.js
 */

const db = require('./db/database');
const moment = require('moment');

// 模拟订阅数据
const subscriptions = [
  {
    name: 'JetBrains All Products',
    description: '开发工具订阅，含所有JetBrains产品',
    provider: 'JetBrains s.r.o.',
    amount: 1188,
    currency: 'CNY',
    billing_cycle: 'half_yearly',
    cycle_count: 1,
    start_date: moment().subtract(1, 'months').format('YYYY-MM-DD'),
    next_payment_date: moment().add(5, 'months').format('YYYY-MM-DD'),
    reminder_days: 14,
    category: '软件',
    active: 1
  },
  {
    name: 'Netflix',
    description: 'Netflix 标准会员订阅',
    provider: 'Netflix, Inc.',
    amount: 89.9,
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: moment().subtract(2, 'months').format('YYYY-MM-DD'),
    next_payment_date: moment().add(5, 'days').format('YYYY-MM-DD'),
    reminder_days: 7,
    category: '视频',
    active: 1
  },
  {
    name: 'Spotify Premium',
    description: '音乐流媒体订阅',
    provider: 'Spotify AB',
    amount: 49,
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: moment().subtract(3, 'months').format('YYYY-MM-DD'),
    next_payment_date: moment().add(12, 'days').format('YYYY-MM-DD'),
    reminder_days: 5,
    category: '音乐',
    active: 1
  },
  {
    name: 'Adobe Creative Cloud',
    description: '全家桶订阅',
    provider: 'Adobe Inc.',
    amount: 888,
    currency: 'CNY',
    billing_cycle: 'yearly',
    cycle_count: 1,
    start_date: moment().subtract(6, 'months').format('YYYY-MM-DD'),
    next_payment_date: moment().add(6, 'months').format('YYYY-MM-DD'),
    reminder_days: 14,
    category: '软件',
    active: 1
  },
  {
    name: 'Apple Music',
    description: '音乐流媒体服务',
    provider: 'Apple Inc.',
    amount: 58,
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: moment().subtract(1, 'month').format('YYYY-MM-DD'),
    next_payment_date: moment().add(2, 'days').format('YYYY-MM-DD'),
    reminder_days: 3,
    category: '音乐',
    active: 1
  },
  {
    name: 'iCloud 200GB',
    description: 'iCloud存储空间订阅',
    provider: 'Apple Inc.',
    amount: 21,
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: moment().subtract(2, 'weeks').format('YYYY-MM-DD'),
    next_payment_date: moment().add(2, 'weeks').format('YYYY-MM-DD'),
    reminder_days: 3,
    category: '云存储',
    active: 1
  },
  {
    name: 'Microsoft 365',
    description: 'Office全家桶订阅',
    provider: 'Microsoft Corporation',
    amount: 498,
    currency: 'CNY',
    billing_cycle: 'yearly',
    cycle_count: 1,
    start_date: moment().subtract(3, 'months').format('YYYY-MM-DD'),
    next_payment_date: moment().add(9, 'months').format('YYYY-MM-DD'),
    reminder_days: 14,
    category: '软件',
    active: 1
  },
  {
    name: 'YouTube Premium',
    description: '无广告YouTube体验',
    provider: 'Google LLC',
    amount: 68,
    currency: 'CNY',
    billing_cycle: 'monthly',
    cycle_count: 1,
    start_date: moment().subtract(2, 'weeks').format('YYYY-MM-DD'),
    next_payment_date: moment().add(2, 'weeks').format('YYYY-MM-DD'),
    reminder_days: 5,
    category: '视频',
    active: 1
  },
  {
    name: 'Nintendo Switch Online',
    description: '任天堂在线服务',
    provider: 'Nintendo Co., Ltd.',
    amount: 148,
    currency: 'CNY',
    billing_cycle: 'yearly',
    cycle_count: 1,
    start_date: moment().subtract(8, 'months').format('YYYY-MM-DD'),
    next_payment_date: moment().add(4, 'months').format('YYYY-MM-DD'),
    reminder_days: 7,
    category: '游戏',
    active: 1
  }
];

// 清空并重新创建表
db.serialize(() => {
  console.log('开始清空数据库...');
  db.run('DELETE FROM reminders');
  db.run('DELETE FROM subscriptions');
  db.run('DELETE FROM notification_settings');
  
  console.log('开始插入测试数据...');
  
  // 插入默认通知设置
  db.run(`
    INSERT INTO notification_settings 
    (email, notify_days_before, email_notifications, browser_notifications)
    VALUES (?, ?, ?, ?)
  `, ['example@example.com', 7, 0, 1]);
  
  // 插入订阅数据
  const stmt = db.prepare(`
    INSERT INTO subscriptions 
    (name, description, provider, amount, currency, billing_cycle, cycle_count,
     start_date, next_payment_date, reminder_days, category, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  subscriptions.forEach(subscription => {
    stmt.run(
      subscription.name,
      subscription.description,
      subscription.provider,
      subscription.amount,
      subscription.currency,
      subscription.billing_cycle,
      subscription.cycle_count,
      subscription.start_date,
      subscription.next_payment_date,
      subscription.reminder_days,
      subscription.category,
      subscription.active,
      function(err) {
        if (err) {
          return console.error('插入订阅数据失败:', err.message);
        }
        
        // 为每个订阅创建提醒
        const subId = this.lastID;
        const reminderDate = moment(subscription.next_payment_date)
          .subtract(subscription.reminder_days, 'days')
          .format('YYYY-MM-DD');
        
        db.run(`
          INSERT INTO reminders (subscription_id, reminder_date)
          VALUES (?, ?)
        `, [subId, reminderDate], function(reminderErr) {
          if (reminderErr) {
            console.error('插入提醒数据失败:', reminderErr.message);
          }
        });
      }
    );
  });
  
  stmt.finalize();
  
  // 验证数据
  console.log('正在验证插入的数据...');
  db.get('SELECT COUNT(*) as count FROM subscriptions', (err, row) => {
    if (err) {
      console.error('查询失败:', err.message);
    } else {
      console.log(`成功插入 ${row.count} 条订阅数据`);
    }
  });
  
  db.get('SELECT COUNT(*) as count FROM reminders', (err, row) => {
    if (err) {
      console.error('查询失败:', err.message);
    } else {
      console.log(`成功插入 ${row.count} 条提醒数据`);
    }
  });
  
  console.log('数据库种子数据创建完成! 👍');
});
