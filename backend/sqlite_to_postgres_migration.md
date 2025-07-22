# SQLite到PostgreSQL迁移报告

## 需要修改的SQLite特定语法

### 1. 占位符 `?` 需要改为 `$1, $2` 等

#### models/user.js
- 第18行: `'SELECT id FROM users WHERE username = ? OR email = ?'` → `'SELECT id FROM users WHERE username = $1 OR email = $2'`
- 第38行: `VALUES (?, ?, ?, ?)` → `VALUES ($1, $2, $3, $4)`
- 第59行: `WHERE id = ?` → `WHERE id = $1`
- 第72行: `WHERE username = ?` → `WHERE username = $1`
- 第85行: `WHERE email = ?` → `WHERE email = $1`
- 第127行: `WHERE id = ?` → `WHERE id = $X` (X是动态数量)
- 第152行: `WHERE id = ?` → `WHERE id = $2`
- 第176行: `WHERE id = ?` → `WHERE id = $1`
- 第189行: `WHERE id = ?` → `WHERE id = $1`
- 第213行: `WHERE user_id = ?` → `WHERE user_id = $1`

#### models/subscription.js
- 第11行: `WHERE user_id = ?` → `WHERE user_id = $1`
- 第42行: `WHERE id = ? AND user_id = ?` → `WHERE id = $1 AND user_id = $2`
- 第57行: `WHERE id = ?` → `WHERE id = $1`
- 第92行: `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` → `VALUES ($1, $2, ..., $14)`
- 第167行: `WHERE id = ? AND user_id = ?` → `WHERE id = $15 AND user_id = $16`
- 第268行: `WHERE id = ?` → `WHERE id = $14`
- 第305行: `WHERE id = ? AND user_id = ?` → `WHERE id = $1 AND user_id = $2`
- 第336行: `WHERE id = ?` → `WHERE id = $1`
- 第354行: `AND next_payment_date BETWEEN ? AND ?` → `AND next_payment_date BETWEEN $2 AND $3`
- 第375行: `WHERE next_payment_date BETWEEN ? AND ?` → `WHERE next_payment_date BETWEEN $1 AND $2`
- 第395行: `WHERE next_payment_date < ?` → `WHERE next_payment_date < $1`
- 第650行: `WHERE active = 1 AND user_id = ?` → `WHERE active = 1 AND user_id = $1`
- 第691行: `WHERE active = 1 AND user_id = ?` → `WHERE active = 1 AND user_id = $1`
- 第744行: `WHERE active = 1 AND user_id = ?` → `WHERE active = 1 AND user_id = $1`
- 第826行: `WHERE active = 1 AND user_id = ?` → `WHERE active = 1 AND user_id = $1`

#### models/paymentHistory.js
- 第10行: `VALUES (?, ?, ?, ?, ?, ?, ?, ?)` → `VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
- 第34行: `WHERE subscription_id = ? AND user_id = ?` → `WHERE subscription_id = $1 AND user_id = $2`
- 第47行: `WHERE ph.user_id = ?` → `WHERE ph.user_id = $1`
- 第49行: `LIMIT ? OFFSET ?` → `LIMIT $2 OFFSET $3`
- 第61行: `WHERE ph.user_id = ? AND ph.payment_date BETWEEN ? AND ?` → `WHERE ph.user_id = $1 AND ph.payment_date BETWEEN $2 AND $3`
- 第91行: `WHERE ph.user_id = ? AND ph.payment_date >= ?` → `WHERE ph.user_id = $1 AND ph.payment_date >= $2`
- 第102-103行: `SET status = ? WHERE id = ? AND user_id = ?` → `SET status = $1 WHERE id = $2 AND user_id = $3`
- 第141行: `WHERE subscription_id = ? AND user_id = ? AND payment_date = ?` → `WHERE subscription_id = $1 AND user_id = $2 AND payment_date = $3`

#### models/notificationSetting.js
- 第8行: `WHERE user_id = ?` → `WHERE user_id = $1`
- 第49行: `VALUES (?, ?, ?, ?, ?)` → `VALUES ($1, $2, $3, $4, $5)`
- 第109行: `WHERE user_id = ?` → `WHERE user_id = $5`

#### models/budget.js
- 第9行: `WHERE user_id = ? AND is_active = 1` → `WHERE user_id = $1 AND is_active = 1`
- 第25行: `WHERE id = ? AND user_id = ?` → `WHERE id = $1 AND user_id = $2`
- 第41行: `WHERE user_id = ? AND type = ? AND period = ? AND is_active = 1` → `WHERE user_id = $1 AND type = $2 AND period = $3 AND is_active = 1`
- 第76行: `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)` → `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)`
- 第120行: `WHERE id = ? AND user_id = ?` → `WHERE id = $8 AND user_id = $9`
- 第153行: `WHERE id = ? AND user_id = ?` → `WHERE id = $1 AND user_id = $2`
- 第206行: `AND currency = ?` → `AND currency = $2`
- 第227行: `AND category = ?` → `AND category = $3`
- 第335行: `WHERE budget_id = ? AND user_id = ? AND alert_type = ?` → `WHERE budget_id = $1 AND user_id = $2 AND alert_type = $3`
- 第344行: `VALUES (?, ?, ?, ?, ?)` → `VALUES ($1, $2, $3, $4, $5)`
- 第376行: `WHERE ba.user_id = ? AND ba.is_read = 0` → `WHERE ba.user_id = $1 AND ba.is_read = 0`
- 第416行: `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` → `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

#### db/migrations.js
- 第30行: `'SELECT * FROM migrations WHERE name = ?'` → `'SELECT * FROM migrations WHERE name = $1'`
- 第44行: `'INSERT INTO migrations (name) VALUES (?)'` → `'INSERT INTO migrations (name) VALUES ($1)'`

### 2. strftime() 函数需要改为PostgreSQL的日期函数

#### models/paymentHistory.js
- 第72行: `strftime('%m', payment_date) as month` → `TO_CHAR(payment_date, 'MM') as month`
- 第76行: `WHERE user_id = ? AND strftime('%Y', payment_date) = ?` → `WHERE user_id = $1 AND TO_CHAR(payment_date, 'YYYY') = $2`

### 3. AUTOINCREMENT 需要改为 SERIAL 或 IDENTITY

#### db/migrations.js
- 第15行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第112行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第221行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第278行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第299行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第392行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第418行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`
- 第441行: `id INTEGER PRIMARY KEY AUTOINCREMENT` → `id SERIAL PRIMARY KEY`

### 4. 日期函数修改

#### models/budget.js
- 第336行: `AND DATE(created_at) = DATE('now')` → `AND DATE(created_at) = CURRENT_DATE`

### 5. 其他注意事项

1. **CURRENT_TIMESTAMP**: SQLite和PostgreSQL都支持，无需修改
2. **布尔值处理**: SQLite使用0/1，PostgreSQL使用true/false，需要在应用层处理
3. **LIMIT/OFFSET**: 两者语法相同，但PostgreSQL也支持 `LIMIT $1 OFFSET $2` 的参数化形式
4. **字符串连接**: SQLite使用 `||`，PostgreSQL也支持，无需修改
5. **CASE语句**: 两者语法相同，无需修改

### 6. 批量插入语法

#### models/paymentHistory.js
- 第111行: 批量插入需要修改占位符生成逻辑，从 `(?, ?, ?, ?, ?, ?, ?, ?)` 改为 `($1, $2, $3, $4, $5, $6, $7, $8)` 等

### 7. 动态查询构建

需要特别注意的是动态构建查询时的占位符编号，例如：
- models/user.js 第99-128行的update方法
- models/budget.js 第392-397行的动态IN查询

这些地方需要根据参数数量动态生成正确的占位符编号。

## 建议的迁移步骤

1. 创建一个数据库适配层，根据配置选择使用SQLite或PostgreSQL
2. 修改所有SQL查询，使用参数化查询的正确语法
3. 处理数据类型差异（如布尔值）
4. 测试所有数据库操作
5. 迁移现有数据