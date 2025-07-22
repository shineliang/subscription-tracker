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
  max: 20, // 连接池最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
};

// 创建连接池
const pool = new Pool(pgConfig);

// 错误处理
pool.on('error', (err, client) => {
  console.error('数据库连接池错误:', err);
});

// 数据库操作包装函数
const db = {
  // 查询单条记录
  get: async (query, params = []) => {
    try {
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    }
  },

  // 查询多条记录
  all: async (query, params = []) => {
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    }
  },

  // 执行操作（INSERT, UPDATE, DELETE）
  run: async (query, params = []) => {
    try {
      const result = await pool.query(query, params);
      return {
        affectedRows: result.rowCount,
        insertId: result.rows[0]?.id || null
      };
    } catch (error) {
      console.error('数据库操作错误:', error);
      throw error;
    }
  },

  // 执行带返回的插入操作
  insert: async (query, params = []) => {
    try {
      // 确保查询包含 RETURNING 子句
      const queryWithReturning = query.includes('RETURNING') ? query : `${query} RETURNING id`;
      const result = await pool.query(queryWithReturning, params);
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error('数据库插入错误:', error);
      throw error;
    }
  },

  // 开始事务
  beginTransaction: async () => {
    const client = await pool.connect();
    await client.query('BEGIN');
    return client;
  },

  // 提交事务
  commit: async (client) => {
    await client.query('COMMIT');
    client.release();
  },

  // 回滚事务
  rollback: async (client) => {
    await client.query('ROLLBACK');
    client.release();
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
    const result = await db.get('SELECT NOW() as current_time');
    console.log('PostgreSQL数据库连接成功:', result.current_time);
  } catch (error) {
    console.error('PostgreSQL数据库连接失败:', error.message);
    console.error('请检查数据库配置和网络连接');
  }
})();