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
        },
        {
          name: '005_add_cancelled_at_to_subscriptions',
          up: this.migration_005_add_cancelled_at_to_subscriptions.bind(this)
        },
        {
          name: '006_add_budget_tables',
          up: this.migration_006_add_budget_tables.bind(this)
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

  // 迁移4: 添加订阅历史记录表
  async migration_004_add_subscription_history_tables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 创建订阅变更历史表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS subscription_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subscription_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            change_type TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'reactivated'
            field_name TEXT, -- 具体变更的字段名
            old_value TEXT, -- 旧值
            new_value TEXT, -- 新值
            change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT, -- 备注
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `, (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
          
          // 创建付款历史表
          this.db.run(`
            CREATE TABLE IF NOT EXISTS payment_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              subscription_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              amount DECIMAL(10,2) NOT NULL,
              currency TEXT DEFAULT 'CNY',
              payment_date DATE NOT NULL,
              payment_method TEXT, -- '支付宝', '微信', '信用卡', '银行转账', '其他'
              status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed'
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id)
            )
          `, (err2) => {
            if (err2) {
              this.db.run('ROLLBACK');
              return reject(err2);
            }
            
            // 创建索引以提高查询性能
            this.db.run('CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id)');
            this.db.run('CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date)');
            
            // 为现有订阅创建初始历史记录
            this.db.run(`
              INSERT INTO subscription_history (subscription_id, user_id, change_type, notes)
              SELECT id, user_id, 'created', '从旧系统迁移'
              FROM subscriptions
            `, (err3) => {
              if (err3) {
                this.db.run('ROLLBACK');
                return reject(err3);
              }
              
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

  // 迁移5: 为订阅表添加cancelled_at字段
  async migration_005_add_cancelled_at_to_subscriptions() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 添加cancelled_at列
        this.db.run(`
          ALTER TABLE subscriptions 
          ADD COLUMN cancelled_at TIMESTAMP DEFAULT NULL
        `, (err) => {
          if (err) {
            // 如果列已存在，忽略错误
            if (!err.message.includes('duplicate column name')) {
              this.db.run('ROLLBACK');
              return reject(err);
            }
          }
          
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

  // 迁移6: 添加预算管理相关表
  async migration_006_add_budget_tables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // 创建预算表
        this.db.run(`
          CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('total', 'category')), -- 总预算或分类预算
            period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')), -- 预算周期
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT DEFAULT 'CNY',
            category TEXT, -- 如果是分类预算，指定类别
            warning_threshold INTEGER DEFAULT 80, -- 预警阈值（百分比）
            is_active INTEGER DEFAULT 1,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, type, period, category)
          )
        `, (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
          
          // 创建预算历史表（记录预算变更）
          this.db.run(`
            CREATE TABLE IF NOT EXISTS budget_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              budget_id INTEGER NOT NULL,
              user_id INTEGER NOT NULL,
              period_start DATE NOT NULL,
              period_end DATE NOT NULL,
              budget_amount DECIMAL(10,2) NOT NULL,
              spent_amount DECIMAL(10,2) DEFAULT 0,
              remaining_amount DECIMAL(10,2),
              usage_percentage DECIMAL(5,2),
              exceeded INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(id)
            )
          `, (err2) => {
            if (err2) {
              this.db.run('ROLLBACK');
              return reject(err2);
            }
            
            // 创建预算警告记录表
            this.db.run(`
              CREATE TABLE IF NOT EXISTS budget_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                budget_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                alert_type TEXT NOT NULL CHECK(alert_type IN ('warning', 'exceeded')),
                usage_percentage DECIMAL(5,2) NOT NULL,
                message TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
              )
            `, (err3) => {
              if (err3) {
                this.db.run('ROLLBACK');
                return reject(err3);
              }
              
              // 创建索引
              this.db.run('CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)');
              this.db.run('CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category)');
              this.db.run('CREATE INDEX IF NOT EXISTS idx_budget_history_budget_id ON budget_history(budget_id)');
              this.db.run('CREATE INDEX IF NOT EXISTS idx_budget_history_period ON budget_history(period_start, period_end)');
              this.db.run('CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_id ON budget_alerts(user_id)');
              this.db.run('CREATE INDEX IF NOT EXISTS idx_budget_alerts_is_read ON budget_alerts(is_read)');
              
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
}

module.exports = DatabaseMigration;