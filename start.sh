#!/bin/bash

# 设置颜色变量
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}  订阅跟踪器启动脚本  ${NC}"
echo -e "${BLUE}====================================${NC}"

# 检查是否安装了npm
if ! command -v npm &> /dev/null
then
    echo -e "${YELLOW}未检测到npm，请先安装Node.js和npm${NC}"
    exit 1
fi

# 安装后端依赖
echo -e "\n${GREEN}正在安装后端依赖...${NC}"
cd "$SCRIPT_DIR/backend"
npm install

# 安装前端依赖
echo -e "\n${GREEN}正在安装前端依赖...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install

# 创建tmux会话并分割窗口
echo -e "\n${GREEN}启动应用...${NC}"

# 检查是否安装了tmux
if command -v tmux &> /dev/null
then
    # 创建新的tmux会话
    tmux new-session -d -s subscription-tracker

    # 分割窗口为上下两部分
    tmux split-window -v

    # 在上半部分窗口中启动后端
    tmux send-keys -t subscription-tracker:0.0 "cd \"$SCRIPT_DIR/backend\" && npm start" C-m

    # 在下半部分窗口中启动前端
    tmux send-keys -t subscription-tracker:0.1 "cd \"$SCRIPT_DIR/frontend\" && npm start" C-m

    # 附加到tmux会话
    echo -e "${GREEN}使用tmux启动应用成功！${NC}"
    echo -e "${YELLOW}按下Ctrl+B然后按D可以分离会话（但保持应用运行）${NC}"
    echo -e "${YELLOW}使用'tmux attach -t subscription-tracker'可以重新连接会话${NC}"
    echo -e "${YELLOW}使用'tmux kill-session -t subscription-tracker'可以终止应用${NC}"
    
    tmux attach -t subscription-tracker
else
    # 如果没有tmux，则使用普通方式启动（不推荐，需要开两个终端）
    echo -e "${YELLOW}未检测到tmux，请使用两个终端窗口分别运行以下命令：${NC}"
    echo -e "${GREEN}终端1: cd \"$SCRIPT_DIR/backend\" && npm start${NC}"
    echo -e "${GREEN}终端2: cd \"$SCRIPT_DIR/frontend\" && npm start${NC}"
fi

echo -e "\n${GREEN}启动完成！${NC}"
echo -e "${YELLOW}后端地址: http://localhost:5200${NC}"
echo -e "${YELLOW}前端地址: http://localhost:3000${NC}"
