const fs = require('fs');
const path = require('path');

// 文件列表和需要修复的查询
const filesToFix = [
  'models/user.js',
  'models/subscription.js',
  'models/budget.js',
  'models/paymentHistory.js',
  'models/notificationSetting.js',
  'models/reminder.js',
  'models/subscriptionHistory.js',
  'routes/api.js'
];

// 修复单个SQL查询中的占位符
function fixPlaceholders(sql) {
  // 计算 ? 的数量
  const placeholderCount = (sql.match(/\?/g) || []).length;
  
  if (placeholderCount === 0) return sql;
  
  // 替换 ? 为 $n
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

// 处理文件内容
function processFileContent(content) {
  // 匹配各种SQL查询模式
  const patterns = [
    // db.get(), db.all(), db.run(), db.insert()
    /(db\.(get|all|run|insert)\s*\(\s*)([`'"])([^`'"]+)\3/g,
    // query = `...` 或 query = '...'
    /(const\s+query\s*=\s*)([`'"])([^`'"]+)\2/g,
    // 直接的SQL字符串
    /(INSERT INTO|UPDATE|SELECT|DELETE FROM)([^`'"]*[`'"])([^`'"]+)[`'"]/gi
  ];
  
  let modifiedContent = content;
  
  for (const pattern of patterns) {
    modifiedContent = modifiedContent.replace(pattern, (match, prefix, quote, sql) => {
      // 对于第三种模式，需要特殊处理
      if (prefix && prefix.match(/INSERT INTO|UPDATE|SELECT|DELETE FROM/i)) {
        const fullMatch = match;
        const sqlPart = fullMatch.substring(fullMatch.indexOf(quote || '`'));
        const sqlContent = sqlPart.match(/[`'"]([^`'"]+)[`'"]/)[1];
        const fixedSql = fixPlaceholders(sqlContent);
        return fullMatch.replace(sqlContent, fixedSql);
      }
      
      // 对于其他模式
      if (!sql) {
        sql = quote;
        quote = prefix.match(/[`'"]/)?.[0] || '`';
        prefix = prefix.replace(/[`'"]/, '');
      }
      
      const fixedSql = fixPlaceholders(sql);
      return `${prefix}${quote}${fixedSql}${quote}`;
    });
  }
  
  // 特殊处理：动态占位符生成
  // 处理批量插入的情况
  modifiedContent = modifiedContent.replace(
    /\.map\(\(\s*_?\s*(?:,\s*\w+)?\s*\)\s*=>\s*[`'"]?\(\?(?:,\s*\?)*\)[`'"]?\)/g,
    (match) => {
      // 计算占位符数量
      const placeholderCount = (match.match(/\?/g) || []).length;
      
      // 检查是否有索引参数
      if (match.includes('(_, i)') || match.includes('(_, index)')) {
        // 生成动态占位符
        const placeholders = Array.from({length: placeholderCount}, (_, j) => `$\${i*${placeholderCount}+${j+1}}`).join(', ');
        return match.replace(/\(\?(?:,\s*\?)*\)/, `(\${placeholders})`);
      } else {
        // 静态占位符
        const placeholders = Array.from({length: placeholderCount}, (_, j) => `$${j+1}`).join(', ');
        return match.replace(/\(\?(?:,\s*\?)*\)/, `(${placeholders})`);
      }
    }
  );
  
  // 处理动态IN子句
  modifiedContent = modifiedContent.replace(
    /placeholders\s*=\s*\w+\.map\(\(\)\s*=>\s*'\?'\)\.join\(','\)/g,
    `placeholders = alertIds.map((_, i) => \`$\${i + 2}\`).join(',')`
  );
  
  // 修复特定的错误转换
  modifiedContent = modifiedContent
    // 修复布尔值错误
    .replace(/for \(let i = false;/g, 'for (let i = 0;')
    .replace(/let monthlyAmount = false;/g, 'let monthlyAmount = 0;')
    .replace(/let monthTotal = false;/g, 'let monthTotal = 0;')
    // 修复数据库默认值
    .replace(/INTEGER DEFAULT true/g, 'BOOLEAN DEFAULT true')
    .replace(/INTEGER DEFAULT false/g, 'BOOLEAN DEFAULT false')
    .replace(/DECIMAL\(10,2\) DEFAULT false/g, 'DECIMAL(10,2) DEFAULT 0')
    .replace(/SET user_id = true/g, 'SET user_id = 1');
  
  return modifiedContent;
}

// 处理单个文件
function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }
  
  console.log(`\n处理文件: ${filePath}`);
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const modifiedContent = processFileContent(content);
  
  if (content !== modifiedContent) {
    // 创建备份
    const backupPath = fullPath + '.pg.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(fullPath, backupPath);
      console.log(`  创建备份: ${backupPath}`);
    }
    
    // 写入修改后的内容
    fs.writeFileSync(fullPath, modifiedContent);
    console.log(`  文件已更新`);
  } else {
    console.log(`  文件无需修改`);
  }
}

// 执行修复
console.log('开始修复所有SQL占位符...');

for (const file of filesToFix) {
  processFile(file);
}

// 特殊处理：修复models/paymentHistory.js中的批量插入
const paymentHistoryPath = path.join(__dirname, '..', 'models/paymentHistory.js');
if (fs.existsSync(paymentHistoryPath)) {
  console.log('\n特殊处理: models/paymentHistory.js');
  let content = fs.readFileSync(paymentHistoryPath, 'utf8');
  
  // 修复批量插入的占位符生成
  content = content.replace(
    /values\.map\(\(\)\s*=>\s*`\(\$\d+,\s*\$\d+,\s*\$\d+,\s*\$\d+,\s*\$\d+,\s*\$\d+,\s*\$\d+,\s*\$\d+\)`\)\.join\(', '\)/g,
    "values.map((_, i) => `($${i*8+1}, $${i*8+2}, $${i*8+3}, $${i*8+4}, $${i*8+5}, $${i*8+6}, $${i*8+7}, $${i*8+8})`).join(', ')"
  );
  
  fs.writeFileSync(paymentHistoryPath, content);
  console.log('  批量插入占位符已修复');
}

console.log('\n修复完成！');