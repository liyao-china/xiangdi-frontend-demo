import type {
  AgentAttachment,
  AgentEvent,
  AgentPageContext,
} from './types'

const API_BASE = import.meta.env.VITE_AGENT_API_BASE || '/api/v1'

type HealthResponse = {
  ok: boolean
  provider: 'openai' | 'nvidia' | 'mock'
  model: string
}

type RunInput = {
  text: string
  attachments: AgentAttachment[]
  context: AgentPageContext
}

export async function getAgentHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`)
  if (!response.ok) throw new Error('Agent 服务未连接')
  return response.json() as Promise<HealthResponse>
}

export async function uploadAgentAsset(file: File): Promise<AgentAttachment> {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${API_BASE}/assets`, { method: 'POST', body })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || '图片上传失败')
  }
  const result = (await response.json()) as {
    asset_id: string
    kind: 'image' | 'audio'
    name: string
    mime_type: string
    size: number
  }
  return {
    assetId: result.asset_id,
    kind: result.kind,
    name: result.name,
    mimeType: result.mime_type,
    size: result.size,
  }
}

export async function transcribeAgentAudio(file: File): Promise<string> {
  const body = new FormData()
  body.append('audio', file)
  const response = await fetch(`${API_BASE}/audio/transcriptions`, {
    method: 'POST',
    body,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || '语音识别失败')
  }
  const result = (await response.json()) as { text: string }
  return result.text
}

export async function streamAgentRun(
  input: RunInput,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const sessionId = getSessionId()
  const requestId = crypto.randomUUID()
  const requestInput: Array<Record<string, string>> = []
  if (input.text.trim()) requestInput.push({ type: 'text', text: input.text.trim() })
  input.attachments.forEach((attachment) => {
    requestInput.push({
      type: attachment.kind,
      asset_id: attachment.assetId,
    })
  })

  const response = await fetch(`${API_BASE}/agent/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      request_id: requestId,
      input: requestInput,
      context: input.context,
    }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Agent 请求创建失败')
  }

  const run = (await response.json()) as { stream_url: string }
  await new Promise<void>((resolve, reject) => {
    const source = new EventSource(run.stream_url)
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AgentEvent
        onEvent(event)
        if (event.type === 'run.completed') {
          source.close()
          resolve()
        }
        if (event.type === 'run.failed') {
          source.close()
          reject(new Error(String(event.data.message || 'Agent 运行失败')))
        }
      } catch {
        source.close()
        reject(new Error('Agent 事件格式错误'))
      }
    }
    source.onerror = () => {
      source.close()
      reject(new Error('Agent 流式连接中断'))
    }
  })
}

function getSessionId() {
  const key = 'xiangdi_agent_session_id'
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const value = `session_${crypto.randomUUID()}`
  window.sessionStorage.setItem(key, value)
  return value
}
