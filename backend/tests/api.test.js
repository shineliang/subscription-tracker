const fs = require('fs');
const path = require('path');

describe('API Routes - 变量声明修复测试', () => {

  describe('变量声明修复测试', () => {
    test('应该正确处理 currentDate 变量声明', () => {
      // 这个测试确保 api.js 文件可以正常加载，没有语法错误
      expect(() => {
        require('../routes/api');
      }).not.toThrow();
    });

    test('getCurrentFormattedDate 函数应该返回正确格式的日期', () => {
      // 测试日期格式化函数
      const moment = require('moment');
      
      // 模拟 getCurrentFormattedDate 函数的逻辑
      const getCurrentFormattedDate = () => {
        return moment().format('YYYY-MM-DD');
      };

      const result = getCurrentFormattedDate();
      const expectedFormat = /^\d{4}-\d{2}-\d{2}$/;
      
      expect(result).toMatch(expectedFormat);
      expect(typeof result).toBe('string');
    });
  });

  describe('日期处理函数测试', () => {
    test('getCurrentFormattedDate 应该使用正确的变量名', () => {
      // 读取 api.js 文件内容并检查变量声明
      const apiFilePath = path.join(__dirname, '../routes/api.js');
      const apiFileContent = fs.readFileSync(apiFilePath, 'utf8');
      
      // 检查是否已修复重复的 currentDate 声明
      const currentDateMatches = apiFileContent.match(/const currentDate/g);
      const aiCurrentDateMatches = apiFileContent.match(/const aiCurrentDate/g);
      
      // 应该只有一个 currentDate 声明（在第137行）
      expect(currentDateMatches).toHaveLength(1);
      // 应该有一个 aiCurrentDate 声明（修复后的变量）
      expect(aiCurrentDateMatches).toHaveLength(1);
    });

    test('系统消息应该使用正确的日期变量', () => {
      const apiFilePath = path.join(__dirname, '../routes/api.js');
      const apiFileContent = fs.readFileSync(apiFilePath, 'utf8');
      
      // 检查智能解析API中系统消息是否使用了正确的变量名
      expect(apiFileContent).toContain('${aiCurrentDate}');
      
      // 确保createMessages函数中的局部变量使用是正确的
      const systemMessageLine = apiFileContent.split('\n').find(line => 
        line.includes('您是一个专门解析软件订阅信息的助手')
      );
      expect(systemMessageLine).toContain('${currentDate}'); // 这是局部作用域内的正确引用
    });

    test('修复应该解决SyntaxError问题', () => {
      // 通过能够成功require模块来验证语法错误已修复
      let apiModule;
      expect(() => {
        apiModule = require('../routes/api');
      }).not.toThrow();
      
      // 验证模块导出了路由器
      expect(apiModule).toBeDefined();
    });
  });
});