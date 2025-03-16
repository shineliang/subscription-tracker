# 订阅管家 (Subscription Tracker)

一个现代化的订阅费用跟踪应用，用于管理和监控您的所有软件订阅。

![订阅管家](/screenshot.png)

## ✨ 主要特性

- 💰 **追踪所有订阅费用**: 集中管理所有软件订阅，一目了然地了解所有支出
- ⏰ **到期提醒**: 在订阅到期前发送通知，避免意外续费或服务中断
- 📊 **支出统计**: 查看月度/年度总支出，按类别分析花费情况
- 🤖 **AI智能录入**: 使用自然语言描述您的订阅，AI会自动识别并填写详细信息
- 🎨 **酷炫界面**: 现代感十足的UI设计，深色模式支持，流畅的动画效果
- 📱 **响应式设计**: 在任何设备上都能获得良好的使用体验

## 🛠️ 技术栈

### 前端
- **React**: 用于构建用户界面
- **TailwindCSS**: 用于样式设计
- **Chart.js**: 用于数据可视化
- **Framer Motion**: 用于动画效果
- **React Router**: 用于路由管理
- **Axios**: 用于API请求

### 后端
- **Node.js**: 运行环境
- **Express**: Web框架
- **SQLite**: 轻量级数据库
- **Node-cron**: 用于定时任务
- **Nodemailer**: 用于发送邮件通知

## 📋 功能详情

### 订阅管理
- 添加、编辑和删除订阅
- 设置订阅周期（每日/每周/每月/每季度/每年）
- 记录订阅金额、币种、开始日期、下次付款日期等信息
- 按类别分类订阅

### 通知系统
- 根据自定义的提前天数发送提醒
- 支持浏览器通知和邮件通知
- 可设置每个订阅的特定提醒时间

### 数据分析
- 查看月度和年度总支出
- 按类别查看支出分布
- 查看支出趋势图表

### 智能助手
- 使用AI解析自然语言描述
- 自动填写订阅详情
- 智能计算下次付款日期

## 🚀 快速开始

### 先决条件
- 已安装 Node.js (v14+)
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/subscription-tracker.git
   cd subscription-tracker
   ```

2. **安装依赖**
   ```bash
   # 安装后端依赖
   cd backend
   npm install

   # 安装前端依赖
   cd ../frontend
   npm install
   ```

3. **启动应用**
   ```bash
   # 先给启动脚本添加执行权限
   chmod +x start.sh
   
   # 启动应用
   ./start.sh
   ```

   或者分别启动前后端:
   ```bash
   # 终端1: 启动后端
   cd backend
   npm start  # 将在端口5200上运行

   # 终端2: 启动前端
   cd frontend
   npm start
   ```

4. **访问应用**
   - 打开浏览器，访问 http://localhost:3000

## 📸 截图展示

### 仪表盘
![仪表盘](/screenshots/dashboard.png)
在仪表盘页面可以快速查看订阅统计和即将到期的订阅。

### 订阅列表
![订阅列表](/screenshots/subscriptions.png)
查看和管理所有订阅，支持搜索、排序和筛选。

### 添加订阅
![添加订阅](/screenshots/add-subscription.png)
通过表单或AI智能解析添加新的订阅。

### 统计分析
![统计分析](/screenshots/statistics.png)
查看详细的支出统计和可视化图表。

## 🔧 自定义配置

### 邮件通知
要启用邮件通知功能，需要在后端配置邮件服务：

1. 在`backend`目录中创建`.env`文件
2. 添加以下配置（以Gmail为例）:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### LLM集成
要启用AI智能解析功能，需要配置LLM API：

1. 在`.env`文件中添加:
   ```
   OPENAI_API_KEY=your-api-key
   ```
2. 在`backend/routes/api.js`中取消注释LLM相关代码

## 📝 待实现功能

- [ ] 导入/导出订阅数据
- [ ] 多用户支持
- [ ] 移动应用版本
- [ ] 定期自动备份
- [ ] 付款历史记录
- [ ] 更多货币支持和汇率转换

## 🤝 贡献指南

欢迎对此项目做出贡献！请按以下步骤操作：

1. Fork本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📮 联系我们

如有问题或建议，请提交issue或通过以下方式联系我们：
- Email: your-email@example.com
- GitHub: [你的GitHub用户名](https://github.com/yourusername)

---

**Enjoy tracking your subscriptions!** 📊💰✨
