const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');
const Reminder = require('./models/reminder');
const NotificationSetting = require('./models/notificationSetting');
const errorHandler = require('./middleware/errorHandler');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5200;

// 中间件
app.use(cors());
app.use(express.json());

// API路由
app.use('/api', apiRoutes);

// 处理生产环境下的静态资源
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// 404处理 - 针对API路由
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: '未找到API路径' });
});

// 全局错误处理中间件
app.use(errorHandler);

// 定时任务 - 每天检查需要发送的提醒
cron.schedule('0 9 * * *', () => {
  console.log('运行提醒检查定时任务...');
  
  // 获取未发送的提醒
  Reminder.getPendingReminders((err, reminders) => {
    if (err) {
      return console.error('获取提醒失败:', err);
    }
    
    if (reminders.length === 0) {
      return console.log('没有需要发送的提醒');
    }
    
    // 获取通知设置
    NotificationSetting.get((settingsErr, settings) => {
      if (settingsErr) {
        return console.error('获取通知设置失败:', settingsErr);
      }
      
      // 如果启用了邮件通知并设置了邮箱
      if (settings.email_notifications && settings.email) {
        sendEmailReminders(settings.email, reminders);
      }
      
      // 标记提醒为已发送
      reminders.forEach(reminder => {
        Reminder.markAsSent(reminder.id, (markErr) => {
          if (markErr) {
            console.error(`标记提醒 ${reminder.id} 为已发送失败:`, markErr);
          }
        });
      });
    });
  });
});

// 发送提醒邮件的函数
function sendEmailReminders(email, reminders) {
  // 检查邮件配置
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return console.error('邮件配置不完整，请在.env文件中设置EMAIL_USER和EMAIL_PASS');
  }
  
  // 设置邮件服务配置
  const transporter = nodemailer.createTransport({
    service: 'gmail',  // 使用您选择的邮件服务
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  // 构建邮件内容
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '订阅即将到期提醒',
    html: `
      <h2>订阅到期提醒</h2>
      <p>您有以下订阅即将到期：</p>
      <ul>
        ${reminders.map(reminder => `
          <li>
            <strong>${reminder.name}</strong> - 
            金额: ${reminder.amount} ${reminder.currency} - 
            到期日期: ${reminder.next_payment_date}
          </li>
        `).join('')}
      </ul>
      <p>请登录订阅管理系统查看详情或更新订阅信息。</p>
    `
  };
  
  // 发送邮件
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('发送提醒邮件失败:', error);
    } else {
      console.log('提醒邮件已发送:', info.response);
    }
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`
===================================
  订阅管家服务器启动成功！
  运行模式: ${process.env.NODE_ENV || '开发模式'}
  端口: ${PORT}
  启动时间: ${new Date().toLocaleString()}
===================================
  `);
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，优雅关闭服务器...');
  // 关闭数据库连接或其他资源
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，优雅关闭服务器...');
  // 关闭数据库连接或其他资源
  process.exit(0);
});
