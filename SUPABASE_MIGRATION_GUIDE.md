# Supabase 数据库迁移指南

## 迁移概述

本项目已从本地 PostgreSQL 数据库成功迁移到 Supabase 云数据库平台。

### 迁移详情

- **源数据库**: PostgreSQL (192.168.1.73)
- **目标数据库**: Supabase (项目ID: cwmtexaliunqpyjnancf)
- **项目URL**: https://cwmtexaliunqpyjnancf.supabase.co

## 已完成的迁移步骤

### 1. 架构迁移
✅ 所有数据库表已成功创建在 Supabase 中：
- users (用户表)
- subscriptions (订阅表)
- reminders (提醒表)
- notification_settings (通知设置表)
- subscription_history (订阅历史表)
- payment_history (支付历史表)
- budgets (预算表)
- budget_history (预算历史表)
- budget_alerts (预算警报表)
- migrations (迁移记录表)

### 2. 数据迁移
✅ 创建了数据迁移脚本 `backend/db/migrate-to-supabase.js`
- 支持完整数据迁移
- 保留所有外键关系
- 自动重置序列值

### 3. 代码更新
✅ 后端代码已更新为使用 Supabase：
- 更新了数据库连接配置
- 保持了原有API接口兼容性
- 添加了 Supabase 客户端支持

### 4. 测试套件
✅ 创建了完整的测试套件：
- **单元测试**: `backend/tests/database.test.js`, `backend/tests/models.test.js`
- **E2E测试**: `e2e/auth.spec.js`, `e2e/subscriptions.spec.js`, `e2e/budgets.spec.js`, `e2e/notifications.spec.js`

## 配置步骤

### 1. 获取 Supabase 数据库密码

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 "figma" (cwmtexaliunqpyjnancf)
3. 进入 Settings → Database
4. 复制数据库密码

### 2. 更新环境变量

编辑 `backend/.env` 文件，将 `SUPABASE_DB_PASSWORD` 替换为您的实际密码：

```env
SUPABASE_DB_PASSWORD=your_actual_password_here
```

### 3. 运行数据迁移（如需要）

如果需要从旧数据库迁移数据：

```bash
cd backend
node db/migrate-to-supabase.js
```

## 运行测试

### 运行所有测试
```bash
./run-tests.sh
```

### 单独运行测试

#### 后端单元测试
```bash
cd backend
npm test
```

#### E2E测试
```bash
npm run test:e2e
```

#### 带UI的E2E测试
```bash
npm run test:e2e:ui
```

## 验证迁移

### 1. 测试数据库连接
```bash
cd backend
npm start
# 查看控制台输出，应显示 "Supabase数据库连接成功"
```

### 2. 测试应用功能
```bash
# 启动后端
cd backend
npm start

# 在另一个终端启动前端
cd frontend
npm start
```

访问 http://localhost:3000 并测试所有功能。

## Supabase 特性

### Row Level Security (RLS)
已为所有表配置了RLS策略，确保用户只能访问自己的数据。

### 实时功能
Supabase 支持实时数据同步，可以通过 Supabase 客户端订阅数据变化。

### 自动备份
Supabase 提供自动备份功能，数据安全有保障。

## 故障排除

### 数据库连接失败
1. 检查 `.env` 文件中的数据库密码是否正确
2. 确保网络连接正常
3. 验证 Supabase 项目状态是否为 "ACTIVE"

### 测试失败
1. 确保数据库架构已正确创建
2. 检查是否有数据冲突
3. 查看测试日志获取详细错误信息

### 性能问题
1. 检查数据库索引是否正确创建
2. 使用 Supabase Dashboard 查看查询性能
3. 考虑优化查询或添加缓存

## 监控和维护

### 使用 Supabase Dashboard
- 监控数据库性能
- 查看实时日志
- 管理数据库备份

### 使用 MCP 工具
```bash
# 查看项目状态
mcp__supabase__get_project --id cwmtexaliunqpyjnancf

# 查看日志
mcp__supabase__get_logs --project_id cwmtexaliunqpyjnancf --service postgres

# 获取安全建议
mcp__supabase__get_advisors --project_id cwmtexaliunqpyjnancf --type security
```

## 下一步

1. ✅ 完成数据库密码配置
2. ✅ 运行完整测试套件
3. ✅ 验证所有功能正常
4. 🔲 部署到生产环境
5. 🔲 配置监控和告警

## 联系支持

如有问题，请联系：
- Supabase 支持: https://supabase.com/support
- 项目维护者: [您的联系方式]