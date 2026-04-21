# Pre-Legal V1

> **项目状态**：V1 基础架构完成 ✅

快速启动法律文件生成平台，包含完整的身份验证、文档生成和下载功能。

## 快速开始

### 启动应用

```bash
# 启动所有服务（后端 + 前端）
./start.sh

# 或使用 docker-compose
docker-compose up -d
```

### 停止应用

```bash
# 停止所有服务
./stop.sh

# 或
docker-compose down
```

### 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **健康检查**: http://localhost:8000/health

## 功能特性

### V1 核心功能

1. **用户认证**
   - 注册新用户
   - 登录/登出
   - JWT Token 管理

2. **NDA 文档生成**
   - 交互式表单填写
   - 实时预览
   - PDF 下载

3. **技术架构**
   - 后端：FastAPI + SQLAlchemy + SQLite
   - 前端：Next.js + TypeScript + TailwindCSS
   - Docker 容器化部署

## API 端点

### 认证
- `POST /api/register` - 注册新用户
- `POST /api/login` - 用户登录
- `GET /api/me` - 获取当前用户信息 (需要 Token)

### 其他
- `GET /` - API 欢迎页面
- `GET /health` - 健康检查

## 环境变量

设置 `.env` 文件：

```bash
SECRET_KEY=your-secret-key-change-in-production
```

## 项目结构

```
preleagal/
├── backend/                    # FastAPI 后端
│   ├── main.py                # 主应用文件
│   └── requirements.txt       # Python 依赖
├── frontend/                   # Next.js 前端
│   ├── src/
│   │   ├── app/              # Next.js 路由
│   │   ├── components/       # React 组件
│   │   └── contexts/         # React Context
│   └── package.json
├── templates/                  # 法律文档模板
├── Dockerfile                 # 后端 Docker 镜像
├── docker-compose.yml         # Docker 编排
├── start.sh                   # 启动脚本
└── stop.sh                    # 停止脚本
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

## 许可证

本项目使用的模板源自 [CommonPaper](https://github.com/CommonPaper) 项目，遵循 CC BY 4.0 许可协议。
