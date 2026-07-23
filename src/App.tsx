import { useEffect, useMemo, useRef, useState } from 'react'
import logo from './assets/logo.png'
import urbanRealScene from './assets/urban-real-3d-case.png'
import ReportModal from './ReportModal'
import SceneOverlays from './SceneOverlays'
import type { Audience, FloatingMetric, LayerId, ScenarioRole, Stage, Tool } from './data'
import {
  BUILDINGS,
  FLOAT_STARTS,
  LAYERS,
  SCENARIO_ROLES,
  URBAN_METRICS,
  URBAN_SEARCH,
} from './data'
import './App.css'

type Screen = 'boot' | 'mode' | 'work'

const URBAN_HOTSPOTS = [
  { id: 'b1', x: 27, y: 54 },
  { id: 'b2', x: 43, y: 39 },
  { id: 'b3', x: 56, y: 37 },
  { id: 'b4', x: 65, y: 59 },
  { id: 'b5', x: 77, y: 51 },
  { id: 'b6', x: 49, y: 58 },
]

function App() {
  const [screen, setScreen] = useState<Screen>('boot')
  const [audienceTab, setAudienceTab] = useState<Audience>('tob')
  const [scenario, setScenario] = useState<ScenarioRole>(SCENARIO_ROLES[0])
  const [stage, setStage] = useState<Stage>('locate')
  const [tool, setTool] = useState<Tool>('select')
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [location, setLocation] = useState('浙江 · 杭州')
  const [sceneReady, setSceneReady] = useState(false)
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [floor, setFloor] = useState(9)
  const [hour, setHour] = useState(15)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [statusText, setStatusText] = useState('等待定位')
  const [statusMeta, setStatusMeta] = useState('模拟案例 · 城市倾斜摄影 LOD 15')
  const [progress, setProgress] = useState(0)
  const [floating, setFloating] = useState<FloatingMetric[]>([])
  const [settled, setSettled] = useState<string[]>([])
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(['terrain'])
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReady, setReportReady] = useState(false)
  const timers = useRef<number[]>([])

  const metrics = URBAN_METRICS
  const searchPool = URBAN_SEARCH
  const building = BUILDINGS.find((b) => b.id === buildingId) ?? null
  const modernScore = 88
  const cultureScore = 76
  const visibleRoles = SCENARIO_ROLES.filter((role) => role.audience === audienceTab)

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }

  const schedule = (fn: () => void, delay: number) => {
    timers.current.push(window.setTimeout(fn, delay))
  }

  useEffect(() => {
    const id = window.setTimeout(() => setScreen('mode'), 1500)
    return () => {
      window.clearTimeout(id)
      clearTimers()
    }
  }, [])

  const startScenario = (role: ScenarioRole) => {
    clearTimers()
    setScenario(role)
    setScreen('work')
    setStage('locate')
    setTool('select')
    setQuery('')
    setShowSearch(false)
    setSceneReady(false)
    setBuildingId(null)
    setFloor(9)
    setFloating([])
    setSettled([])
    setReportReady(false)
    setReportOpen(false)
    setProgress(0)
    setActiveLayers(['terrain'])
    setLocation('浙江 · 杭州')
    setStatusText('等待定位')
    setStatusMeta(`${role.subtitle} · 模拟 3D Tiles 就绪`)
  }

  const backToScenes = () => {
    clearTimers()
    setScreen('mode')
    setSceneReady(false)
    setReportOpen(false)
    setReportReady(false)
    setFloating([])
    setSettled([])
    setBuildingId(null)
    setProgress(0)
  }

  const unlocked = useMemo(() => {
    const generated = ['edit', 'analyze', 'explain'].includes(stage)
    return {
      select: true,
      terrain: generated,
      place: generated,
      analyze: generated,
      compare: false,
    } as Record<Tool, boolean>
  }, [stage])

  const sceneHint = useMemo(() => {
    if (stage === 'locate') return `${scenario.title}：搜索城市地点，加载真实三维影像`
    if (stage === 'select') return '在倾斜摄影场景中点选楼栋并选择楼层'
    if (stage === 'edit') return '楼栋已锁定，调整楼层后开始分析'
    if (stage === 'analyze') return '指标正在从场地飘起计算'
    return '结果已就绪，可生成分析报告'
  }, [stage, scenario.title])

  const runAnalysis = () => {
    clearTimers()
    setStage('analyze')
    setTool('analyze')
    setReportReady(false)
    setSettled([])
    setStatusText('实时计算中')
    setStatusMeta(scenario.focus.slice(0, 3).join(' · '))
    setProgress(12)

    setFloating(
      metrics.map((metric, index) => ({
        ...metric,
        x: FLOAT_STARTS[index].x,
        y: FLOAT_STARTS[index].y,
        phase: 'computing' as const,
      })),
    )

    metrics.forEach((metric, index) => {
      schedule(() => {
        setFloating((prev) =>
          prev.map((item) => (item.id === metric.id ? { ...item, phase: 'ready' } : item)),
        )
        setProgress(20 + index * 14)
      }, 300 + index * 230)
    })

    schedule(() => {
      setFloating((prev) =>
        prev.map((item, index) => ({
          ...item,
          phase: 'settling',
          x: 87,
          y: 26 + index * 9,
        })),
      )
      setStatusText('结果飞入图层栏')
    }, 1600)

    schedule(() => {
      setFloating([])
      setSettled(metrics.map((item) => item.id))
      setStage('explain')
      setReportReady(true)
      setProgress(100)
      setStatusText('已完成')
      setStatusMeta('更新时间 · 刚刚')
      setActiveLayers((prev) =>
        prev.includes('sun') ? prev : ([...prev, 'sun'].slice(-3) as LayerId[]),
      )
    }, 2400)
  }

  const handleSearchSelect = (name: string, address: string) => {
    setQuery(name)
    setShowSearch(false)
    setLocation(`浙江 · 杭州 · ${name.split(' · ')[0]}`)
    setStage('select')
    setTool('select')
    setStatusText('已定位')
    setStatusMeta(address)
    setSceneReady(true)
  }

  const handleBuildingSelect = (id: string) => {
    if (stage === 'locate') return
    setBuildingId(id)
    const target = BUILDINGS.find((b) => b.id === id)
    if (target) {
      setFloor(Math.min(Math.max(1, Math.ceil(target.floors / 2)), target.floors))
      setStage('edit')
      setTool('place')
      setStatusText('楼栋已选定')
      setStatusMeta(`${target.name} · 共 ${target.floors} 层 · ${scenario.title}`)
    }
  }

  const toggleLayer = (id: LayerId) => {
    setActiveLayers((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      const next = [...prev, id]
      if (next.length > 3) next.shift()
      return next
    })
  }

  const applySuggestion = () => {
    setReportOpen(false)
    runAnalysis()
  }

  if (screen === 'boot') {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <img className="boot-logo" src={logo} alt="相地 XIANGDI" />
          <p>可解释的风水地理数字沙盘</p>
        </div>
      </div>
    )
  }

  if (screen === 'mode') {
    return (
      <div className="mode-screen city-only">
        <img className="mode-logo" src={logo} alt="相地 XIANGDI" />
        <p className="mode-eyebrow">城市三维选址 · 真实影像模拟案例</p>
        <h1 className="mode-title">选择你的角色与场景</h1>
        <p className="mode-sub">先选 ToB / ToC，再进入对应城市效果页验证交互与动态美感</p>

        <div className="audience-tabs" role="tablist" aria-label="客户类型">
          <button
            type="button"
            role="tab"
            aria-selected={audienceTab === 'tob'}
            className={audienceTab === 'tob' ? 'active' : ''}
            onClick={() => setAudienceTab('tob')}
          >
            <strong>ToB 企业 / 项目</strong>
            <span>商户 · 文旅 · 开发商</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={audienceTab === 'toc'}
            className={audienceTab === 'toc' ? 'active' : ''}
            onClick={() => setAudienceTab('toc')}
          >
            <strong>ToC 个人用户</strong>
            <span>购房 · 租住 · 家庭置业</span>
          </button>
        </div>

        <div className="role-grid">
          {visibleRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              className="role-card"
              onClick={() => startScenario(role)}
            >
              <div
                className="role-card-cover"
                style={{ backgroundImage: `url(${urbanRealScene})` }}
              >
                <span className="case-badge">{role.subtitle}</span>
              </div>
              <div className="role-card-body">
                <h2>{role.title}</h2>
                <p>{role.description}</p>
                <div className="role-tags">
                  {role.focus.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <span className="mode-cta">{role.cta}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="workbench urban">
      <div className="scene" aria-label="三维沙盘场景">
        <div className={`urban-stage ${sceneReady ? 'ready' : ''}`}>
          {sceneReady ? (
            <>
              <div
                className="urban-real-scene"
                style={{ backgroundImage: `url(${urbanRealScene})` }}
              />
              <div className="urban-building-hotspots">
                {URBAN_HOTSPOTS.map((hotspot) => {
                  const target = BUILDINGS.find((item) => item.id === hotspot.id)
                  const selected = hotspot.id === buildingId
                  return (
                    <button
                      key={hotspot.id}
                      type="button"
                      className={`building-hotspot ${selected ? 'selected' : ''}`}
                      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                      onClick={() => handleBuildingSelect(hotspot.id)}
                      aria-label={`选择${target?.name ?? '楼栋'}`}
                    >
                      <span className="hotspot-ring" />
                      <span className="hotspot-label">
                        {selected
                          ? `${target?.name ?? '楼栋'} · ${floor} 层`
                          : target?.name ?? '楼栋'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="urban-empty">搜索小区后加载倾斜摄影场景</div>
          )}
        </div>

        <SceneOverlays mode="urban" activeLayers={activeLayers} hour={hour} />
        <div className="scene-hint">{sceneHint}</div>
        <div className="data-source-chip">
          <span className="live-dot" />
          SIMULATED 3D TILES · LOD 15 · OBLIQUE IMAGERY · {scenario.audience.toUpperCase()}
        </div>

        <div className="floating-metrics">
          {floating.map((item) => (
            <div
              key={item.id}
              className={`metric-capsule ${item.phase === 'settling' ? 'settling' : ''}`}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <span className="label">{item.name}</span>
              <div className="value">
                {item.phase === 'computing' ? '计算中…' : item.value}
                {item.phase !== 'computing' && <span className="tag">{item.status}</span>}
              </div>
              {item.phase === 'computing' && (
                <div className="progress">
                  <span />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <header className="topbar glass">
        <div className="brand">
          <img className="brand-logo" src={logo} alt="相地 XIANGDI" />
          <div className="persona-chip">
            <span className="persona-audience">{scenario.audience === 'tob' ? 'ToB' : 'ToC'}</span>
            <span className="persona-title">{scenario.title}</span>
          </div>
          <button type="button" className="ghost-btn scene-switch" onClick={backToScenes}>
            切换场景
          </button>
        </div>

        <div className="search-wrap">
          <input
            value={query}
            placeholder="搜索小区 / 楼盘 / 城市地块"
            onChange={(event) => {
              setQuery(event.target.value)
              setShowSearch(true)
            }}
            onFocus={() => setShowSearch(true)}
          />
          {showSearch && (
            <div className="search-dropdown">
              {searchPool
                .filter((item) => !query || item.name.includes(query) || item.address.includes(query))
                .map((item) => (
                  <button
                    key={item.name}
                    className="search-item"
                    type="button"
                    onClick={() => handleSearchSelect(item.name, `${item.address} · ${item.type}`)}
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {item.address} · {item.type}
                    </span>
                  </button>
                ))}
              <button
                type="button"
                className="search-item"
                onClick={() =>
                  handleSearchSelect(scenario.defaultQuery, scenario.defaultAddress)
                }
              >
                <strong>推荐案例 · {scenario.defaultQuery}</strong>
                <span>{scenario.defaultAddress}</span>
              </button>
            </div>
          )}
        </div>

        <div className="location-pill">◈ {location}</div>
      </header>

      <nav className="left-rail glass" aria-label="主要工具">
        {(
          [
            ['select', '◌', '框选'],
            ['terrain', '⌁', '地形'],
            ['place', '◇', '放置'],
            ['analyze', '▥', '分析'],
            ['compare', '◫', '对比'],
          ] as Array<[Tool, string, string]>
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            className={`tool-btn ${tool === id ? 'active' : ''}`}
            disabled={!unlocked[id]}
            onClick={() => {
              setTool(id)
              if (id === 'analyze') runAnalysis()
            }}
          >
            <span className="icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <aside className="right-panel glass">
        <div className="insight-card">
          <div className="panel-title">
            <h2>◔ AI 相地洞察</h2>
            <span className="badge">{reportReady ? '已更新' : '待计算'}</span>
          </div>
          <div className="insight-scores">
            <div className="insight-main">
              <span className="num">{reportReady ? modernScore : '—'}</span>
              <span className="denom">/100</span>
            </div>
            <div className="insight-side">
              <span className="glyph">{reportReady ? (cultureScore >= 80 ? '吉' : '平') : '…'}</span>
              <span className="cap">传统格局 {reportReady ? cultureScore : '—'}</span>
            </div>
          </div>
          <div className="insight-note">{scenario.subtitle} · 关注 {scenario.focus[0]}</div>
        </div>

        <div className="panel-title">
          <h2>指标结果</h2>
          <span className="badge">{reportReady ? '已落位' : '等待飞入'}</span>
        </div>
        <div className="metric-list">
          {metrics.map((metric) => {
            const ready = settled.includes(metric.id)
            return (
              <button
                key={metric.id}
                type="button"
                className={`metric-card ${ready ? 'ready' : ''}`}
                disabled={!ready}
                onClick={() => metric.layer && toggleLayer(metric.layer)}
              >
                <span className="name">{metric.name}</span>
                <span className="status">{ready ? metric.status : '—'}</span>
                <span className="value">{ready ? metric.value : '·  ·  ·'}</span>
              </button>
            )
          })}
        </div>

        <div className="panel-title">
          <h2>◈ 分析图层</h2>
          <span className="badge">最多 2–3 层</span>
        </div>
        <div className="layer-list">
          {LAYERS.map((layer) => {
            const on = activeLayers.includes(layer.id)
            return (
              <div key={layer.id} className={`layer-item ${on ? 'on' : ''}`}>
                <button type="button" onClick={() => toggleLayer(layer.id)}>
                  <span className="icon">{layer.icon}</span>
                  {layer.label}
                </button>
                <button
                  type="button"
                  className={`toggle ${on ? 'on' : ''}`}
                  aria-label={`切换${layer.label}`}
                  onClick={() => toggleLayer(layer.id)}
                />
              </div>
            )
          })}
        </div>

        {building && (
          <>
            <div className="panel-title">
              <h2>◳ 所选房源</h2>
            </div>
            <div className="unit-card">
              <strong>
                {building.name} · {floor} 层
              </strong>
              <p>
                共 {building.floors} 层 · {scenario.title} · 南偏东 12°
              </p>
            </div>
          </>
        )}

        <button
          type="button"
          className="primary-btn"
          disabled={!reportReady}
          onClick={() => setReportOpen(true)}
        >
          {reportReady ? '生成分析报告' : '等待指标落位'}
        </button>
      </aside>

      <div className="status-chip glass">
        <div className="title">实时计算状态</div>
        <div className="row">
          <span className={`status-word ${progress === 100 ? 'done' : ''}`}>{statusText}</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-line">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="meta">{statusMeta}</div>
      </div>

      {building && (
        <div className="floor-picker glass">
          <span className="fp-label">{building.name} 楼层</span>
          <input
            type="range"
            min={1}
            max={building.floors}
            value={floor}
            onChange={(event) => setFloor(Number(event.target.value))}
          />
          <span className="fp-value">
            {floor} / {building.floors} 层
          </span>
          {stage === 'edit' && (
            <button type="button" className="ghost-btn" onClick={runAnalysis}>
              开始分析
            </button>
          )}
        </div>
      )}

      <div className="bottom-bar glass">
        <button type="button" className="icon-btn">
          ✋
        </button>
        <button type="button" className="icon-btn">
          ⌖
        </button>
        <div className="seg">
          <button
            type="button"
            className={viewMode === '2d' ? 'active' : ''}
            onClick={() => setViewMode('2d')}
          >
            2D
          </button>
          <button
            type="button"
            className={viewMode === '3d' ? 'active' : ''}
            onClick={() => setViewMode('3d')}
          >
            3D
          </button>
        </div>
        <div className="time-slider">
          <span>日照</span>
          <input
            type="range"
            min={6}
            max={18}
            value={hour}
            onChange={(event) => setHour(Number(event.target.value))}
          />
          <span>{hour}:00</span>
        </div>
      </div>

      <div className="corner-actions">
        <button type="button" className="icon-btn glass-btn">
          ↺
        </button>
        <button type="button" className="icon-btn glass-btn">
          ↻
        </button>
      </div>

      {reportOpen && (
        <ReportModal
          mode="urban"
          location={location}
          planName={
            building
              ? `${scenario.title} · ${building.name} ${floor} 层`
              : `${scenario.title} · 未选定`
          }
          modernScore={modernScore}
          cultureScore={cultureScore}
          onClose={() => setReportOpen(false)}
          onApply={applySuggestion}
        />
      )}
    </div>
  )
}

export default App
