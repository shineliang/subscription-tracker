const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 确保db目录存在
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'subscription_tracker.db');
const db = new sqlite3.Database(dbPath);

// 初始化数据库表
const initDb = () => {
  db.serialize(() => {
    // 创建订阅表
    db.run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        provider TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'CNY',
        billing_cycle TEXT NOT NULL,
        cycle_count INTEGER DEFAULT 1,
        start_date TEXT NOT NULL,
        next_payment_date TEXT NOT NULL,
        reminder_days INTEGER DEFAULT 7,
        category TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建提醒表
    db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id INTEGER NOT NULL,
        reminder_date TEXT NOT NULL,
        sent INTEGER DEFAULT 0,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
      )
    `);

    // 创建通知设置表
    db.run(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        notify_days_before INTEGER DEFAULT 7,
        email_notifications INTEGER DEFAULT 1,
        browser_notifications INTEGER DEFAULT 1
      )
    `);

    console.log('Database initialized successfully');
  });
};

// 运行初始化
initDb();

module.exports = db;
