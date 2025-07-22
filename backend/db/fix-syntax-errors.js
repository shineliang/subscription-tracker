const fs = require('fs');
const path = require('path');

// 需要修复的具体错误
const fixes = [
  {
    file: 'models/user.js',
    fixes: [
      {
        find: 'db.get(get`get,',
        replace: 'db.get(`SELECT id FROM users WHERE username = $1 OR email = $2`,'
      },
      {
        find: 'updates.push(\'email = ?\');',
        replace: 'updates.push(\'email = $\' + (values.length + 1));'
      },
      {
        find: 'updates.push(\'full_name = $1\');',
        replace: 'updates.push(\'full_name = $\' + (values.length + 1));'
      },
      {
        find: 'updates.push(\'is_active = $1\');',
        replace: 'updates.push(\'is_active = $\' + (values.length + 1));'
      }
    ]
  },
  {
    file: 'models/subscription.js',
    fixes: [
      {
        find: 'active !== undefined $1 active : 1,',
        replace: 'active !== undefined ? active : 1,'
      },
      {
        find: 'cancelled_at !== undefined $2 cancelled_at : null,',
        replace: 'cancelled_at !== undefined ? cancelled_at : null,'
      }
    ]
  },
  {
    file: 'models/budget.js',
    fixes: [
      {
        find: 'const placeholders = alertIds.map((_, i) => `${i + 2}`).join(\',\');',
        replace: 'const placeholders = alertIds.map((_, i) => `$${i + 2}`).join(\',\');'
      }
    ]
  },
  {
    file: 'models/paymentHistory.js',
    fixes: [
      {
        find: 'const placeholders = payments.map(() => \'($1, $2, $3, $4, $5, $6, $7, $8)\').join(\', \');',
        replace: 'const placeholders = payments.map((_, i) => `($${i*8+1}, $${i*8+2}, $${i*8+3}, $${i*8+4}, $${i*8+5}, $${i*8+6}, $${i*8+7}, $${i*8+8})`).join(\', \');'
      }
    ]
  },
  {
    file: 'models/subscriptionHistory.js',
    fixes: [
      {
        find: 'const placeholders = records.map(() => \'($1, $2, $3, $4, $5, $6, $7)\').join(\', \');',
        replace: 'const placeholders = records.map((_, i) => `($${i*7+1}, $${i*7+2}, $${i*7+3}, $${i*7+4}, $${i*7+5}, $${i*7+6}, $${i*7+7})`).join(\', \');'
      }
    ]
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
  
  for (const fix of fileInfo.fixes) {
    if (content.includes(fix.find)) {
      content = content.replace(fix.find, fix.replace);
      console.log(`  修复: ${fix.find.substring(0, 50)}...`);
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
console.log('开始修复语法错误...');

for (const fileInfo of fixes) {
  processFile(fileInfo);
}

console.log('\n修复完成！');