import { useEffect, useRef, useState } from 'react'
import '@google/model-viewer'

export type XianglingAgentState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'offline'

const STATE_LABEL: Record<XianglingAgentState, string> = {
  idle: '随时待命',
  listening: '正在倾听',
  thinking: '正在分析',
  speaking: '正在讲解',
  error: '连接异常',
  offline: '服务离线',
}

const STATE_TITLE: Record<XianglingAgentState, string> = {
  idle: '相灵已进入场景',
  listening: '我在听，请继续',
  thinking: '正在推演空间关系',
  speaking: '为你解读分析结论',
  error: '刚才的推演没有完成',
  offline: '相灵正在等待服务连接',
}

export default function XianglingAgent({
  variant,
  state,
  message,
}: {
  variant: 'scene' | 'report'
  state: XianglingAgentState
  message: string
}) {
  const viewerRef = useRef<HTMLElement | null>(null)
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [modelError, setModelError] = useState('')
  const modelSrc = `${import.meta.env.BASE_URL}models/xiangling.glb`

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    const handleLoad = () => setModelStatus('ready')
    const handleError = (event: Event) => {
      setModelStatus('error')
      const detail = (event as CustomEvent<{ type?: string }>).detail
      setModelError(detail?.type ?? 'unknown')
    }
    viewer.addEventListener('load', handleLoad)
    viewer.addEventListener('error', handleError)
    viewer.setAttribute('src', modelSrc)
    viewer.setAttribute('alt', '相灵古风三维数字人')
    viewer.setAttribute('loading', 'eager')
    viewer.setAttribute('reveal', 'auto')
    viewer.setAttribute('exposure', '1.05')

    return () => {
      viewer.removeEventListener('load', handleLoad)
      viewer.removeEventListener('error', handleError)
    }
  }, [modelSrc])

  return (
    <section
      className={`xiangling-agent xiangling-agent--${variant} agent-state-${state}`}
      aria-label={`相灵三维智能向导，${STATE_LABEL[state]}`}
    >
      <div className="agent-model-shell">
        <div className="agent-aura" />
        <model-viewer
          ref={viewerRef}
          className="agent-model-viewer"
          src={modelSrc}
          alt="相灵古风三维数字人"
          loading="eager"
          reveal="auto"
          camera-controls={variant === 'report'}
          camera-orbit="90deg 78deg 2.7m"
          min-camera-orbit="auto 62deg 2.15m"
          max-camera-orbit="auto 92deg 3.4m"
          field-of-view="26deg"
          shadow-intensity="1.15"
          shadow-softness="0.85"
          exposure="1.05"
          environment-image="neutral"
          interaction-prompt="none"
        />
        {modelStatus !== 'ready' && (
          <div className={`agent-model-status ${modelStatus}`}>
            {modelStatus === 'error' ? `模型加载失败 · ${modelError}` : '正在唤醒相灵…'}
          </div>
        )}
        <div className="agent-orbit-hint">拖动旋转 · 滚轮缩放</div>
      </div>

      <div className="agent-copy">
        <div className="agent-kicker">
          <span className="agent-live-dot" />
          相灵 · 三维智能向导
          <span className="agent-state-label">{STATE_LABEL[state]}</span>
        </div>
        <h3>{STATE_TITLE[state]}</h3>
        <p>{message}</p>
        {variant === 'report' && (
          <div className="agent-context-tags" aria-label="报告解读上下文">
            <span>空间指标</span>
            <span>传统格局</span>
            <span>报告证据</span>
          </div>
        )}
      </div>
    </section>
  )
}
