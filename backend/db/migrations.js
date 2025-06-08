const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseMigration {
  constructor(db) {
    this.db = db;
  }

  // 创建迁移记录表
  async createMigrationTable() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // 检查迁移是否已执行
  async isMigrationExecuted(name) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM migrations WHERE name = ?',
        [name],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  // 记录迁移执行
  async recordMigration(name) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO migrations (name) VALUES (?)',
        [name],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // 执行迁移
  async runMigrations() {
    try {
      await this.createMigrationTable();
      
      const migrations = [
        {
          name: '001_add_users_table',
          up: this.migration_001_add_users_table.bind(this)
        },
        {
          name: '002_add_user_id_to_subscriptions',
          up: this.migration_002_add_user_id_to_subscriptions.bind(this)
        },
        {
          name: '003_add_user_id_to_notification_settings',
          up: this.migration_003_add_user_id_to_notification_settings.bind(this)
        },
        {
          name: '004_add_subscription_history_tables',
          up: this.migration_004_add_subscription_history_tables.bind(this)
        }
      ];

      for (const migration of migrations) {
        const executed = await this.isMigrationExecuted(migration.name);
        if (!executed) {
          console.log(`执行迁移: ${migration.name}`);
          await migration.up();
          await this.recordMigration(migration.name);
          console.log(`迁移完成: ${migration.name}`);
        }
      }

      console.log('所有数据库迁移已完成');
    } catch (error) {
      console.error('数据库迁移失败:', error);
      throw error;
    }
  }

  // 迁移1: 创建用户表
  async migration_001_add_users_table() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 创建用户表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login_at TIMESTAMP
          )
        `, (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
          
          // 创建索引
          this.db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
          this.db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
          
          this.db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              this.db.run('ROLLBACK');
              reject(commitErr);
            } else {
              resolve();
            }
          });
        });
      });
    });
  }

  // 迁移2: 为订阅表添加user_id
  async migration_002_add_user_id_to_subscriptions() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 添加user_id列
        this.db.run(`
          ALTER TABLE subscriptions 
          ADD COLUMN user_id INTEGER
        `, (err) => {
          if (err) {
            // 如果列已存在，忽略错误
            if (!err.message.includes('duplicate column name')) {
              this.db.run('ROLLBACK');
              return reject(err);
            }
          }
          
          // 创建默认用户（用于迁移现有数据）
          this.db.run(`
            INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name) 
            VALUES (1, 'admin', 'admin@example.com', '$2b$10$YourHashHere', '系统管理员')
          `, (userErr) => {
            if (userErr && !userErr.message.includes('UNIQUE constraint failed')) {
              this.db.run('ROLLBACK');
              return reject(userErr);
            }
            
            // 将现有订阅分配给默认用户
            this.db.run(`
              UPDATE subscriptions 
              SET user_id = 1 
              WHERE user_id IS NULL
            `, (updateErr) => {
              if (updateErr) {
                this.db.run('ROLLBACK');
                return reject(updateErr);
              }
              
              // 创建索引
              this.db.run('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)');
              
              this.db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  this.db.run('ROLLBACK');
                  reject(commitErr);
                } else {
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  }

  // 迁移3: 为通知设置表添加user_id
  async migration_003_add_user_id_to_notification_settings() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 备份现有数据
        this.db.run(`
          CREATE TABLE IF NOT EXISTS notification_settings_backup AS 
          SELECT * FROM notification_settings
        `);
        
        // 删除旧表
        this.db.run('DROP TABLE IF EXISTS notification_settings');
        
        // 创建新表结构
        this.db.run(`
          CREATE TABLE notification_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            email TEXT,
            notify_days_before INTEGER DEFAULT 7,
            email_notifications INTEGER DEFAULT 1,
            browser_notifications INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id)
          )
        `, (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
          
          // 恢复数据并分配给默认用户
          this.db.run(`
            INSERT INTO notification_settings (user_id, email, notify_days_before, email_notifications, browser_notifications)
            SELECT 1, email, notify_days_before, email_notifications, browser_notifications
            FROM notification_settings_backup
          `, (restoreErr) => {
            if (restoreErr && !restoreErr.message.includes('no such table')) {
              this.db.run('ROLLBACK');
              return reject(restoreErr);
            }
            
            // 删除备份表
            this.db.run('DROP TABLE IF EXISTS notification_settings_backup');
            
            // 创建索引
            this.db.run('CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id)');
            
            this.db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                this.db.run('ROLLBACK');
                reject(commitErr);
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  }
}

module.exports = DatabaseMigration;