const fs = require('fs');
const path = require('path');

// 需要转换的文件列表
const filesToConvert = [
  'models/user.js',
  'models/subscription.js',
  'models/paymentHistory.js',
  'models/notificationSetting.js',
  'models/budget.js',
  'db/migrations.js',
  'routes/api.js'
];

// 转换规则
const conversions = [
  // 1. 转换 ? 占位符为 $n
  {
    name: '占位符转换',
    process: (content) => {
      // 匹配SQL查询语句
      const sqlRegex = /(query|run|get|all|insert)\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
      
      return content.replace(sqlRegex, (match, method, sql) => {
        // 计算 ? 的数量
        const placeholderCount = (sql.match(/\?/g) || []).length;
        
        if (placeholderCount === 0) return match;
        
        // 替换 ? 为 $n
        let index = 0;
        const newSql = sql.replace(/\?/g, () => `$${++index}`);
        
        return `${method}(\`${newSql}\``;
      });
    }
  },
  
  // 2. 转换 strftime 函数
  {
    name: 'strftime函数转换',
    process: (content) => {
      // strftime('%Y-%m', payment_date) -> TO_CHAR(payment_date, 'YYYY-MM')
      content = content.replace(
        /strftime\('%Y-%m',\s*payment_date\)/g,
        "TO_CHAR(payment_date, 'YYYY-MM')"
      );
      
      // strftime('%Y', payment_date) -> TO_CHAR(payment_date, 'YYYY')
      content = content.replace(
        /strftime\('%Y',\s*payment_date\)/g,
        "TO_CHAR(payment_date, 'YYYY')"
      );
      
      return content;
    }
  },
  
  // 3. 转换 AUTOINCREMENT
  {
    name: 'AUTOINCREMENT转换',
    process: (content) => {
      return content.replace(
        /INTEGER PRIMARY KEY AUTOINCREMENT/g,
        'SERIAL PRIMARY KEY'
      );
    }
  },
  
  // 4. 转换 date('now')
  {
    name: 'date函数转换',
    process: (content) => {
      return content.replace(
        /DATE\('now'\)/gi,
        'CURRENT_DATE'
      );
    }
  },
  
  // 5. 转换布尔值（在特定上下文中）
  {
    name: '布尔值转换',
    process: (content) => {
      // 在 WHERE 子句中的布尔值比较
      content = content.replace(/(\w+)\s*=\s*1\b/g, '$1 = true');
      content = content.replace(/(\w+)\s*=\s*0\b/g, '$1 = false');
      
      // DEFAULT 值
      content = content.replace(/DEFAULT\s+1\b/g, 'DEFAULT true');
      content = content.replace(/DEFAULT\s+0\b/g, 'DEFAULT false');
      
      return content;
    }
  }
];

// 处理单个文件
function processFile(filePath) {
  console.log(`\n处理文件: ${filePath}`);
  
  const fullPath = path.join(__dirname, '..', filePath);
  
  // 备份原文件
  const backupPath = fullPath + '.sqlite.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(fullPath, backupPath);
    console.log(`  创建备份: ${backupPath}`);
  }
  
  // 读取文件内容
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // 应用所有转换规则
  for (const conversion of conversions) {
    const before = content;
    content = conversion.process(content);
    
    if (before !== content) {
      console.log(`  应用转换: ${conversion.name}`);
    }
  }
  
  // 特殊处理：动态占位符生成
  if (filePath.includes('paymentHistory.js')) {
    // 处理批量插入的占位符生成
    content = content.replace(
      /values\.map\(\(\) => `\(\?\, \?\, \?\, \?\, \?\, \?\, \?\, \?\)`\)\.join\(', '\)/g,
      "values.map((_, i) => `($${i*8+1}, $${i*8+2}, $${i*8+3}, $${i*8+4}, $${i*8+5}, $${i*8+6}, $${i*8+7}, $${i*8+8})`).join(', ')"
    );
  }
  
  // 如果内容有变化，写回文件
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`  文件已更新`);
  } else {
    console.log(`  文件无需更新`);
  }
}

// 执行转换
console.log('开始转换SQLite查询为PostgreSQL格式...');

for (const file of filesToConvert) {
  processFile(file);
}

console.log('\n转换完成！');
console.log('注意：请手动检查以下内容：');
console.log('1. 动态生成的SQL查询是否正确');
console.log('2. 复杂的查询逻辑是否需要调整');
console.log('3. 某些特殊的SQLite函数可能需要手动转换');