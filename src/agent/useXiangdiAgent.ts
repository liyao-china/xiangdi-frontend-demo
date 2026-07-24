import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getAgentHealth,
  streamAgentRun,
  transcribeAgentAudio,
  uploadAgentAsset,
} from './client'
import type {
  AgentAttachment,
  AgentConnection,
  AgentController,
  AgentEvent,
  AgentMessage,
  AgentPageContext,
  AgentRuntimeState,
  AgentUiAction,
} from './types'

const WELCOME_MESSAGE: AgentMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '我是相灵。你可以问我当前楼栋、楼层、日照、噪声和报告证据，也可以上传现场图片。',
}

export function useXiangdiAgent(
  context: AgentPageContext,
  onAction: (action: AgentUiAction) => void,
): AgentController {
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME_MESSAGE])
  const [state, setState] = useState<AgentRuntimeState>('idle')
  const [connection, setConnection] = useState<AgentConnection>('checking')
  const [providerLabel, setProviderLabel] = useState('连接中')
  const [sending, setSending] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const contextRef = useRef(context)
  const actionRef = useRef(onAction)
  const voiceRef = useRef(voiceEnabled)

  useEffect(() => {
    contextRef.current = context
  }, [context])

  useEffect(() => {
    actionRef.current = onAction
  }, [onAction])

  useEffect(() => {
    voiceRef.current = voiceEnabled
  }, [voiceEnabled])

  useEffect(() => {
    let active = true
    getAgentHealth()
      .then((health) => {
        if (!active) return
        const providerNames: Record<string, string> = {
          openai: 'OpenAI',
          nvidia: 'NVIDIA',
        }
        setConnection(health.provider === 'mock' ? 'demo' : 'online')
        setProviderLabel(
          health.provider === 'mock'
            ? '本地演示模式'
            : `${providerNames[health.provider] ?? health.provider} · ${health.model}`,
        )
      })
      .catch(() => {
        if (!active) return
        setConnection('offline')
        setProviderLabel('服务未连接')
        setState('offline')
      })
    return () => {
      active = false
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!voiceRef.current || !('speechSynthesis' in window) || !text.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.94
    utterance.pitch = 1.04
    utterance.onstart = () => setState('speaking')
    utterance.onend = () => setState('idle')
    window.speechSynthesis.speak(utterance)
  }, [])

  const sendMessage = useCallback(
    async (text: string, attachments: AgentAttachment[] = []) => {
      const prompt = text.trim()
      if ((!prompt && attachments.length === 0) || sending) return

      const userId = `user_${crypto.randomUUID()}`
      const assistantId = `assistant_${crypto.randomUUID()}`
      setMessages((current) => [
        ...current,
        {
          id: userId,
          role: 'user',
          text: prompt || '请分析我上传的内容',
          attachments,
        },
        { id: assistantId, role: 'assistant', text: '', pending: true },
      ])
      setSending(true)
      setState('thinking')
      let finalText = ''

      try {
        await streamAgentRun(
          { text: prompt, attachments, context: contextRef.current },
          (event: AgentEvent) => {
            if (event.type === 'agent.state') {
              const nextState = event.data.state
              if (typeof nextState === 'string') {
                setState(nextState as AgentRuntimeState)
              }
            }
            if (event.type === 'text.delta') {
              const delta = String(event.data.delta || '')
              finalText += delta
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? { ...message, text: message.text + delta, pending: true }
                    : message,
                ),
              )
            }
            if (event.type === 'ui.action') {
              actionRef.current(event.data.action as AgentUiAction)
            }
            if (event.type === 'run.completed') {
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId ? { ...message, pending: false } : message,
                ),
              )
            }
          },
        )
        setState('speaking')
        speak(finalText)
        if (!voiceRef.current) window.setTimeout(() => setState('idle'), 700)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Agent 请求失败'
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, text: `暂时无法完成：${message}`, pending: false }
              : item,
          ),
        )
        setState(connection === 'offline' ? 'offline' : 'error')
      } finally {
        setSending(false)
      }
    },
    [connection, sending, speak],
  )

  const uploadImage = useCallback(async (file: File) => uploadAgentAsset(file), [])
  const transcribeAudio = useCallback(
    async (file: File) => transcribeAgentAudio(file),
    [],
  )
  const setListening = useCallback((listening: boolean) => {
    setState(listening ? 'listening' : 'idle')
  }, [])
  const clearMessages = useCallback(() => setMessages([WELCOME_MESSAGE]), [])

  return {
    messages,
    state,
    connection,
    providerLabel,
    sending,
    voiceEnabled,
    sendMessage,
    uploadImage,
    transcribeAudio,
    setListening,
    setVoiceEnabled,
    clearMessages,
  }
}
