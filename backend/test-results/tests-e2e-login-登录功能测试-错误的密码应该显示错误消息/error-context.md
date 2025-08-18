# Page snapshot

```yaml
- alert:
  - img
  - text: 用户名或密码错误
- button "close"
- progressbar "notification timer"
- heading "欢迎回来" [level=2]
- paragraph:
  - text: 还没有账号？
  - link "立即注册":
    - /url: /register
- textbox: admin
- text: 用户名或邮箱
- textbox: wrongpassword
- text: 密码
- checkbox "记住我"
- img
- text: 记住我
- button "演示账号"
- button "登录账户"
- text: 或者
- paragraph: 首次使用？创建账号开始管理您的订阅
```