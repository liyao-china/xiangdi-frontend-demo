import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'

const serverDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(serverDir, '..')
const uploadDir = path.join(projectDir, '.runtime', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const port = Number(process.env.AGENT_PORT || 8787)
const configuredMode = process.env.AGENT_MODE || 'auto'
const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || ''
const baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || ''
const hasModelAccess = Boolean(apiKey) && configuredMode !== 'mock'
const explicitModel = process.env.LLM_MODEL || process.env.OPENAI_MODEL || ''
const isOpenAgentsGateway = baseURL.includes('api-gateway.openagents.org')
// Nemotron models (direct NVIDIA NIM or via an OpenAI-compatible gateway) only
// support Chat Completions, take audio via chat content, and may wrap
// reasoning in <think> tags.
const isNvidia =
  baseURL.includes('nvidia') ||
  apiKey.startsWith('nvapi-') ||
  explicitModel.toLowerCase().includes('nemotron')
const provider = hasModelAccess ? (isNvidia ? 'nvidia' : 'openai') : 'mock'
const model =
  explicitModel || (isNvidia ? 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning' : 'gpt-5.6-sol')
const transcriptionModel = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'
const openai = hasModelAccess
  ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  : null
const app = express()
const assets = new Map()
const runs = new Map()

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const allowed = file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')
    callback(allowed ? null : new Error('只支持图片或音频文件'), allowed)
  },
})

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use((_request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  next()
})

app.get('/api/v1/health', (_request, response) => {
  const capabilities = ['text', 'ui-actions', 'sse']
  if (!isOpenAgentsGateway) capabilities.push('image', 'audio')
  response.json({
    ok: true,
    provider,
    model: provider === 'mock' ? 'xiangdi-demo-agent' : model,
    capabilities,
    timestamp: new Date().toISOString(),
  })
})

app.post('/api/v1/assets', upload.single('file'), (request, response) => {
  if (!request.file) {
    response.status(400).json({ message: '缺少文件' })
    return
  }
  const kind = request.file.mimetype.startsWith('image/') ? 'image' : 'audio'
  const asset = {
    asset_id: `asset_${crypto.randomUUID()}`,
    kind,
    name: request.file.originalname,
    mime_type: request.file.mimetype,
    size: request.file.size,
    path: request.file.path,
  }
  assets.set(asset.asset_id, asset)
  response.status(201).json({
    asset_id: asset.asset_id,
    kind: asset.kind,
    name: asset.name,
    mime_type: asset.mime_type,
    size: asset.size,
  })
})

app.post('/api/v1/audio/transcriptions', upload.single('audio'), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ message: '缺少音频文件' })
    return
  }
  try {
    if (!openai) {
      response.json({
        text: '请帮我解读当前楼栋的日照与噪声风险',
        provider: 'mock',
      })
      return
    }
    if (provider === 'nvidia') {
      if (isOpenAgentsGateway) {
        response.status(501).json({
          message: '主办方 OpenAgents 网关当前只开放文本消息，暂不支持语音文件输入',
        })
        return
      }
      // Nemotron Omni understands audio natively; transcribe via chat completions.
      const audioDataUrl = fileToDataUrl(request.file.path, request.file.mimetype)
      try {
        const result = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'audio_url', audio_url: { url: audioDataUrl } },
                { type: 'text', text: '请逐字转写这段语音为简体中文文本，只输出转写内容，不要添加任何解释。' },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0,
          chat_template_kwargs: { enable_thinking: false },
        })
        const text = stripThinking(result.choices?.[0]?.message?.content || '').trim()
        response.json({ text, provider: 'nvidia' })
      } catch (error) {
        // Some gateways only accept plain-string content and reject audio parts.
        if (isMultimodalRejection(error)) {
          response.status(502).json({ message: '当前模型通道只开放了文本能力，暂不支持语音输入，请直接输入文字' })
          return
        }
        throw error
      }
      return
    }
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(request.file.path),
      model: transcriptionModel,
      response_format: 'text',
    })
    response.json({ text: result.text, provider: 'openai' })
  } catch (error) {
    console.error('[agent] transcription failed', error)
    response.status(502).json({ message: '语音识别暂时不可用' })
  }
})

app.post('/api/v1/agent/runs', (request, response) => {
  const { session_id: sessionId, request_id: requestId, input, context } = request.body || {}
  if (!sessionId || !requestId || !Array.isArray(input) || !context) {
    response.status(400).json({ message: '请求缺少 session_id、request_id、input 或 context' })
    return
  }
  const invalidAsset = input.find(
    (item) => item.type !== 'text' && (!item.asset_id || !assets.has(item.asset_id)),
  )
  if (invalidAsset) {
    response.status(400).json({ message: `素材不存在：${invalidAsset.asset_id || 'unknown'}` })
    return
  }

  const runId = `run_${crypto.randomUUID()}`
  runs.set(runId, {
    runId,
    sessionId,
    requestId,
    input,
    context,
    started: false,
  })
  response.status(202).json({
    run_id: runId,
    stream_url: `/api/v1/agent/runs/${runId}/events`,
  })
})

app.get('/api/v1/agent/runs/:runId/events', (request, response) => {
  const run = runs.get(request.params.runId)
  if (!run) {
    response.status(404).json({ message: 'Agent run 不存在' })
    return
  }
  if (run.started) {
    response.status(409).json({ message: '该 Agent run 已建立流式连接' })
    return
  }
  run.started = true
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.flushHeaders()

  let seq = 0
  let closed = false
  const emit = (type, data) => {
    if (closed) return
    const event = {
      version: '1.0',
      event_id: `evt_${crypto.randomUUID()}`,
      session_id: run.sessionId,
      run_id: run.runId,
      request_id: run.requestId,
      seq: ++seq,
      timestamp: new Date().toISOString(),
      type,
      data,
    }
    response.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  request.on('close', () => {
    closed = true
  })

  void executeRun(run, emit)
    .catch((error) => {
      console.error('[agent] run failed', error)
      emit('agent.state', { state: 'error' })
      emit('run.failed', { message: error instanceof Error ? error.message : 'Agent 运行失败' })
    })
    .finally(() => {
      runs.delete(run.runId)
      if (!closed) response.end()
    })
})

app.use((error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : '请求处理失败'
  response.status(400).json({ message })
})

async function executeRun(run, emit) {
  emit('run.accepted', { provider, model: provider === 'mock' ? 'xiangdi-demo-agent' : model })
  emit('agent.state', { state: 'thinking' })
  const text = run.input
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
    .trim()
  const attachmentAssets = run.input
    .filter((item) => item.type !== 'text')
    .map((item) => assets.get(item.asset_id))
    .filter(Boolean)

  let result
  if (openai) {
    try {
      result = await runModel({ text, context: run.context, attachmentAssets })
    } catch (error) {
      console.error('[agent] model request failed, using deterministic fallback', error)
      result = createMockResult(text, run.context, attachmentAssets)
      result.answer = `在线模型暂时不可用，我先按当前场景数据完成推演。${result.answer}`
    }
  } else {
    await delay(280)
    result = createMockResult(text, run.context, attachmentAssets)
  }

  emit('agent.state', { state: 'speaking', gesture: result.gesture })
  for (const delta of splitText(result.answer)) {
    emit('text.delta', { delta })
    await delay(provider === 'mock' ? 32 : 18)
  }
  for (const action of result.actions) {
    emit('ui.action', { action })
    await delay(90)
  }
  emit('run.completed', {
    answer: result.answer,
    provider: result.provider || provider,
    action_count: result.actions.length,
  })
}

const AGENT_INSTRUCTIONS = [
  '你是“相灵”，相地三维交互系统中的古风多模态空间分析向导。',
  '回答必须简洁、可解释，优先引用当前场景中的楼栋、楼层、日照、噪声和报告证据。',
  '传统格局只能作为文化几何代理表达，不做绝对吉凶断言，不替代专业勘察。',
  '你可以建议前端执行语义化动作，但只能使用给定动作枚举，不能输出代码、CSS 选择器或 URL。',
  '若用户上传图片，说明你观察到的可见信息与不确定性。',
  '',
  '你必须只输出一个 JSON 对象（不要 Markdown 代码块、不要多余文字），结构如下：',
  '{',
  '  "answer": "给用户的中文回答，80 字以内",',
  '  "gesture": "idle | listen | ponder | explain | point 之一",',
  '  "actions": [',
  '    {"type": "动作枚举", "layer_id": "图层或 null", "building_id": "楼栋或 null", "value": 数字或 null, "evidence_id": "证据或 null"}',
  '  ]',
  '}',
  'actions 最多 3 个，可以为空数组 []。',
  '动作枚举只能是：OPEN_LAYER、CLOSE_LAYER、FOCUS_BUILDING、SET_FLOOR、SET_SUN_TIME、OPEN_REPORT、FOCUS_EVIDENCE、START_NARRATION。',
  'layer_id 只能是：terrain、slope、sun、flow、view、noise。',
  'SET_FLOOR 和 SET_SUN_TIME 必须提供数字 value（楼层数或 0-23 的小时）。',
].join('\n')

async function runModel({ text, context, attachmentAssets }) {
  const promptText = [
    `用户问题：${text || '请分析上传的内容'}`,
    `当前页面上下文：${JSON.stringify(context)}`,
  ].join('\n')
  const mediaParts = []
  for (const asset of attachmentAssets) {
    if (asset.kind === 'image') {
      mediaParts.push({
        type: 'image_url',
        image_url: { url: fileToDataUrl(asset.path, asset.mime_type) },
      })
    } else if (asset.kind === 'audio' && provider === 'nvidia') {
      mediaParts.push({
        type: 'audio_url',
        audio_url: { url: fileToDataUrl(asset.path, asset.mime_type) },
      })
    }
  }

  const buildRequest = (userContent) => {
    const request = {
      model,
      messages: [
        { role: 'system', content: AGENT_INSTRUCTIONS },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2048,
      temperature: 0.4,
    }
    if (provider === 'nvidia') {
      // Skip <think> reasoning for lower latency; the demo needs fast turnarounds.
      request.chat_template_kwargs = { enable_thinking: false }
    }
    if (provider !== 'nvidia' || isOpenAgentsGateway) {
      request.response_format = { type: 'json_object' }
    }
    return request
  }

  let response
  if (mediaParts.length === 0) {
    // Plain string keeps compatibility with gateways that reject content arrays.
    response = await openai.chat.completions.create(buildRequest(promptText))
  } else if (isOpenAgentsGateway) {
    response = await openai.chat.completions.create(
      buildRequest(
        `${promptText}\n（用户上传了${mediaParts.length}个媒体文件，但主办方 OpenAgents 网关当前只接收纯文本消息，模型没有看到文件内容。请明确说明此限制，不要声称已识别图片或音频。）`,
      ),
    )
  } else {
    try {
      response = await openai.chat.completions.create(
        buildRequest([{ type: 'text', text: promptText }, ...mediaParts]),
      )
    } catch (error) {
      if (!isMultimodalRejection(error)) throw error
      // Gateway is text-only: answer from context and be honest about the limit.
      response = await openai.chat.completions.create(
        buildRequest(
          `${promptText}\n（用户上传了${mediaParts.length}个媒体文件，但当前通道无法传输媒体内容，请基于文字与场景上下文回答，并说明这一限制。）`,
        ),
      )
    }
  }
  const message = response.choices?.[0]?.message
  const content = message?.content || ''
  const reasoning = message?.reasoning_content || ''
  const parsed =
    extractJson(stripThinking(content)) ||
    extractJson(stripThinking(reasoning))
  if (!parsed || typeof parsed.answer !== 'string') {
    // Preserve a useful, safe result when a gateway puts the answer in an
    // unsupported field or the model ignores the JSON contract.
    const fallback = createMockResult(text, context, attachmentAssets)
    return {
      answer: extractAnswerText(content) || fallback.answer,
      gesture: fallback.gesture,
      actions: fallback.actions,
      provider,
    }
  }
  const gestures = ['idle', 'listen', 'ponder', 'explain', 'point']
  return {
    answer: parsed.answer,
    gesture: gestures.includes(parsed.gesture) ? parsed.gesture : 'explain',
    actions: (Array.isArray(parsed.actions) ? parsed.actions : [])
      .slice(0, 3)
      .map(normalizeModelAction)
      .filter(Boolean),
    provider,
  }
}

function fileToDataUrl(filePath, mimeType) {
  const base64 = fs.readFileSync(filePath).toString('base64')
  return `data:${mimeType};base64,${base64}`
}

function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
}

function isMultimodalRejection(error) {
  const status = error?.status ?? error?.response?.status
  if (status !== 422 && status !== 400) return false
  const detail = JSON.stringify(error?.error ?? error?.message ?? '')
  return /string|content|multimodal|image|audio/i.test(detail)
}

function extractJson(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  for (let end = text.length; end > start; end -= 1) {
    if (text[end - 1] !== '}') continue
    try {
      return JSON.parse(text.slice(start, end))
    } catch {
      // keep shrinking until the outermost balanced object parses
    }
  }
  return null
}

function extractAnswerText(text) {
  const cleaned = stripThinking(text).trim()
  if (!cleaned) return ''
  if (!cleaned.startsWith('{') && !cleaned.startsWith('```')) return cleaned
  const withoutFence = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const match = withoutFence.match(/"answer"\s*:\s*"((?:\\.|[^"\\])*)(?:"|$)/)
  if (!match) return ''
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
  }
}

function normalizeModelAction(action) {
  switch (action.type) {
    case 'OPEN_LAYER':
    case 'CLOSE_LAYER':
      return action.layer_id ? { type: action.type, layerId: action.layer_id } : null
    case 'FOCUS_BUILDING':
      return action.building_id ? { type: action.type, buildingId: action.building_id } : null
    case 'SET_FLOOR':
    case 'SET_SUN_TIME':
      return Number.isFinite(action.value) ? { type: action.type, value: action.value } : null
    case 'FOCUS_EVIDENCE':
      return action.evidence_id ? { type: action.type, evidenceId: action.evidence_id } : null
    case 'OPEN_REPORT':
    case 'START_NARRATION':
      return { type: action.type }
    default:
      return null
  }
}

function createMockResult(text, context, attachmentAssets) {
  const prompt = text || '图片分析'
  const location = context.location || '当前场景'
  const target = context.buildingName
    ? `${context.buildingName}${context.floor ? ` ${context.floor} 层` : ''}`
    : '尚未选定楼栋'
  const actions = []
  let answer

  if (attachmentAssets.some((asset) => asset.kind === 'image')) {
    answer = `我已收到现场图片，并将它与${location}的三维上下文关联。演示模式可完成图片入库与场景联动；接入 OpenAI 密钥后，我会进一步识别可见的建筑朝向、遮挡、道路与开敞面，并明确标注不确定项。`
  } else if (/报告|结论|证据|建议/.test(prompt)) {
    answer = context.reportReady
      ? `${target}的综合结论已就绪：日照约 4.8 小时、通勤条件较好，主要关注临街噪声与低楼层遮挡。我已为你打开报告，可继续追问每条证据。`
      : `我会先基于${target}完成日照、噪声与视域推演，结果落位后再打开报告，避免脱离证据直接下结论。`
    actions.push({ type: 'OPEN_REPORT' })
  } else if (/日照|阳光|采光/.test(prompt)) {
    answer = `${target}当前日照代理约 4.8 小时，整体充足。建议把时间轴设为 15:00，结合日照图层观察西南侧遮挡变化；低楼层还应核验冬至日最不利时段。`
    actions.push({ type: 'OPEN_LAYER', layerId: 'sun' })
    actions.push({ type: 'SET_SUN_TIME', value: 15 })
  } else if (/噪声|安静|临街/.test(prompt)) {
    answer = `${target}南侧临主干道，噪声代理为中等。卧室宜避开临街面，或核验夜间实测噪声并配置降噪窗。我已打开噪声图层。`
    actions.push({ type: 'OPEN_LAYER', layerId: 'noise' })
  } else if (/视野|视域|遮挡|开阔/.test(prompt)) {
    answer = `${target}的楼间遮挡代理约 18%，当前楼层视域表现较好。我已打开视域图层，建议再比较 10 层以上单元。`
    actions.push({ type: 'OPEN_LAYER', layerId: 'view' })
  } else if (/坡度|地形/.test(prompt)) {
    answer = `我已将坡度图层叠加到${location}。城市楼盘更应把坡度结果与出入口高差、无障碍通行和雨水组织一起核验。`
    actions.push({ type: 'OPEN_LAYER', layerId: 'slope' })
  } else if (/排水|汇流|水系/.test(prompt)) {
    answer = `我已打开汇流图层。请重点检查场地低点、地下车库入口和暴雨时的排水路径；这里的结果是规划沟通代理，不替代专项排水评估。`
    actions.push({ type: 'OPEN_LAYER', layerId: 'flow' })
  } else if (/楼层|高层|低层/.test(prompt)) {
    answer = `${target}可作为当前基准。若优先减少冬季遮挡，建议先比较 11 层；同时不要只看楼层，还要结合临街朝向与噪声。`
    actions.push({ type: 'SET_FLOOR', value: 11 })
  } else {
    answer = `我正在查看${location}的${target}。你可以让我打开日照、噪声或视域图层，也可以上传现场图片；完成指标计算后，我还能在报告页逐条解释证据。`
  }

  return {
    answer,
    gesture: actions.length ? 'point' : 'explain',
    actions,
    provider: 'mock',
  }
}

function splitText(text) {
  const chunks = []
  for (let index = 0; index < text.length; index += 8) {
    chunks.push(text.slice(index, index + 8))
  }
  return chunks
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

app.listen(port, '127.0.0.1', () => {
  console.log(`[agent] Xiangdi Agent API listening on http://127.0.0.1:${port}`)
  console.log(`[agent] provider=${provider} model=${provider === 'openai' ? model : 'xiangdi-demo-agent'}`)
})
