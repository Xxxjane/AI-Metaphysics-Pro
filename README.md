AI-Metaphysics-Pro (玄图) 🔮

基于大语言模型 (LLM) 与向量数据库的 AI 命理/玄学分析系统。

🌟 项目亮点

知识库支撑：内置《三命通会》、《滴天髓》、《穷通宝鉴》等经典命理典籍作为 RAG 增强数据。

双端架构：采用 Python (FastAPI/LangGraph) 后端与 React (Vite/Tailwind) 前端的现代化开发架构。

AI 智能代理：利用 Agent 架构实现对命盘的深度解读。

📁 目录结构

/backend: 基于 Python 的 AI 分析引擎与知识库处理。

/frontend: 基于 React 的响应式用户交互界面。

/backend/pdf_vault: 项目使用的核心命理典籍资料库。

🚀 快速开始

后端配置

进入目录：cd backend

创建并激活虚拟环境：python -m venv venv

安装依赖：pip install -r requirements.txt

配置文件：复制 .env.example 为 .env 并填写你的 API Key。

启动服务：python metaphysics_agent.py

前端配置

进入目录：cd frontend

安装依赖：npm install

启动项目：npm run dev

⚖️ 免责声明

本软件仅供编程练习与玄学文化研究使用，分析结果不代表科学建议。