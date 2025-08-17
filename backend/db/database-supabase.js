const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://cwmtexaliunqpyjnancf.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bXRleGFsaXVucXB5am5hbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTg3NDEsImV4cCI6MjA2OTY5NDc0MX0.K_zAp8D5iooLl-bymczH41ctwBTe-M5yPcknwcoQ-RY';

// PostgreSQL连接配置 - 使用Supabase的数据库连接
const pgConfig = {
  host: process.env.SUPABASE_DB_HOST || 'db.cwmtexaliunqpyjnancf.supabase.co',
  port: process.env.SUPABASE_DB_PORT || 5432,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD, // 需要在.env中设置
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

// 创建Supabase客户端（用于认证和实时功能）
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
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

// 导出数据库对象、连接池和Supabase客户端
module.exports = {
  db,
  pool,
  supabase
};

// 测试数据库连接
(async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Supabase PostgreSQL数据库连接成功:', result.rows[0].current_time);
  } catch (error) {
    console.error('Supabase PostgreSQL数据库连接失败:', error.message);
    console.error('请检查数据库配置和网络连接');
  }
})();