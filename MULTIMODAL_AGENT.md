# 相灵多模态 Agent 接入说明

本文档单独说明“相灵”多模态 Agent 的架构、接口协议、模型配置、页面联动和当前能力边界。

## 1. 整体架构

```text
用户文本 / 图片 / 录音
        ↓
React 对话组件（AgentConsole）
        ↓
Express Agent API
  ├─ 素材上传
  ├─ 语音转写
  ├─ 模型调用
  └─ 页面动作安全校验
        ↓ SSE
文本增量 + 数字人状态 + 白名单 UI 动作
        ↓
三维场景 / 报告页 / 相灵 3D 数字人
```

前端只依赖统一协议，不直接依赖某一家模型；服务端负责把不同模型的输出转换为相同的 SSE 事件。

## 2. 已实现能力

- 文本问答与 SSE 流式输出。
- 图片和音频文件上传，单文件上限 12 MB。
- 浏览器麦克风录音与语音转写接口。
- 浏览器中文 TTS 语音播报。
- 主场景与报告页共享 Agent 会话。
- 3D 数字人状态联动：`idle`、`listening`、`thinking`、`speaking`、`error`、`offline`。
- Agent 根据页面上下文读取地点、楼栋、楼层、图层和报告状态。
- Agent 通过白名单动作控制图层、楼栋、楼层、日照时间和报告。
- 无密钥时自动使用确定性 Mock Agent，真实模型异常时自动降级。

## 3. 模型配置

复制环境变量模板：

```bash
cp .env.example .env
```

### OpenAgents 主办方网关

```dotenv
AGENT_MODE=auto
LLM_BASE_URL=https://api-gateway.openagents.org/v1
LLM_API_KEY=sk-你的主办方密钥
LLM_MODEL=nemotron-3-nano-omni
```

当前实测结果：

- 文本推理：可用。
- JSON Agent 结果：可用，服务端带兼容解析与安全降级。
- UI 白名单动作：可用。
- 图片和音频输入：网关当前要求 `messages[].content` 为字符串，拒绝多模态内容数组，因此暂不可用。

这是主办方中转网关的接口限制，不代表 Nemotron 3 Nano Omni 模型本身不支持图片和音频。

### NVIDIA 官方 NIM

```dotenv
AGENT_MODE=auto
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=nvapi-你的 NVIDIA 密钥
LLM_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

官方多模态接口可接收文本、图片和音频输入，输出为文本。数字人语音播报仍需要浏览器 TTS 或独立语音合成服务。

### 本地演示模式

```dotenv
AGENT_MODE=mock
```

本地模式无需密钥，用于稳定演示页面状态、SSE、对话和 UI 动作。

## 4. Agent API

### 健康检查

```http
GET /api/v1/health
```

返回当前 provider、model 和实际开放的能力列表。

### 上传素材

```http
POST /api/v1/assets
Content-Type: multipart/form-data
```

表单字段为 `file`，支持图片和音频。

### 语音转写

```http
POST /api/v1/audio/transcriptions
Content-Type: multipart/form-data
```

表单字段为 `audio`。

### 创建 Agent 任务

```http
POST /api/v1/agent/runs
Content-Type: application/json
```

请求示例：

```json
{
  "session_id": "session_001",
  "request_id": "request_001",
  "input": [
    {
      "type": "text",
      "text": "分析 2 号楼 7 层的日照情况"
    }
  ],
  "context": {
    "page": "scene",
    "buildingName": "2 号楼",
    "floor": 7,
    "active_layers": []
  }
}
```

### 接收 SSE 事件

```http
GET /api/v1/agent/runs/{runId}/events
```

主要事件：

- `run.accepted`：任务已接受。
- `agent.state`：数字人状态变化。
- `text.delta`：回答文本增量。
- `ui.action`：页面语义动作。
- `run.completed`：任务完成。
- `run.failed`：任务失败。

完整格式见：

- `contracts/openapi.yaml`
- `contracts/agent-events.schema.json`
- `contracts/ui-actions.schema.json`

## 5. 页面动作白名单

模型不能返回代码、CSS 选择器或任意 URL。前端只执行以下动作：

| 动作 | 作用 |
|---|---|
| `OPEN_LAYER` | 打开地形、坡度、日照、汇流、视域或噪声图层 |
| `CLOSE_LAYER` | 关闭指定图层 |
| `FOCUS_BUILDING` | 聚焦指定楼栋 |
| `SET_FLOOR` | 切换楼层 |
| `SET_SUN_TIME` | 设置日照时间 |
| `OPEN_REPORT` | 打开分析报告 |
| `FOCUS_EVIDENCE` | 聚焦报告证据 |
| `START_NARRATION` | 开始报告讲解 |

服务端会规范化模型动作，前端会再次校验白名单。

## 6. 关键代码

- `server/index.mjs`：模型调用、素材上传、语音转写和 SSE 服务。
- `src/AgentConsole.tsx`：文本、图片、录音和语音开关。
- `src/agent/client.ts`：Agent API 客户端。
- `src/agent/useXiangdiAgent.ts`：会话、状态、流式事件和 TTS。
- `src/XianglingAgent.tsx`：3D 数字人展示与状态映射。

## 7. 当前未实现

- OpenAgents 网关下的真实图片理解和语音理解。
- 3D 模型骨骼动画、表情和口型同步。
- 服务端自然音色 TTS；目前使用浏览器语音合成。
- 多轮对话历史持久化和数据库存储。
- 用户鉴权、限流、审计和生产级素材存储。
- 真实 GIS 日照、噪声、视域计算服务；当前演示指标为模板数据。

## 8. 安全要求

- API Key 只能放在服务端 `.env`，不得写入前端代码。
- `.env` 和 `.runtime/` 已加入 `.gitignore`。
- Agent 只能返回结构化语义动作，不能执行任意代码。
- 正式部署应增加身份认证、请求限流、文件扫描和日志脱敏。

