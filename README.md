# Pre-Legal AI

> **项目状态**：法律协议起草 SaaS 平台 🚀

多功能法律文档智能生成平台，支持用户认证、AI 辅助对话、模板管理、实时预览与 PDF 导出。

## 快速开始

### 启动应用

```bash
# 启动所有服务（后端 + 前端）
./start.sh

# 或使用 docker-compose
docker-compose up -d
```

### 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **健康检查**: http://localhost:8000/health

## 功能特性

### 核心功能

1. **用户认证系统**
   - 用户注册/登录/登出
   - JWT Token 管理
   - 安全数据隔离

2. **AI 法律助手**
   - 自然语言对话提取法律条款
   - 基于 Cerebras/LiteLLM 的智能推理
   - 结构化字段自动提取与验证

3. **模板管理系统**
   - 11 种法律文档模板支持
   - 数据库驱动的动态注册
   - 模板专属 API 端点

4. **文档操作**
   - 实时预览编辑
   - PDF 文档导出
   - 用户文档持久化存储

5. **用户体验**
   - A4 纸张质感预览界面
   - 表单与对话双模式输入
   - 页面跳转数据持久化

## 技术架构

- **前端**: Next.js + TypeScript + TailwindCSS
- **后端**: FastAPI + SQLAlchemy + SQLite
- **AI 引擎**: Cerebras via OpenRouter (LiteLLM)
- **部署**: 全量 Docker 容器化
- **缓存**: LocalStorage 会话状态持久化

## 支持的文档模板

| 模板名称 | 缩写 | 说明 |
|---------|------|------|
| Mutual Non-Disclosure Agreement | MDNA | 双方保密协议 |
| Unilateral Non-Disclosure Agreement | MDNA-1 | 单方保密协议 |
| Sales Agreement | SPA | 销售协议 |
| Purchase Agreement | PSA | 采购协议 |
| Shareholders Agreement | SHA | 股东协议 |
| Service Agreement | SLA | 服务等级协议 |
| Design Agreement | DesignPA | 设计协议 |
| Business Associate Agreement | BAA | 商业合作备忘录 |
| Membership Partnership Agreement | MPA | 合伙人协议 |
| General Partnership Agreement | Partnership | 通用合伙协议 |
| Pilot Cooperation Agreement | Pilot | 试点合作协议 |

## API 端点

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/register | 注册新用户 |
| POST | /api/login | 用户登录 |
| GET | /api/me | 获取当前用户信息 (需要 Token) |

### AI 聊天

- `POST /api/chat`：与 AI 法律助手对话并提取字段

### 模板管理

- `GET /api/templates`：获取所有可用模板
- `GET /api/templates/{id}`：获取指定模板详情
- `POST /api/templates`：注册新模板
- `PUT /api/templates/{id}`：更新模板
- `DELETE /api/templates/{id}`：删除模板
- `GET /api/templates/search`：搜索模板
- `POST /api/intent`：识别用户意图并推荐模板

### 文档生成

- `POST /api/documents/generate`：生成 PDF 文档

### 文档持久化

- `GET /api/documents`：列出用户所有文档
- `POST /api/documents`：保存新文档
- `GET /api/documents/{id}`：获取文档详情
- `PUT /api/documents/{id}`：更新已有文档
- `DELETE /api/documents/{id}`：删除文档

## 配置

### 环境变量

在项目根目录设置 `.env` 文件：

```bash
SECRET_KEY=your-secret-key-change-in-production

# AI 配置
OPENROUTER_API_KEY=your-openrouter-api-key
```

## 项目结构

```
preleagal/
├── backend/                    # FastAPI 后端
│   ├── main.py                # 主应用文件
│   ├── requirements.txt       # Python 依赖
│   ├── api/                   # API 路由模块
│   ├── models/                # 数据库模型
│   ├── schemas/               # Pydantic 模型
│   └── services/              # 业务逻辑服务
├── frontend/                   # Next.js 前端
│   ├── src/
│   │   ├── app/              # Next.js 路由
│   │   ├── components/       # React 组件
│   │   ├── contexts/         # React Context
│   │   └── hooks/            # 自定义 Hooks
│   └── package.json
├── templates/                  # 法律文档模板定义
├── data/                       # SQLite 数据库文件
├── catalog.json               # 模板目录清单
├── Dockerfile                 # 后端 Docker 镜像
├── docker-compose.yml         # Docker 编排
├── start.sh                   # 启动脚本
├── stop.sh                    # 停止脚本
└── README.md
```

## 开发

### 本地开发

```bash
# 启动后端
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 启动前端
cd frontend
npm run dev
```

### 构建 Docker 镜像

```bash
docker-compose build
```

## 项目进度

### ✅ PL-4: 基础架构完成
- Docker 容器化部署
- 用户认证系统
- JWT Token 管理
- NDA 预览与 PDF 下载

### ✅ PL-5: AI 聊天集成
- AI 聊天界面
- 后端 API 集成
- Cerebras LLM 集成（通过 OpenRouter）
- 结构化输出与实时预览

### ✅ PL-6: 模板管理系统
- 数据库驱动模板注册（11 种模板）
- 模板专属 API 端点
- 前端模板选择器
- 意图识别功能
- A4 纸张质感 UI
- AI 追问逻辑优化
- 完整测试覆盖（18 个测试用例）

### 🔄 PL-7: 进行中 - 文档持久化
- 文档 CRUD 接口实现 ✅
- 前端 LocalStorage 状态持久化 ✅
- 测试驱动开发修复 ✅
- 用户管理中心优化 ⏳

## 许可证

本项目使用的法律文档模板源自 [CommonPaper](https://github.com/CommonPaper) 项目，遵循 CC BY 4.0 许可协议。
