# 相地三维交互系统 · 多模态 Agent Demo

本项目把古风三维数字人“相灵”接入城市三维选址页和分析报告页，形成一个可本地演示的多模态 Agent 闭环。

多模态 Agent 的架构、接口、模型配置与能力边界见 [`MULTIMODAL_AGENT.md`](./MULTIMODAL_AGENT.md)。

## 已接入能力

- 3D 数字人状态：待命、倾听、分析、讲解、异常、离线
- 文本问答：通过 SSE 流式返回，答案逐字呈现
- 图片输入：上传现场/建筑图片并加入 Agent 上下文
- 语音输入：浏览器录音后调用语音转写接口
- 语音输出：浏览器中文语音朗读 Agent 最终答案
- 页面联动：Agent 只能通过安全语义动作切换图层、楼层、日照时间和报告
- 跨页面会话：主场景与报告页共用同一段会话和状态
- 双运行模式：有 OpenAI 密钥时调用真实模型，无密钥时自动使用确定性的 Demo Agent

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:5173/xiangdi-frontend-demo/
```

`npm run dev` 会同时启动：

- Vite 前端：`127.0.0.1:5173`
- Agent API：`127.0.0.1:8787`

## 接入真实模型

复制环境变量示例：

```bash
cp .env.example .env
```

方案 A：主办方 OpenAgents 网关：

```text
AGENT_MODE=auto
LLM_BASE_URL=https://api-gateway.openagents.org/v1
LLM_API_KEY=sk-你的主办方密钥
LLM_MODEL=nemotron-3-nano-omni
```

该网关目前只接受纯文本 `messages[].content`。文本推理和 Agent 页面动作可用，
但图片、音频输入会被网关拒绝；这不是 Nemotron 模型本身的能力限制。

方案 B：NVIDIA 官方 Nemotron 3 Nano Omni（文本/图片/语音统一一个模型）：

```text
AGENT_MODE=auto
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=nvapi-你的密钥
LLM_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

方案 C：OpenAI：

```text
AGENT_MODE=auto
OPENAI_API_KEY=你的服务端密钥
OPENAI_MODEL=gpt-5.6-sol
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

修改 `.env` 后需要重启 Agent 服务（`npm run dev:agent` 或重跑 `npm run dev`）。
密钥只放在服务端 `.env`，不要写进前端代码或提交到 Git。

## 三方联调协议

- OpenAPI：`contracts/openapi.yaml`
- SSE 事件：`contracts/agent-events.schema.json`
- 前端安全动作：`contracts/ui-actions.schema.json`

核心链路：

```text
文本 / 图片 / 录音
  → POST /api/v1/assets 或 /audio/transcriptions
  → POST /api/v1/agent/runs
  → GET /api/v1/agent/runs/{runId}/events
  → text.delta / agent.state / ui.action
  → 对话内容 + 3D 状态 + 页面语义动作
```

前端不会执行 Agent 返回的代码、选择器或 URL，只执行动作白名单：

`OPEN_LAYER`、`CLOSE_LAYER`、`FOCUS_BUILDING`、`SET_FLOOR`、`SET_SUN_TIME`、`OPEN_REPORT`、`FOCUS_EVIDENCE`、`START_NARRATION`。

## 常用命令

```bash
npm run dev          # 前端与 Agent API 一起启动
npm run dev:web      # 只启动前端
npm run dev:agent    # 只启动 Agent API
npm run build        # TypeScript 检查与生产构建
```
