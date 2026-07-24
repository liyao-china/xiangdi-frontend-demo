import type { Mode } from './data'
import AgentConsole from './AgentConsole'
import XianglingAgent from './XianglingAgent'
import type { AgentController } from './agent/types'
import {
  RURAL_RADAR_CULTURE,
  RURAL_RADAR_MODERN,
  URBAN_RADAR_CULTURE,
  URBAN_RADAR_MODERN,
} from './data'

function radarPoints(values: number[], size: number, max = 1) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.36
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length
      const r = radius * (value / max)
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`
    })
    .join(' ')
}

function RadarChart({
  title,
  data,
}: {
  title: string
  data: Array<{ label: string; value: number }>
}) {
  const size = 190
  const cx = size / 2
  const cy = size / 2
  const rings = [0.33, 0.66, 1]
  const labels = data.map((d) => d.label)
  const values = data.map((d) => d.value)

  return (
    <div className="radar-block">
      <h4>{title}</h4>
      <svg className="radar-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
        {rings.map((ring) => (
          <polygon
            key={ring}
            fill="none"
            stroke="rgba(58,54,46,0.12)"
            strokeWidth="1"
            points={radarPoints(Array(values.length).fill(ring), size)}
          />
        ))}
        {labels.map((label, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / labels.length
          return (
            <g key={label}>
              <line
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(angle) * size * 0.36}
                y2={cy + Math.sin(angle) * size * 0.36}
                stroke="rgba(58,54,46,0.1)"
              />
              <text
                x={cx + Math.cos(angle) * size * 0.45}
                y={cy + Math.sin(angle) * size * 0.45}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#8c7b62"
              >
                {label}
              </text>
            </g>
          )
        })}
        <polygon
          points={radarPoints(values, size)}
          fill="rgba(176,141,79,0.22)"
          stroke="#b08d4f"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  )
}

type ReportContent = {
  summary: string
  evidence: Array<{ id: string; text: string }>
  suggestions: string[]
}

const RURAL_REPORT: ReportContent = {
  summary:
    '当前布局整体适配度较高，前场开阔、坡度温和；主要优化点是将建筑顺时针旋转约 15°，并避开南侧汇流线。',
  evidence: [
    { id: 'slope', text: '建筑足迹平均坡度 7.2°，最大约 14°，处于原型建议阈值内。' },
    { id: 'front_open', text: '前向开阔率 0.85，传统「明堂」代理表现较好。' },
    { id: 'flow_acc', text: '建筑南侧汇流累积位于 AOI 前 21%，雨季应核验排水。' },
  ],
  suggestions: [
    '顺时针旋转 15°，提升冬季日照与开阔方向一致性。',
    '建筑向北移动 18 m，避开汇流线并保持距水安全裕度。',
  ],
}

const URBAN_REPORT: ReportContent = {
  summary:
    '所选楼栋与楼层综合表现良好，通勤与配套优势明显；主要关注点是临主干道一侧的噪声与低楼层冬季遮挡。',
  evidence: [
    { id: 'sun_hours', text: '所选楼层冬至日照约 4.8 h，满足参考日照需求。' },
    { id: 'dist_metro', text: '距地铁站约 320 m，步行约 5 分钟，通勤便捷。' },
    { id: 'noise_proxy', text: '南侧临主干道，噪声代理为中等，建议关注临街面。' },
  ],
  suggestions: [
    '优先选择 10 层以上单元，减少前排楼栋冬季遮挡。',
    '卧室布局避开临主干道一侧，或选用降噪窗提升安静度。',
  ],
}

export default function ReportModal({
  mode,
  location,
  planName,
  modernScore,
  cultureScore,
  agent,
  highlightedEvidence,
  onClose,
  onApply,
}: {
  mode: Mode
  location: string
  planName: string
  modernScore: number
  cultureScore: number
  agent: AgentController
  highlightedEvidence: string | null
  onClose: () => void
  onApply: () => void
}) {
  const content = mode === 'rural' ? RURAL_REPORT : URBAN_REPORT
  const modern = mode === 'rural' ? RURAL_RADAR_MODERN : URBAN_RADAR_MODERN
  const culture = mode === 'rural' ? RURAL_RADAR_CULTURE : URBAN_RADAR_CULTURE

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-label="相地分析报告"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="report-header">
          <div>
            <h2>相地分析报告</h2>
            <p>
              {location} · {planName} · 数据版本 demo-20260723 · 来源 template · 更新于刚刚
            </p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            关闭
          </button>
        </div>

        <XianglingAgent
          variant="report"
          state={agent.state}
          message={
            [...agent.messages].reverse().find((message) => message.role === 'assistant')
              ?.text ||
            '我已读取当前地块、所选楼层和双轨评分。下面将从关键证据出发，说明结论与可执行建议。'
          }
        />

        <AgentConsole agent={agent} variant="report" />

        <div className="report-grid">
          <div className="score-card">
            <div className="panel-title">
              <h2>双轨评分</h2>
              <span className="badge">不合成吉凶分</span>
            </div>
            <div className="score-pair">
              <div className="score-box">
                <div className="label">空间适配度</div>
                <div className="num">
                  {modernScore}
                  <span>/100</span>
                </div>
                <p className="report-note">置信度 high · 现代地理指标</p>
              </div>
              <div className="score-box">
                <div className="label">传统格局（文化代理）</div>
                <div className="num">
                  {cultureScore}
                  <span>/100</span>
                </div>
                <p className="report-note">置信度 medium · 几何代理</p>
              </div>
            </div>
            <p className="report-note" style={{ marginTop: 14 }}>
              {content.summary}
            </p>
          </div>

          <div className="radar-card">
            <div className="panel-title">
              <h2>双轨雷达图</h2>
              <span className="badge">独立坐标系</span>
            </div>
            <div className="radar-wrap">
              <RadarChart title="现代空间" data={modern} />
              <RadarChart title="传统格局" data={culture} />
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="panel-title">
            <h2>三条证据</h2>
          </div>
          <div className="evidence-list">
            {content.evidence.map((item, index) => (
              <div
                className={`evidence-item ${
                  highlightedEvidence === item.id ? 'highlighted' : ''
                }`}
                key={item.id}
              >
                <strong>
                  证据 {index + 1} · {item.id}
                </strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card" style={{ marginTop: 12 }}>
          <div className="panel-title">
            <h2>两条建议</h2>
          </div>
          <div className="suggestion-list">
            {content.suggestions.map((text, index) => (
              <div className="suggestion-item" key={text}>
                <div>
                  <strong>建议 {index + 1}</strong>
                  <p>{text}</p>
                </div>
                <button type="button" className="ghost-btn" onClick={onApply}>
                  应用视角
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="risk-bar">
          风险声明：结果基于 DSM、OSM 与启发式参数，仅用于规划沟通与文化体验，不替代专业勘察、地勘、审批或灾害评估。
        </div>
      </div>
    </div>
  )
}
