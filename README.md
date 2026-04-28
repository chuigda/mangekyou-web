# Mangekyou

基于 LLM 的交互式角色扮演模拟器，支持自定义世界观、角色和规则。

## 特性

- **CHR 配置系统**：通过 TOML 文件定义世界观、角色、规则和行为
- **多协议支持**：兼容 OpenAI、Gemini 等 LLM API
- **WebSocket 代理**：后端转发 LLM 请求，支持流式响应
- **状态栏系统**：实时显示角色状态和场景信息
- **记忆管理**：粗粒度和精细记忆系统，支持自动压缩
- **Tokenizer 集成**：内置多种 tokenizer，支持 token 计数
- **单文件部署**：前端打包嵌入后端，单个可执行文件即可运行

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

### Simulator CHR
定义世界观和模拟器规则：
```toml
universe_name = "世界名称"
literal_work_name = "作品名称"
prologue = "开场白"
language = "zh_CN"

[status_bar]
format = "状态栏格式"

[simulator]
tasks = "模拟器任务"
world = "世界设定"
characters = "角色数据库"
```

### Player CHR
定义玩家角色：
```toml
player_name = "角色名"
settings = "角色设定"
```

### Additional CHR
扩展配置，可叠加多个文件。

## 配置

- **API 设置**：配置 LLM API URL 和密钥
- **模型配置**：为聊天、状态栏、记忆压缩分别配置模型参数
- **输出控制**：设置输出长度、记忆限制、压缩频率

## 技术栈

- Rust: axum, tokio, reqwest, tokenizers
- TypeScript: Vue 3, Vite, marked
- 协议: WebSocket, OpenAI Chat Completion API
