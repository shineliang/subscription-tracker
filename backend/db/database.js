const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// PostgreSQL连接配置
const pgConfig = {
  host: process.env.PG_HOST || '192.168.1.73',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'subscription_tracker',
  user: process.env.PG_USER || 'subscription_app',
  password: process.env.PG_PASSWORD || 'sub_app_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// 创建连接池
const pool = new Pool(pgConfig);

// 错误处理
pool.on('error', (err, client) => {
  console.error('数据库连接池错误:', err);
});

// 兼容旧的回调式API的数据库对象
const db = {
  // 查询单条记录（回调式）
  get: (query, params, callback) => {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    pool.query(query, params)
      .then(result => {
        callback(null, result.rows[0] || null);
      })
      .catch(error => {
        console.error('数据库查询错误:', error);
        callback(error, null);
      });
  },

  // 查询多条记录（回调式）
  all: (query, params, callback) => {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    pool.query(query, params)
      .then(result => {
        callback(null, result.rows);
      })
      .catch(error => {
        console.error('数据库查询错误:', error);
        callback(error, null);
      });
  },

  // 执行操作（INSERT, UPDATE, DELETE）（回调式）
  run: function(query, params, callback) {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    // 处理INSERT语句，自动添加RETURNING id
    if (query.trim().toUpperCase().startsWith('INSERT') && !query.includes('RETURNING')) {
      query = query.trim().replace(/;?\s*$/, ' RETURNING id');
    }
    
    pool.query(query, params)
      .then(result => {
        // 模拟SQLite的this对象
        const thisObj = {
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount
        };
        
        if (callback) {
          callback.call(thisObj, null);
        }
      })
      .catch(error => {
        console.error('数据库操作错误:', error);
        if (callback) {
          callback.call({ lastID: null, changes: 0 }, error);
        }
      });
  },

  // 关闭连接池
  close: async () => {
    await pool.end();
  }
};

// 导出数据库对象
module.exports = db;

// 测试数据库连接
(async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('PostgreSQL数据库连接成功:', result.rows[0].current_time);
  } catch (error) {
    console.error('PostgreSQL数据库连接失败:', error.message);
    console.error('请检查数据库配置和网络连接');
  }
})();