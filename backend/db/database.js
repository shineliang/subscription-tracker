const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.isClosing = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      // 确保db目录存在
      const dbDir = path.join(__dirname);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, 'subscription_tracker.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err);
          reject(err);
        } else {
          console.log('数据库连接成功');
          this.initDb().then(resolve).catch(reject);
        }
      });
    });
  }

  initDb() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 创建订阅表
        this.db.run(`
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
        this.db.run(`
          CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_id INTEGER NOT NULL,
            reminder_date TEXT NOT NULL,
            sent INTEGER DEFAULT 0,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
          )
        `);

        // 创建通知设置表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS notification_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            notify_days_before INTEGER DEFAULT 7,
            email_notifications INTEGER DEFAULT 1,
            browser_notifications INTEGER DEFAULT 1
          )
        `);

        this.db.run('COMMIT', (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            console.error('数据库初始化失败:', err);
            reject(err);
          } else {
            console.log('数据库初始化成功');
            resolve();
          }
        });
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.isClosing) {
        resolve();
        return;
      }
      
      this.isClosing = true;
      
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('数据库关闭失败:', err);
            reject(err);
          } else {
            console.log('数据库连接已关闭');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getConnection() {
    if (!this.db) {
      throw new Error('数据库未连接，请先调用 connect() 方法');
    }
    return this.db;
  }
}

// 创建单例实例
const database = new Database();

// 自动连接数据库
database.connect().catch(err => {
  console.error('初始数据库连接失败:', err);
  process.exit(1);
});

// 导出数据库连接和实例
module.exports = database.getConnection();
module.exports.database = database;
