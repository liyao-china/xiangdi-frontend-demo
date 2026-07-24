import { useEffect, useRef, useState } from 'react'
import type { AgentAttachment, AgentController } from './agent/types'

const QUICK_PROMPTS = {
  scene: ['解读当前楼栋', '打开日照图层', '噪声风险怎么样？'],
  report: ['总结三条证据', '哪条建议最优先？', '朗读报告结论'],
}

export default function AgentConsole({
  agent,
  variant,
}: {
  agent: AgentController
  variant: 'scene' | 'report'
}) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<AgentAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messageListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = messageListRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [agent.messages])

  const submit = async () => {
    if ((!draft.trim() && attachments.length === 0) || agent.sending) return
    const outgoing = attachments
    const prompt = draft
    setDraft('')
    setAttachments([])
    setError('')
    await agent.sendMessage(prompt, outgoing)
  }

  const handleImage = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    setUploading(true)
    setError('')
    try {
      const attachment = await agent.uploadImage(file)
      setAttachments((current) => [...current, attachment])
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '图片上传失败')
    } finally {
      setUploading(false)
    }
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('当前浏览器不支持录音，请直接输入文字')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        setRecording(false)
        agent.setListening(false)
        stream.getTracks().forEach((track) => track.stop())
        const mimeType = recorder.mimeType || 'audio/webm'
        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm'
        const file = new File(audioChunksRef.current, `voice-${Date.now()}.${extension}`, {
          type: mimeType,
        })
        setUploading(true)
        try {
          const transcript = await agent.transcribeAudio(file)
          setDraft((current) => (current ? `${current} ${transcript}` : transcript))
        } catch (transcriptionError) {
          setError(
            transcriptionError instanceof Error
              ? transcriptionError.message
              : '语音识别失败',
          )
        } finally {
          setUploading(false)
        }
      }
      recorder.start()
      setRecording(true)
      agent.setListening(true)
    } catch {
      setError('无法使用麦克风，请检查浏览器权限')
      agent.setListening(false)
    }
  }

  return (
    <section className={`agent-console agent-console--${variant}`} aria-label="相灵多模态对话">
      <div className="agent-console-header">
        <div>
          <strong>与相灵对话</strong>
          <span className={`agent-connection agent-connection--${agent.connection}`}>
            {agent.providerLabel}
          </span>
        </div>
        <div className="agent-console-tools">
          <button
            type="button"
            className={agent.voiceEnabled ? 'active' : ''}
            onClick={() => agent.setVoiceEnabled(!agent.voiceEnabled)}
            title={agent.voiceEnabled ? '关闭语音播报' : '开启语音播报'}
          >
            {agent.voiceEnabled ? '声' : '静'}
          </button>
          <button type="button" onClick={agent.clearMessages} title="清空对话">
            清
          </button>
        </div>
      </div>

      <div className="agent-messages" ref={messageListRef} aria-live="polite">
        {agent.messages.slice(-6).map((message) => (
          <div
            key={message.id}
            className={`agent-message agent-message--${message.role}`}
          >
            <span className="agent-message-role">
              {message.role === 'assistant' ? '相灵' : '你'}
            </span>
            <p>
              {message.text || (message.pending ? '正在推演…' : '')}
              {message.pending && <i className="agent-typing">•••</i>}
            </p>
            {!!message.attachments?.length && (
              <div className="agent-message-assets">
                {message.attachments.map((attachment) => (
                  <span key={attachment.assetId}>图 · {attachment.name}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {variant === 'scene' && (
        <div className="agent-quick-prompts">
          {QUICK_PROMPTS[variant].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setDraft(prompt)
                setError('')
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {!!attachments.length && (
        <div className="agent-attachments">
          {attachments.map((attachment) => (
            <button
              key={attachment.assetId}
              type="button"
              onClick={() =>
                setAttachments((current) =>
                  current.filter((item) => item.assetId !== attachment.assetId),
                )
              }
            >
              图 · {attachment.name} ×
            </button>
          ))}
        </div>
      )}

      <div className="agent-compose">
        <textarea
          value={draft}
          rows={2}
          placeholder={
            variant === 'report'
              ? '追问报告证据或建议…'
              : '问楼栋、楼层、日照、噪声，也可上传图片…'
          }
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void submit()
            }
          }}
        />
        <div className="agent-compose-actions">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void handleImage(event.target.files?.[0])
              event.currentTarget.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            title="上传现场图片"
          >
            图
          </button>
          <button
            type="button"
            className={recording ? 'recording' : ''}
            onClick={() => void toggleRecording()}
            disabled={uploading}
            title={recording ? '停止录音' : '语音提问'}
          >
            {recording ? '停' : '麦'}
          </button>
          <button
            type="button"
            className="agent-send"
            onClick={() => void submit()}
            disabled={agent.sending || uploading || (!draft.trim() && !attachments.length)}
          >
            {agent.sending ? '推演中' : '发送'}
          </button>
        </div>
      </div>
      {(error || recording || uploading) && (
        <p className={`agent-console-notice ${error ? 'error' : ''}`}>
          {error || (recording ? '正在倾听，再次点击结束录音' : '正在处理多模态内容…')}
        </p>
      )}
    </section>
  )
}
