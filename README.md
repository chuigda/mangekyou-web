# Mangekyou - 万华镜

基于 LLM 的交互式角色扮演模拟器，支持自定义世界观、角色和规则。

## 特性

- **CHR 配置系统**：通过 TOML 文件定义世界观、角色、规则和行为
- **多协议支持**：兼容 OpenAI、Gemini 等 LLM API
- **WebSocket 代理**：后端转发 LLM 请求，支持流式响应
- **状态栏系统**：实时显示角色状态和场景信息
- **四层记忆结构**：消息内联 / 状态栏 / 短期记忆 / 长期记忆，分层组织上下文
- **可扩展架构**：支持同时加载多个 addon CHR，灵活叠加世界设定与规则
- **多模型混合调度**：聊天、状态栏、记忆压缩可分别配置不同模型，节省 token
- **Tokenizer 集成**：内置多种 tokenizer，支持 token 计数
- **单文件部署**：前端打包嵌入后端，单个可执行文件即可运行

## 我们的优势

### 为大世界量身打造的提示词工程

内置提示词并非简单的"扮演 XX"模板，而是经过反复打磨、专为 **大型持续世界（Persistent Large World）** 优化的指令集：

- 强调世界观一致性与时间线连贯，避免角色与设定漂移
- 显式区分"模拟器视角"与"角色视角"，降低 LLM 越权叙述
- 内建 NPC 数据库 / 场景数据库 / 规则数据库的引用约定，可承载长篇世界书
- 提示词全部以 XML 结构组织，对主流 LLM（Claude / GPT / Gemini / Deepseek）都有良好的指令遵循表现

提示词模板位于 [frontend/src/assets/prompts](frontend/src/assets/prompts)，可直接查阅或自行覆盖。

### 可叠加的扩展系统

CHR 文件分为三类：`simulator`（世界本体）、`player`（玩家角色）、`addon`（扩展包）。

- **多 addon 同时加载**：可以把"魔法体系""势力补丁""新角色卡"拆成独立的 addon，按需组合
- **非破坏性叠加**：addon 仅追加内容，不会污染主世界 CHR，便于分享与复用
- **社区友好**：每个 addon 是单一 TOML 文件，复制粘贴即可分发

空白 CHR 文件：[frontend/src/assets/tomls/example](frontend/src/assets/tomls/example)
示例：[frontend/src/assets/tomls/harry-potter](frontend/src/assets/tomls/harry-potter)

### 四层记忆解构

为了在有限上下文里塞下尽可能丰富的世界状态，Mangekyou 把"记忆"拆分为四个层次，由不同机制维护：

| 层次 | 作用 | 更新方式 |
| --- | --- | --- |
| 消息内联（Inline） | 最近若干轮原始对话 | 自动滚动 |
| 状态栏（Status Bar） | 当前场景、角色状态、关键变量 | 每轮由小模型刷新 |
| 短期记忆（Short-term） | 近期事件摘要 | 每轮自动生成 |
| 长期记忆（Long-term） | 世界级、跨章节的关键事实 | 由短期记忆进一步沉淀 |

这种分层让"最近发生了什么""我现在在哪里""这个世界发生过什么"被分别承载，而不是全部塞进同一段 prompt。

### 大小模型混合，省钱省时延

- 主聊天模型可以使用 Claude Opus / GPT-4 等强模型保证叙事质量
- 状态栏刷新、记忆压缩这类**结构化、低创意**的任务，可以单独配置为 Haiku / GPT-4o-mini / Deepseek 等小模型
- 三类模型的 URL、API Key、参数完全独立，可分别接入不同提供商

## 架构

- **后端**：Rust + Axum，提供 WebSocket 代理和 CHR 解析
- **前端**：Vue 3 + TypeScript，构建打包后嵌入后端

## 快速开始

### 构建

```bash
# 构建前端
cd frontend
npm install
npm run build

# 构建后端
cd ../backstage
cargo build --release
```

### 运行

```bash
./target/release/mangekyou.exe
```

访问 `http://127.0.0.1:3000`

## CHR 文件格式

CHR（Character / Configuration）文件使用 TOML 编写，分为三种角色：

- **Simulator CHR**：定义世界观、模拟器规则、状态栏格式、NPC 与场景数据库
- **Player CHR**：定义玩家角色的姓名、身份、设定
- **Addon CHR**：扩展包，可叠加多个，用于追加魔法体系、势力、剧情补丁等

完整字段说明与可直接运行的示例，请直接参考示例文件夹：

- 通用示例（推荐入门阅读）：[frontend/src/assets/tomls/example](frontend/src/assets/tomls/example)
  - [example.simulator.chr.toml](frontend/src/assets/tomls/example/example.simulator.chr.toml)
  - [example.player.chr.toml](frontend/src/assets/tomls/example/example.player.chr.toml)
  - [example.addon.chr.toml](frontend/src/assets/tomls/example/example.addon.chr.toml)
- 完整世界示例（哈利波特 + 伊斯兰魔法 addon 叠加）：[frontend/src/assets/tomls/harry-potter](frontend/src/assets/tomls/harry-potter)

## 配置

- **API 设置**：配置 LLM API URL 和密钥
- **模型配置**：为聊天、状态栏、记忆压缩分别配置模型参数（可使用不同提供商 / 不同规格的模型）
- **输出控制**：设置输出长度、记忆限制、压缩频率
