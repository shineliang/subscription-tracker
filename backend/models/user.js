const bcrypt = require('bcryptjs');
const db = require('../db/database');

class User {
  // 创建新用户
  static async create(userData, callback) {
    const { username, email, password, full_name } = userData;
    
    try {
      // 验证必需字段
      if (!username || !email || !password) {
        return callback(new Error('用户名、邮箱和密码为必填项'));
      }

      // 检查用户名是否已存在
      const existingUser = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM users WHERE username = $1 OR email = $2`,
          [username, email],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingUser) {
        return callback(new Error('用户名或邮箱已存在'));
      }

      // 加密密码
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 插入新用户
      const query = `
        INSERT INTO users (username, email, password_hash, full_name)
        VALUES ($1, $2, $3, $4)
      `;
      
      db.run(query, [username, email, passwordHash, full_name || null], function(err) {
        if (err) {
          return callback(err);
        }
        
        // 返回新创建的用户（不包含密码）
        User.getById(this.lastID, callback);
      });
      
    } catch (error) {
      callback(error);
    }
  }

  // 根据ID获取用户
  static getById(id, callback) {
    const query = `
      SELECT id, username, email, full_name, is_active, created_at, updated_at, last_login_at
      FROM users
      WHERE id = $1
    `;
    
    db.get(query, [id], (err, user) => {
      callback(err, user);
    });
  }

  // 根据用户名获取用户
  static getByUsername(username, callback) {
    const query = `
      SELECT id, username, email, password_hash, full_name, is_active, created_at, updated_at, last_login_at
      FROM users
      WHERE username = $1
    `;
    
    db.get(query, [username], (err, user) => {
      callback(err, user);
    });
  }

  // 根据邮箱获取用户
  static getByEmail(email, callback) {
    const query = `
      SELECT id, username, email, password_hash, full_name, is_active, created_at, updated_at, last_login_at
      FROM users
      WHERE email = $1
    `;
    
    db.get(query, [email], (err, user) => {
      callback(err, user);
    });
  }

  // 验证密码
  static async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }

  // 更新用户信息
  static update(id, userData, callback) {
    const { email, full_name, is_active } = userData;
    const updates = [];
    const values = [];

    if (email !== undefined) {
      updates.push('email = $' + (values.length + 1));
      values.push(email);
    }
    if (full_name !== undefined) {
      updates.push('full_name = $' + (values.length + 1));
      values.push(full_name);
    }
    if (is_active !== undefined) {
      updates.push('is_active = $' + (values.length + 1));
      values.push(is_active);
    }

    if (updates.length === 0) {
      return callback(new Error('没有要更新的字段'));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
    `;

    db.run(query, values, function(err) {
      if (err) {
        return callback(err);
      }
      
      if (this.changes === 0) {
        return callback(new Error('用户不存在'));
      }
      
      User.getById(id, callback);
    });
  }

  // 更新密码
  static async updatePassword(id, newPassword, callback) {
    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      db.run(query, [passwordHash, id], function(err) {
        if (err) {
          return callback(err);
        }
        
        if (this.changes === 0) {
          return callback(new Error('用户不存在'));
        }
        
        callback(null, { message: '密码更新成功' });
      });
    } catch (error) {
      callback(error);
    }
  }

  // 更新最后登录时间
  static updateLastLogin(id, callback) {
    const query = `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    db.run(query, [id], (err) => {
      callback(err);
    });
  }

  // 删除用户（软删除）
  static delete(id, callback) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    db.run(query, [id], function(err) {
      if (err) {
        return callback(err);
      }
      
      if (this.changes === 0) {
        return callback(new Error('用户不存在'));
      }
      
      callback(null, { message: '用户已删除' });
    });
  }

  // 获取用户的订阅统计
  static getStatistics(userId, callback) {
    const query = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN active = true THEN 1 END) as active_subscriptions,
        SUM(CASE WHEN active = true THEN amount ELSE 0 END) as total_monthly_amount
      FROM subscriptions
      WHERE user_id = $1
    `;

    db.get(query, [userId], (err, stats) => {
      callback(err, stats);
    });
  }
}

module.exports = User;