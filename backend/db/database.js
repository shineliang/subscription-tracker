const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少 Supabase 环境变量');
  console.error('请在 .env 文件中设置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  process.exit(1);
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// 创建兼容旧 SQLite API 的数据库对象
const db = {
  // 查询单条记录（兼容回调式 API）
  get: (query, params, callback) => {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    // 首先尝试直接使用 Supabase 的 RPC 调用复杂查询
    if (query.includes('SUM(CASE') || query.includes('CASE WHEN')) {
      executeRawSQL(query, params, 'single')
        .then(result => {
          if (callback) callback(null, result);
        })
        .catch(error => {
          console.error('复杂查询错误:', error);
          if (callback) callback(error, null);
        });
      return;
    }
    
    // 解析 SQL 查询并转换为 Supabase 查询
    const parsedQuery = parseSelectQuery(query, params);
    if (!parsedQuery) {
      const error = new Error('Unsupported SQL query');
      console.error('数据库查询错误:', error);
      console.error('原始查询:', query);
      console.error('参数:', params);
      if (callback) callback(error, null);
      return;
    }
    
    // 执行 Supabase 查询
    executeSupabaseQuery(parsedQuery, 'single')
      .then(result => {
        if (callback) callback(null, result);
      })
      .catch(error => {
        console.error('数据库查询错误:', error);
        if (callback) callback(error, null);
      });
  },

  // 查询多条记录
  all: (query, params, callback) => {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    // 解析 SQL 查询并转换为 Supabase 查询
    const parsedQuery = parseSelectQuery(query, params);
    if (!parsedQuery) {
      const error = new Error('Unsupported SQL query');
      console.error('数据库查询错误:', error);
      if (callback) callback(error, null);
      return;
    }
    
    // 执行 Supabase 查询
    executeSupabaseQuery(parsedQuery, 'multiple')
      .then(result => {
        if (callback) callback(null, result || []);
      })
      .catch(error => {
        console.error('数据库查询错误:', error);
        if (callback) callback(error, null);
      });
  },

  // 执行操作（INSERT, UPDATE, DELETE）
  run: function(query, params, callback) {
    // 支持两种调用方式
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    
    // 解析并执行不同类型的操作
    const upperQuery = query.trim().toUpperCase();
    
    if (upperQuery.startsWith('INSERT')) {
      executeInsert(query, params, callback);
    } else if (upperQuery.startsWith('UPDATE')) {
      executeUpdate(query, params, callback);
    } else if (upperQuery.startsWith('DELETE')) {
      executeDelete(query, params, callback);
    } else if (upperQuery.startsWith('CREATE')) {
      // CREATE TABLE 语句 - Supabase 表应该通过仪表板创建
      console.log('跳过 CREATE TABLE 语句（表应该在 Supabase 仪表板中创建）');
      if (callback) callback.call({ lastID: null, changes: 0 }, null);
    } else {
      const error = new Error('Unsupported SQL operation');
      console.error('不支持的SQL操作:', query);
      if (callback) callback.call({ lastID: null, changes: 0 }, error);
    }
  },

  // 关闭连接（Supabase 不需要）
  close: (callback) => {
    if (callback) callback();
  }
};

// 解析 SELECT 查询
function parseSelectQuery(query, params) {
  try {
    // 移除多余的空白和换行
    const cleanQuery = query.replace(/\s+/g, ' ').trim();
    
    // 简单的 SQL 解析器，处理基本的 SELECT 语句
    const selectMatch = cleanQuery.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    
    if (!selectMatch) {
      return null;
    }
    
    const [, columns, table, whereClause, orderBy, limit] = selectMatch;
    
    const parsedQuery = {
      table,
      columns: columns === '*' ? '*' : columns.split(',').map(c => c.trim()),
      filters: {},
      orderBy: orderBy,
      limit: limit ? parseInt(limit) : null
    };
    
    // 解析 WHERE 子句
    if (whereClause) {
      const conditions = whereClause.split(/\s+AND\s+/i);
      let paramIndex = 0;
      
      conditions.forEach(condition => {
        // 处理 PostgreSQL 参数占位符 $1, $2, etc.
        const pgMatch = condition.match(/(\w+)\s*=\s*\$(\d+)/);
        if (pgMatch) {
          const paramNum = parseInt(pgMatch[2]) - 1;
          parsedQuery.filters[pgMatch[1]] = params[paramNum];
        } else {
          // 兼容旧的 SQLite 格式
          const sqliteMatch = condition.match(/(\w+)\s*=\s*\?/);
          if (sqliteMatch) {
            parsedQuery.filters[sqliteMatch[1]] = params[paramIndex++];
          } else {
            // 处理直接值（如 true, false, 数字等）
            const literalMatch = condition.match(/(\w+)\s*=\s*(\w+|'[^']*')/);
            if (literalMatch) {
              let value = literalMatch[2];
              // 处理布尔值
              if (value === 'true') value = true;
              else if (value === 'false') value = false;
              // 处理字符串（去掉引号）
              else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
              }
              // 处理数字
              else if (!isNaN(value)) {
                value = Number(value);
              }
              parsedQuery.filters[literalMatch[1]] = value;
            }
          }
        }
      });
    }
    
    return parsedQuery;
  } catch (error) {
    console.error('SQL 解析错误:', error);
    return null;
  }
}

// 执行原生 SQL 查询（用于复杂查询）
async function executeRawSQL(query, params, type) {
  try {
    // 替换参数占位符
    let processedQuery = query;
    
    // 处理 PostgreSQL 风格的参数 ($1, $2, etc.)
    if (query.includes('$')) {
      params.forEach((param, index) => {
        const value = typeof param === 'string' ? `'${param}'` : param;
        processedQuery = processedQuery.replace(new RegExp('\\$' + (index + 1), 'g'), value);
      });
    } else {
      // 处理 SQLite 风格的参数 (?)
      params.forEach((param) => {
        const value = typeof param === 'string' ? `'${param}'` : param;
        processedQuery = processedQuery.replace('?', value);
      });
    }
    
    console.log('执行原生SQL:', processedQuery);
    
    // 使用 Supabase 的 rpc 功能执行原生 SQL
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_query: processedQuery 
    });
    
    if (error) {
      // 如果 RPC 不可用，尝试使用简化的查询逻辑
      console.warn('RPC 执行失败，尝试简化查询:', error.message);
      return await executeFallbackQuery(query, params, type);
    }
    
    if (type === 'single') {
      return data && data.length > 0 ? data[0] : null;
    } else {
      return data || [];
    }
  } catch (error) {
    console.error('原生SQL执行错误:', error);
    // 如果原生SQL失败，尝试简化查询
    return await executeFallbackQuery(query, params, type);
  }
}

// 简化查询的回退逻辑
async function executeFallbackQuery(query, params, type) {
  // 对于预算计算查询，使用简化的逻辑
  if (query.includes('SUM(CASE') && query.includes('billing_cycle')) {
    const [userId, currency, category] = params;
    
    let supabaseQuery = supabase
      .from('subscriptions')
      .select('amount, billing_cycle')
      .eq('user_id', userId)
      .eq('active', true)
      .is('cancelled_at', null);
    
    if (currency) {
      supabaseQuery = supabaseQuery.eq('currency', currency);
    }
    
    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) throw error;
    
    // 在 JavaScript 中计算金额
    const spentAmount = data.reduce((sum, sub) => {
      let monthlyAmount = sub.amount;
      
      switch (sub.billing_cycle) {
        case 'yearly':
          monthlyAmount = sub.amount / 12;
          break;
        case 'half_yearly':
          monthlyAmount = sub.amount / 6;
          break;
        case 'quarterly':
          monthlyAmount = sub.amount / 3;
          break;
        case 'weekly':
          monthlyAmount = sub.amount * 4.33;
          break;
        case 'daily':
          monthlyAmount = sub.amount * 30.44;
          break;
        default:
          monthlyAmount = sub.amount; // monthly or default
      }
      
      return sum + monthlyAmount;
    }, 0);
    
    const result = { spent_amount: spentAmount };
    return type === 'single' ? result : [result];
  }
  
  throw new Error('无法处理的复杂查询');
}

// 执行 Supabase 查询
async function executeSupabaseQuery(parsedQuery, type) {
  // 将 columns 转换为字符串格式
  const selectColumns = Array.isArray(parsedQuery.columns) 
    ? parsedQuery.columns.join(', ') 
    : parsedQuery.columns;
  
  let query = supabase.from(parsedQuery.table).select(selectColumns);
  
  // 添加过滤条件
  Object.entries(parsedQuery.filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  // 添加排序
  if (parsedQuery.orderBy) {
    // 支持多列排序，如 "type, period, category" 或 "name DESC, date ASC"
    const orderClauses = parsedQuery.orderBy.split(',').map(clause => clause.trim());
    
    orderClauses.forEach(clause => {
      const parts = clause.split(/\s+/);
      const column = parts[0];
      const direction = parts[1] || 'ASC';
      query = query.order(column, { ascending: direction.toUpperCase() !== 'DESC' });
    });
  }
  
  // 添加限制
  if (parsedQuery.limit) {
    query = query.limit(parsedQuery.limit);
  }
  
  // 执行查询
  if (type === 'single') {
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 是"没有找到行"错误
    return data;
  } else {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

// 执行 INSERT 操作
async function executeInsert(query, params, callback) {
  try {
    // 解析 INSERT 语句
    const match = query.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!match) {
      throw new Error('Invalid INSERT query');
    }
    
    const [, table, columns, values] = match;
    const columnList = columns.split(',').map(c => c.trim());
    
    // 构建数据对象
    const data = {};
    let paramIndex = 0;
    values.split(',').forEach((value, index) => {
      const trimmedValue = value.trim();
      // 处理 PostgreSQL 参数占位符 $1, $2, etc.
      if (trimmedValue.match(/^\$\d+$/)) {
        const paramNum = parseInt(trimmedValue.substring(1)) - 1;
        data[columnList[index]] = params[paramNum];
      } else if (trimmedValue === '?') {
        // 兼容旧的 SQLite 格式
        data[columnList[index]] = params[paramIndex++];
      } else if (trimmedValue === 'true' || trimmedValue === 'false') {
        // 处理布尔值
        data[columnList[index]] = trimmedValue === 'true';
      } else if (trimmedValue === 'CURRENT_TIMESTAMP' || trimmedValue === 'NOW()') {
        // 处理时间戳
        data[columnList[index]] = new Date().toISOString();
      } else {
        // 处理直接值
        data[columnList[index]] = trimmedValue.replace(/'/g, '');
      }
    });
    
    // 执行 Supabase 插入
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    
    const thisObj = {
      lastID: result?.id || null,
      changes: 1
    };
    
    if (callback) callback.call(thisObj, null);
  } catch (error) {
    console.error('INSERT 操作错误:', error);
    if (callback) callback.call({ lastID: null, changes: 0 }, error);
  }
}

// 执行 UPDATE 操作
async function executeUpdate(query, params, callback) {
  try {
    // 解析 UPDATE 语句，使用 . 匹配换行符
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    console.log('UPDATE SQL:', normalizedQuery);
    console.log('UPDATE params:', params);
    
    const match = normalizedQuery.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (!match) {
      throw new Error('Invalid UPDATE query');
    }
    
    const [, table, setClause, whereClause] = match;
    
    // 解析 SET 子句
    const data = {};
    let paramIndex = 0;
    setClause.split(',').forEach(assignment => {
      const [column, value] = assignment.split('=').map(s => s.trim());
      // 处理 PostgreSQL 参数占位符
      if (value.match(/^\$\d+$/)) {
        const paramNum = parseInt(value.substring(1)) - 1;
        data[column] = params[paramNum];
      } else if (value === '?') {
        data[column] = params[paramIndex++];
      } else if (value === 'CURRENT_TIMESTAMP' || value === 'NOW()') {
        data[column] = new Date().toISOString();
      } else if (value === 'true' || value === 'false') {
        data[column] = value === 'true';
      } else {
        data[column] = value.replace(/'/g, '');
      }
    });
    
    // 解析 WHERE 子句
    const filters = {};
    whereClause.split(/\s+AND\s+/i).forEach(condition => {
      const parts = condition.split(/\s+/);
      const column = parts[0];
      const value = parts[parts.length - 1];
      
      if (value.match(/^\$\d+$/)) {
        const paramNum = parseInt(value.substring(1)) - 1;
        filters[column] = params[paramNum];
      } else if (value === '?') {
        filters[column] = params[paramIndex++];
      } else {
        filters[column] = value.replace(/'/g, '');
      }
    });
    
    console.log('UPDATE table:', table);
    console.log('UPDATE data:', data);
    console.log('UPDATE filters:', filters);
    
    // 执行 Supabase 更新
    let updateQuery = supabase.from(table).update(data);
    Object.entries(filters).forEach(([key, value]) => {
      updateQuery = updateQuery.eq(key, value);
    });
    
    // 使用 count 选项来获取更新的行数
    const { data: result, error, count } = await updateQuery.select('*', { count: 'exact' });
    
    if (error) {
      // 如果是没有找到要更新的行，不算错误
      if (error.code === 'PGRST116') {
        const thisObj = {
          lastID: null,
          changes: 0
        };
        if (callback) callback.call(thisObj, null);
        return;
      }
      throw error;
    }
    
    const thisObj = {
      lastID: null,
      changes: count !== null ? count : (result ? result.length : 0)
    };
    
    if (callback) callback.call(thisObj, null);
  } catch (error) {
    console.error('UPDATE 操作错误:', error);
    if (callback) callback.call({ lastID: null, changes: 0 }, error);
  }
}

// 执行 DELETE 操作
async function executeDelete(query, params, callback) {
  try {
    // 解析 DELETE 语句
    const match = query.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)/i);
    if (!match) {
      throw new Error('Invalid DELETE query');
    }
    
    const [, table, whereClause] = match;
    
    // 解析 WHERE 子句
    const filters = {};
    let paramIndex = 0;
    whereClause.split(/\s+AND\s+/i).forEach(condition => {
      const parts = condition.split(/\s+/);
      const column = parts[0];
      const value = parts[parts.length - 1];
      
      if (value.match(/^\$\d+$/)) {
        const paramNum = parseInt(value.substring(1)) - 1;
        filters[column] = params[paramNum];
      } else if (value === '?') {
        filters[column] = params[paramIndex++];
      } else {
        filters[column] = value.replace(/'/g, '');
      }
    });
    
    // 执行 Supabase 删除
    let deleteQuery = supabase.from(table).delete();
    Object.entries(filters).forEach(([key, value]) => {
      deleteQuery = deleteQuery.eq(key, value);
    });
    
    const { error } = await deleteQuery;
    
    if (error) throw error;
    
    const thisObj = {
      lastID: null,
      changes: 1 // Supabase 不返回删除的行数
    };
    
    if (callback) callback.call(thisObj, null);
  } catch (error) {
    console.error('DELETE 操作错误:', error);
    if (callback) callback.call({ lastID: null, changes: 0 }, error);
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // 表不存在，尝试创建
      console.log('用户表不存在，请在 Supabase 仪表板中创建表');
      console.log('或运行数据库迁移脚本');
    } else if (error) {
      throw error;
    } else {
      console.log('✅ Supabase数据库连接成功！');
    }
  } catch (error) {
    console.error('Supabase数据库连接失败:', error.message);
    console.error('请检查数据库配置和网络连接');
    console.error('确保在.env文件中设置了SUPABASE_URL和SUPABASE_ANON_KEY');
  }
}

// 启动时测试连接
testConnection();

module.exports = db;