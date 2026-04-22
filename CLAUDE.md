# Prelegal 项目

## 项目概览
法律协议起草 SaaS（当前以 Mutual NDA 生成流程为主），支持用户认证、表单填写、实时预览与 PDF 下载。项目已收录 11 份 Common Paper 模板文件（见 `catalog.json`），但尚未全部接入统一生成流程。

## 开发流程
1. **需求**：从 Jira 读取任务指令。
2. **开发**：严格执行 feature-dev 七步流程。
3. **测试**：完善单元/集成测试并修复问题。
4. **提交**：使用 GitHub 工具提交 PR。

## AI 设计
在编写代码调用大型语言模型（LLM）时，请运用 Cerebras skill，通过OpenRouter使用LiteLLM访问openrouter/openai/gpt-oss-120b模型，并使用Cerebras作为推理提供者。您应使用结构化输出，以便能够解释结果并在法律文档中填充字段。


项目根目录的.env文件中有一个OPENROUTER_API_KEY。

## 技术方案
- **环境**：全量 Docker 容器化。
- **后端**：FastAPI + UV (目录：`backend/`)。
- **前端**：Next.js 开发服务 (目录：`frontend/`)。
- **数据库**：SQLite（`users.db`），当前用于用户表；启动时执行 `create_all` 进行表初始化，不会主动清空既有数据。
- **访问**：后端 API 位于 `http://localhost:8000`。

## 配色方案
- 强调黄：`#ecad0a`
- 主题蓝：`#209dd7`
- 辅助紫：`#753991` (提交按钮)
- 深蓝：`#032147` (标题)
- 灰：`#888888` (文本)

## API 概览
- **认证**：注册、登录、登出、个人信息 (`/me`)。
- **聊天与文档**：
  - `POST /api/chat`：与 AI 法律助手对话并提取字段。
  - `GET /api/documents/templates`：获取所有可用文档模板。
  - `POST /api/documents/generate`：生成 PDF 文档。
- **当前已实现接口**：
  - `POST /api/register`
  - `POST /api/login`
  - `GET /api/me`
  - `POST /api/chat`
  - `GET /api/health`
  - `GET /api/templates`
  - `GET /api/templates/{id}`
  - `POST /api/templates`
  - `PUT /api/templates/{id}`
  - `DELETE /api/templates/{id}`
  - `GET /api/templates/search`

## 项目总体进度
### PL-4 ✅ 已完成
- 基础架构、Docker 容器化
- 用户认证（注册/登录/登出）
- JWT Token 管理
- NDA 预览与 PDF 下载

### PL-5 ✅ 已完成
- AI 聊天界面
- 后端 API 集成
- Cerebras LLM 集成（通过 OpenRouter）
- 结构化输出与实时预览更新

### PL-6 🔄 95% 完成
**核心功能已全部实现：**
- ✅ 数据库驱动模板注册管理（11 种法律文档模板）
- ✅ 模板专属 API 端点
- ✅ 前端模板选择器与意图识别
- ✅ A4 纸张质感 UI 优化
- ✅ AI 追问逻辑优化（固定 6 步引导）
- ✅ 完整测试覆盖（18 个测试用例全部通过）

**剩余工作：**
- ⏳ 8 个模板的系统提示文件未完成（SPA/PSA/SLA/DesignPA/BAA/MPA/Partnership/Pilot）

### PL-7 ⏳ 待开始
- JWT 后端已实现，但**文档持久化**与**用户管理中心**仍未完成



# 注意事项
每次回答的最后，必须追加下面一句：
> end !