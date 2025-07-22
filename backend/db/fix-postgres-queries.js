const fs = require('fs');
const path = require('path');

// 需要修复的文件和具体位置
const fixes = [
  {
    file: 'db/migrations.js',
    changes: [
      { line: 117, find: 'is_active INTEGER DEFAULT true', replace: 'is_active BOOLEAN DEFAULT true' },
      { line: 177, find: 'SET user_id = true', replace: 'SET user_id = 1' },
      { line: 225, find: 'email_notifications INTEGER DEFAULT true', replace: 'email_notifications BOOLEAN DEFAULT true' },
      { line: 226, find: 'browser_notifications INTEGER DEFAULT true', replace: 'browser_notifications BOOLEAN DEFAULT true' },
      { line: 401, find: 'is_active INTEGER DEFAULT true', replace: 'is_active BOOLEAN DEFAULT true' },
      { line: 424, find: 'spent_amount DECIMAL(10,2) DEFAULT false', replace: 'spent_amount DECIMAL(10,2) DEFAULT 0' },
      { line: 427, find: 'exceeded INTEGER DEFAULT false', replace: 'exceeded BOOLEAN DEFAULT false' },
      { line: 447, find: 'is_read INTEGER DEFAULT false', replace: 'is_read BOOLEAN DEFAULT false' }
    ]
  },
  {
    file: 'models/subscription.js',
    changes: [
      { line: 536, find: 'for (let i = false; i < months; i++)', replace: 'for (let i = 0; i < months; i++)' },
      { line: 580, find: 'let monthlyAmount = false;', replace: 'let monthlyAmount = 0;' },
      { line: 785, find: 'let monthTotal = false;', replace: 'let monthTotal = 0;' },
      { line: 836, find: 'let monthTotal = false;', replace: 'let monthTotal = 0;' },
      { line: 847, find: 'let monthlyAmount = false;', replace: 'let monthlyAmount = 0;' }
    ]
  },
  {
    file: 'models/user.js',
    changes: []  // 这个文件的占位符转换是正确的，保持 $1, $2
  },
  {
    file: 'models/paymentHistory.js',
    changes: []  // 需要检查占位符是否正确转换
  },
  {
    file: 'models/notificationSetting.js', 
    changes: []  // 需要检查占位符是否正确转换
  },
  {
    file: 'models/budget.js',
    changes: []  // 需要检查占位符是否正确转换
  }
];

// 处理文件
function processFile(fileInfo) {
  const fullPath = path.join(__dirname, '..', fileInfo.file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${fileInfo.file}`);
    return;
  }
  
  console.log(`\n处理文件: ${fileInfo.file}`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 应用具体的修复
  for (const change of fileInfo.changes) {
    if (content.includes(change.find)) {
      content = content.replace(change.find, change.replace);
      console.log(`  修复第${change.line}行: ${change.find} → ${change.replace}`);
      modified = true;
    }
  }
  
  // 特殊处理：确保所有SQL查询使用正确的占位符
  if (fileInfo.file.includes('models/') || fileInfo.file.includes('routes/')) {
    // 统计并修复占位符
    const sqlPatterns = [
      /db\.(get|all|run|insert)\s*\(\s*[`'"]([^`'"]+)[`'"]/g,
      /query\s*=\s*[`'"]([^`'"]+)[`'"]/g
    ];
    
    let placeholderFixed = false;
    
    for (const pattern of sqlPatterns) {
      content = content.replace(pattern, (match, method, sql) => {
        if (!sql) {
          const sqlMatch = match.match(/[`'"]([^`'"]+)[`'"]/);
          if (!sqlMatch) return match;
          sql = sqlMatch[1];
        }
        
        // 确保sql是字符串
        if (typeof sql !== 'string') return match;
        
        // 检查是否包含占位符
        const hasPlaceholders = sql.includes('?') || sql.includes('$');
        if (!hasPlaceholders) return match;
        
        // 计算需要的占位符数量
        const questionMarks = (sql.match(/\?/g) || []).length;
        const dollarSigns = (sql.match(/\$\d+/g) || []).length;
        
        if (questionMarks > 0 && dollarSigns === 0) {
          // SQLite风格，需要转换为PostgreSQL
          let index = 0;
          const newSql = sql.replace(/\?/g, () => `$${++index}`);
          placeholderFixed = true;
          
          if (method) {
            return `db.${method}(\`${newSql}\``;
          } else {
            return match.replace(sql, newSql);
          }
        }
        
        return match;
      });
    }
    
    if (placeholderFixed) {
      console.log(`  修复SQL占位符: ? → $n`);
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content);
    console.log(`  文件已更新`);
  } else {
    console.log(`  文件无需修改`);
  }
}

// 执行修复
console.log('开始修复PostgreSQL查询...');

for (const fileInfo of fixes) {
  processFile(fileInfo);
}

console.log('\n修复完成！');