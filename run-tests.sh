#!/bin/bash

echo "========================================="
echo "运行订阅管理系统测试套件"
echo "========================================="

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查环境变量
echo -e "${YELLOW}检查环境配置...${NC}"
if [ ! -f backend/.env ]; then
    echo -e "${RED}错误: backend/.env 文件不存在${NC}"
    echo "请创建 backend/.env 文件并配置 Supabase 数据库连接信息"
    exit 1
fi

# 检查 SUPABASE_DB_PASSWORD 是否设置
if ! grep -q "SUPABASE_DB_PASSWORD=..*" backend/.env || grep -q "SUPABASE_DB_PASSWORD=your_database_password_here" backend/.env; then
    echo -e "${RED}错误: SUPABASE_DB_PASSWORD 未设置${NC}"
    echo "请在 backend/.env 文件中设置您的 Supabase 数据库密码"
    echo "您可以从 Supabase 项目设置中获取数据库密码"
    exit 1
fi

echo -e "${GREEN}环境配置检查通过${NC}"

# 运行后端单元测试
echo ""
echo -e "${YELLOW}运行后端单元测试...${NC}"
cd backend
npm test
BACKEND_TEST_RESULT=$?
cd ..

if [ $BACKEND_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}后端单元测试通过${NC}"
else
    echo -e "${RED}后端单元测试失败${NC}"
fi

# 安装 Playwright 浏览器（如果需要）
echo ""
echo -e "${YELLOW}检查 Playwright 浏览器...${NC}"
npx playwright install

# 运行 E2E 测试
echo ""
echo -e "${YELLOW}运行 E2E 测试...${NC}"
npm run test:e2e
E2E_TEST_RESULT=$?

if [ $E2E_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}E2E 测试通过${NC}"
else
    echo -e "${RED}E2E 测试失败${NC}"
fi

# 总结
echo ""
echo "========================================="
echo "测试结果总结"
echo "========================================="

if [ $BACKEND_TEST_RESULT -eq 0 ] && [ $E2E_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}所有测试通过！${NC}"
    echo "Supabase 数据库迁移成功完成"
    exit 0
else
    echo -e "${RED}部分测试失败${NC}"
    if [ $BACKEND_TEST_RESULT -ne 0 ]; then
        echo "- 后端单元测试失败"
    fi
    if [ $E2E_TEST_RESULT -ne 0 ]; then
        echo "- E2E 测试失败"
    fi
    echo ""
    echo "请检查测试输出以获取更多详细信息"
    exit 1
fi