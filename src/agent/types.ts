export type AgentRuntimeState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'offline'

export type AgentAttachment = {
  assetId: string
  kind: 'image' | 'audio'
  name: string
  mimeType: string
  size: number
}

export type AgentMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  attachments?: AgentAttachment[]
  pending?: boolean
}

export type AgentPageContext = {
  page: 'scene' | 'report'
  scenario: string
  location: string
  stage: string
  buildingId: string | null
  buildingName: string | null
  floor: number | null
  sunHour: number
  activeLayers: string[]
  reportReady: boolean
  modernScore?: number
  cultureScore?: number
}

export type AgentUiAction =
  | { type: 'OPEN_LAYER'; layerId: string }
  | { type: 'CLOSE_LAYER'; layerId: string }
  | { type: 'FOCUS_BUILDING'; buildingId: string }
  | { type: 'SET_FLOOR'; value: number }
  | { type: 'SET_SUN_TIME'; value: number }
  | { type: 'OPEN_REPORT' }
  | { type: 'FOCUS_EVIDENCE'; evidenceId: string }
  | { type: 'START_NARRATION' }

export type AgentEvent = {
  version: '1.0'
  event_id: string
  session_id: string
  run_id: string
  request_id: string
  seq: number
  timestamp: string
  type:
    | 'run.accepted'
    | 'agent.state'
    | 'text.delta'
    | 'ui.action'
    | 'run.completed'
    | 'run.failed'
  data: Record<string, unknown>
}

export type AgentConnection = 'checking' | 'online' | 'demo' | 'offline'

export type AgentController = {
  messages: AgentMessage[]
  state: AgentRuntimeState
  connection: AgentConnection
  providerLabel: string
  sending: boolean
  voiceEnabled: boolean
  sendMessage: (text: string, attachments?: AgentAttachment[]) => Promise<void>
  uploadImage: (file: File) => Promise<AgentAttachment>
  transcribeAudio: (file: File) => Promise<string>
  setListening: (listening: boolean) => void
  setVoiceEnabled: (enabled: boolean) => void
  clearMessages: () => void
}
