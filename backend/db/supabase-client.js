const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://cwmtexaliunqpyjnancf.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bXRleGFsaXVucXB5am5hbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTg3NDEsImV4cCI6MjA2OTY5NDc0MX0.K_zAp8D5iooLl-bymczH41ctwBTe-M5yPcknwcoQ-RY';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // 用于服务端操作，需要更高权限

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 兼容旧的回调式API的数据库对象
const db = {
  // 查询单条记录（回调式）
  get: async (query, params, callback) => {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    try {
      // 将SQL查询转换为Supabase RPC调用
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query,
        params: params
      });
      
      if (error) throw error;
      callback(null, data && data[0] || null);
    } catch (error) {
      console.error('数据库查询错误:', error);
      callback(error, null);
    }
  },

  // 查询多条记录（回调式）
  all: async (query, params, callback) => {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    try {
      // 将SQL查询转换为Supabase RPC调用
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query,
        params: params
      });
      
      if (error) throw error;
      callback(null, data || []);
    } catch (error) {
      console.error('数据库查询错误:', error);
      callback(error, null);
    }
  },

  // 执行操作（INSERT, UPDATE, DELETE）（回调式）
  run: async function(query, params, callback) {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    try {
      // 处理INSERT语句，自动添加RETURNING id
      if (query.trim().toUpperCase().startsWith('INSERT') && !query.includes('RETURNING')) {
        query = query.trim().replace(/;?\s*$/, ' RETURNING id');
      }
      
      // 将SQL查询转换为Supabase RPC调用
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query,
        params: params
      });
      
      if (error) throw error;
      
      // 模拟SQLite的this对象
      const thisObj = {
        lastID: data && data[0]?.id || null,
        changes: data ? data.length : 0
      };
      
      if (callback) {
        callback.call(thisObj, null);
      }
    } catch (error) {
      console.error('数据库操作错误:', error);
      if (callback) {
        callback.call({ lastID: null, changes: 0 }, error);
      }
    }
  },

  // 关闭连接（Supabase不需要关闭）
  close: async () => {
    // Supabase客户端不需要显式关闭
    console.log('Supabase连接已关闭');
  }
};

// 导出数据库对象和Supabase客户端
module.exports = {
  db,
  supabase
};

// 测试数据库连接
(async () => {
  try {
    const { data, error } = await supabase.from('users').select('count(*)').limit(1);
    if (error) throw error;
    console.log('Supabase数据库连接成功');
  } catch (error) {
    console.error('Supabase数据库连接失败:', error.message);
    console.error('请检查Supabase配置和网络连接');
  }
})();