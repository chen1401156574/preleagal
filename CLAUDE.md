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

## 实现状态
- **PL-4** ✅: 基础架构、Docker 容器化、用户认证（注册/登录/登出）、JWT Token、NDA 预览与 PDF 下载、启动/停止脚本
- **PL-5** ✅: AI 聊天界面、后端 API、Cerebras LLM 集成（通过 OpenRouter）、结构化输出与实时预览更新、PDF 下载（NDA）。
- **PL-6** 🔄: UI 焦点优化（A4 纸质感 Document Preview）、AI 追问逻辑优化（固定 6 步引导顺序、支持多字段抽取、移除不合理默认值）已完成；扩展支持全部 11 种法律文档模板尚未完成。
- **PL-7** : JWT 注册/登录与 `/api/me` 接口已实现；文档持久化与用户管理中心仍未完成。

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

## 本次修订记录（2026-04-22）
- **AI 聊天修复与优化**：修复 OpenRouter 模型 ID 与环境变量加载问题，彻底跑通了对话式字段提取流程。固定了 6 步必填信息引导顺序，支持跨步多字段抽取，并移除了可能引起误导的不合理默认值（如默认 1 年保密期）。
- **UI 与预览重构**：深度重构 Document Preview 界面，引入 `@tailwindcss/typography` 与 `remark-gfm`，修复了 Markdown 表格渲染，实现了专业的 A4 纸张质感与法律合同排版层级。
- **状态更新**：更新 PL-6 进度，确认 AI 逻辑与 UI 优化部分已完成。

## 历史修订记录（2026-04-21）
- 基于当前代码实现重新核对并修正“实现状态（PL-4~PL-7）”。
- 更正 AI 相关描述：标注为“尚未接入模型与对话式字段提取”。
- 更正 API 概览：删除未实现的文档 CRUD/聊天接口描述，仅保留当前可用接口。
- 更正技术描述：前端为 Next.js 开发服务，SQLite 为用户数据表初始化方案（非每次重建清空）。
- 补充范围说明：11 个模板已收录，但尚未全部打通到统一生成流程。

