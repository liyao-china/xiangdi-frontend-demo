import { BUILDINGS, FACILITIES } from './data'
import type { Building } from './data'

const UX = 34
const UY = 17
const FLOOR_H = 9
const ORIGIN_X = 500
const ORIGIN_Y = 150

function proj(x: number, y: number, z = 0) {
  return {
    x: ORIGIN_X + (x - y) * UX,
    y: ORIGIN_Y + (x + y) * UY - z,
  }
}

function poly(points: Array<{ x: number; y: number }>) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function BuildingShape({
  b,
  selected,
  dimmed,
  floor,
  onSelect,
}: {
  b: Building
  selected: boolean
  dimmed: boolean
  floor: number
  onSelect: (id: string) => void
}) {
  const h = b.floors * FLOOR_H
  const p10 = proj(b.x + b.w, b.y)
  const p11 = proj(b.x + b.w, b.y + b.d)
  const p01 = proj(b.x, b.y + b.d)
  const t00 = proj(b.x, b.y, h)
  const t10 = proj(b.x + b.w, b.y, h)
  const t11 = proj(b.x + b.w, b.y + b.d, h)
  const t01 = proj(b.x, b.y + b.d, h)

  const stroke = selected ? '#b08d4f' : 'rgba(58,54,46,0.22)'
  const strokeWidth = selected ? 2 : 1
  const opacity = dimmed ? 0.45 : 1

  const floorLines = []
  for (let k = 1; k < b.floors; k++) {
    const z = k * FLOOR_H
    const a = proj(b.x, b.y + b.d, z)
    const c = proj(b.x + b.w, b.y + b.d, z)
    const r = proj(b.x + b.w, b.y, z)
    floorLines.push(
      <polyline
        key={k}
        points={`${a.x},${a.y} ${c.x},${c.y} ${r.x},${r.y}`}
        fill="none"
        stroke="rgba(58,54,46,0.1)"
        strokeWidth="1"
      />,
    )
  }

  let floorBand = null
  if (selected && floor >= 1 && floor <= b.floors) {
    const z0 = (floor - 1) * FLOOR_H
    const z1 = floor * FLOOR_H
    const f00 = proj(b.x, b.y + b.d, z0)
    const f10 = proj(b.x + b.w, b.y + b.d, z0)
    const f01 = proj(b.x, b.y + b.d, z1)
    const f11 = proj(b.x + b.w, b.y + b.d, z1)
    const s10 = proj(b.x + b.w, b.y, z0)
    const s11 = proj(b.x + b.w, b.y, z1)
    floorBand = (
      <g>
        <polygon
          points={poly([f00, f10, f11, f01])}
          fill="rgba(176,141,79,0.5)"
          stroke="#b08d4f"
          strokeWidth="1"
        />
        <polygon
          points={poly([f10, s10, s11, f11])}
          fill="rgba(176,141,79,0.34)"
          stroke="#b08d4f"
          strokeWidth="1"
        />
      </g>
    )
  }

  return (
    <g
      opacity={opacity}
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(b.id)}
    >
      <polygon points={poly([p01, p11, t11, t01])} fill="#efece4" stroke={stroke} strokeWidth={strokeWidth} />
      <polygon points={poly([p11, p10, t10, t11])} fill="#dcd7cb" stroke={stroke} strokeWidth={strokeWidth} />
      <polygon points={poly([t00, t10, t11, t01])} fill="#f9f7f1" stroke={stroke} strokeWidth={strokeWidth} />
      {floorLines}
      {floorBand}
      {selected && (
        <text
          x={t11.x}
          y={t00.y - 14}
          textAnchor="middle"
          fontSize="13"
          fill="#b08d4f"
          fontWeight="600"
        >
          {b.name} · {floor} 层
        </text>
      )}
    </g>
  )
}

const FACILITY_COLOR: Record<string, string> = {
  metro: '#5f8fa8',
  school: '#b08d4f',
  hospital: '#c4886b',
  shop: '#8c7b62',
  park: '#7f9174',
  road: '#a89b88',
}

export default function UrbanScene({
  selectedId,
  floor,
  selectable,
  onSelect,
}: {
  selectedId: string | null
  floor: number
  selectable: boolean
  onSelect: (id: string) => void
}) {
  const g0 = proj(-3, -2)
  const g1 = proj(16.5, -2)
  const g2 = proj(16.5, 12.5)
  const g3 = proj(-3, 12.5)
  const slab = 26

  const sorted = [...BUILDINGS].sort((a, b) => a.x + a.y + a.w + a.d - (b.x + b.y + b.w + b.d))

  return (
    <svg className="urban-svg" viewBox="0 0 1000 640" role="img" aria-label="城市小区白膜沙盘">
      {/* 地块基座 */}
      <polygon
        points={poly([g1, g2, { x: g2.x, y: g2.y + slab }, { x: g1.x, y: g1.y + slab }])}
        fill="#cfc8b8"
      />
      <polygon
        points={poly([g2, g3, { x: g3.x, y: g3.y + slab }, { x: g2.x, y: g2.y + slab }])}
        fill="#bfb7a4"
      />
      <polygon points={poly([g0, g1, g2, g3])} fill="#eceadf" stroke="rgba(58,54,46,0.14)" />

      {/* 内部道路 */}
      <polygon
        points={poly([proj(-3, 3.2), proj(16.5, 3.2), proj(16.5, 3.9), proj(-3, 3.9)])}
        fill="#e2ded2"
      />
      <polygon
        points={poly([proj(-3, 6.8), proj(16.5, 6.8), proj(16.5, 7.5), proj(-3, 7.5)])}
        fill="#e2ded2"
      />
      <polygon
        points={poly([proj(4.4, -2), proj(5, -2), proj(5, 12.5), proj(4.4, 12.5)])}
        fill="#e2ded2"
      />
      <polygon
        points={poly([proj(8.9, -2), proj(9.5, -2), proj(9.5, 12.5), proj(8.9, 12.5)])}
        fill="#e2ded2"
      />

      {/* 主干道（噪声来源） */}
      <polygon
        points={poly([proj(-3, 10.4), proj(16.5, 10.4), proj(16.5, 11.6), proj(-3, 11.6)])}
        fill="#d8d2c2"
      />

      {/* 中心绿地 */}
      <ellipse
        cx={proj(5, 6.15).x}
        cy={proj(5, 6.15).y}
        rx="66"
        ry="30"
        fill="rgba(155,168,141,0.5)"
      />

      {sorted.map((b) => (
        <BuildingShape
          key={b.id}
          b={b}
          selected={selectedId === b.id}
          dimmed={Boolean(selectable && selectedId && selectedId !== b.id)}
          floor={floor}
          onSelect={onSelect}
        />
      ))}

      {FACILITIES.map((f) => {
        const p = proj(f.x, f.y)
        return (
          <g key={f.id}>
            <circle cx={p.x} cy={p.y} r="6" fill={FACILITY_COLOR[f.kind]} opacity="0.9" />
            <circle cx={p.x} cy={p.y} r="10" fill="none" stroke={FACILITY_COLOR[f.kind]} opacity="0.35" />
            <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize="12" fill="#6f6452">
              {f.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
