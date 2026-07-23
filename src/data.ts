export type Mode = 'rural' | 'urban'
export type Audience = 'tob' | 'toc'
export type Stage = 'locate' | 'select' | 'generate' | 'edit' | 'analyze' | 'explain'
export type Tool = 'select' | 'terrain' | 'place' | 'analyze' | 'compare'
export type LayerId = 'terrain' | 'slope' | 'sun' | 'flow' | 'view' | 'noise'

export type ScenarioRole = {
  id: string
  audience: Audience
  title: string
  subtitle: string
  description: string
  focus: string[]
  defaultQuery: string
  defaultAddress: string
  cta: string
}

export type Metric = {
  id: string
  name: string
  value: string
  status: string
  layer?: LayerId
}

export type FloatingMetric = Metric & {
  x: number
  y: number
  phase: 'computing' | 'ready' | 'settling'
}

export type SearchItem = {
  name: string
  address: string
  type: string
}

export type Plan = {
  id: string
  name: string
  tagline: string
  score: number
  cultureScore: number
  markerX: number
  markerY: number
  filter: string
}

export const RURAL_SEARCH: SearchItem[] = [
  { name: '余杭区 · 径山村', address: '浙江省杭州市余杭区径山镇', type: '村落' },
  { name: '西湖区 · 龙井村', address: '浙江省杭州市西湖区龙井路', type: '村落' },
  { name: '临安区 · 天目山麓', address: '浙江省杭州市临安区天目山', type: '宅基地' },
]

export const URBAN_SEARCH: SearchItem[] = [
  { name: '拱墅区 · 桂语江南', address: '浙江省杭州市拱墅区丽水路', type: '小区' },
  { name: '滨江区 · 江南之星', address: '浙江省杭州市滨江区江陵路', type: '小区' },
  { name: '萧山区 · 金茂悦', address: '浙江省杭州市萧山区市心北路', type: '小区' },
]

export const RURAL_METRICS: Metric[] = [
  { id: 'slope', name: '平均坡度', value: '7.2°', status: '适建', layer: 'slope' },
  { id: 'water', name: '距水系', value: '96 m', status: '合理', layer: 'flow' },
  { id: 'open', name: '前向开敞', value: '0.85', status: '良好', layer: 'view' },
  { id: 'sun', name: '冬季日照', value: '6.1 h', status: '充足', layer: 'sun' },
  { id: 'noise', name: '噪声代理', value: '低', status: '友好', layer: 'noise' },
]

export const URBAN_METRICS: Metric[] = [
  { id: 'sun', name: '楼层日照', value: '4.8 h', status: '充足', layer: 'sun' },
  { id: 'metro', name: '距地铁站', value: '320 m', status: '便捷' },
  { id: 'school', name: '距幼儿园', value: '210 m', status: '适宜' },
  { id: 'block', name: '楼间遮挡', value: '18%', status: '轻微', layer: 'view' },
  { id: 'noise', name: '临街噪声', value: '中', status: '关注', layer: 'noise' },
]

export const FLOAT_STARTS = [
  { x: 42, y: 40 },
  { x: 58, y: 48 },
  { x: 48, y: 58 },
  { x: 62, y: 36 },
  { x: 36, y: 50 },
]

export const LAYERS: Array<{ id: LayerId; label: string; icon: string }> = [
  { id: 'terrain', label: '地形', icon: '⌁' },
  { id: 'slope', label: '坡度', icon: '△' },
  { id: 'sun', label: '日照', icon: '☀' },
  { id: 'flow', label: '汇流', icon: '≋' },
  { id: 'view', label: '视域', icon: '◉' },
  { id: 'noise', label: '噪声', icon: '∿' },
]

export const RURAL_PLANS: Plan[] = [
  {
    id: 'current',
    name: '当前',
    tagline: '综合均衡',
    score: 91,
    cultureScore: 86,
    markerX: 50,
    markerY: 44,
    filter: 'none',
  },
  {
    id: 'alt1',
    name: '备选 1',
    tagline: '日照优先',
    score: 89,
    cultureScore: 82,
    markerX: 36,
    markerY: 56,
    filter: 'hue-rotate(-8deg) saturate(0.92)',
  },
  {
    id: 'alt2',
    name: '备选 2',
    tagline: '明堂优先',
    score: 84,
    cultureScore: 88,
    markerX: 64,
    markerY: 52,
    filter: 'sepia(0.14) saturate(0.9)',
  },
]

export const VERSION_LOG = [
  { id: 'v1', label: '初始选址', time: '05-20 10:15' },
  { id: 'v2', label: '调整朝向', time: '05-20 11:42' },
  { id: 'v3', label: '新增水系', time: '05-20 14:08' },
]

export const RURAL_RADAR_MODERN = [
  { label: '坡度', value: 0.86 },
  { label: '排水', value: 0.78 },
  { label: '通达', value: 0.81 },
  { label: '日照', value: 0.9 },
  { label: '开阔', value: 0.85 },
  { label: '噪声', value: 0.74 },
]

export const RURAL_RADAR_CULTURE = [
  { label: '背山', value: 0.88 },
  { label: '明堂', value: 0.84 },
  { label: '水系', value: 0.79 },
  { label: '坐向', value: 0.72 },
  { label: '围合', value: 0.8 },
]

export const URBAN_RADAR_MODERN = [
  { label: '日照', value: 0.82 },
  { label: '通勤', value: 0.9 },
  { label: '配套', value: 0.88 },
  { label: '噪声', value: 0.64 },
  { label: '通风', value: 0.76 },
  { label: '视野', value: 0.8 },
]

export const URBAN_RADAR_CULTURE = [
  { label: '坐向', value: 0.78 },
  { label: '明堂', value: 0.7 },
  { label: '围合', value: 0.85 },
  { label: '临水', value: 0.6 },
  { label: '靠实', value: 0.82 },
]

export type Building = {
  id: string
  name: string
  x: number
  y: number
  w: number
  d: number
  floors: number
}

export const BUILDINGS: Building[] = [
  { id: 'b1', name: '1 号楼', x: 1, y: 1, w: 3.4, d: 1.5, floors: 11 },
  { id: 'b2', name: '2 号楼', x: 5.4, y: 0.6, w: 3.4, d: 1.5, floors: 14 },
  { id: 'b3', name: '3 号楼', x: 9.8, y: 1.2, w: 3, d: 1.5, floors: 17 },
  { id: 'b4', name: '4 号楼', x: 1.4, y: 4.4, w: 3, d: 1.5, floors: 8 },
  { id: 'b5', name: '5 号楼', x: 5.8, y: 4.2, w: 3.4, d: 1.6, floors: 11 },
  { id: 'b6', name: '6 号楼', x: 10.2, y: 4.6, w: 3, d: 1.5, floors: 6 },
  { id: 'b7', name: '7 号楼', x: 2, y: 7.6, w: 3.2, d: 1.6, floors: 14 },
  { id: 'b8', name: '8 号楼', x: 6.4, y: 7.8, w: 3.2, d: 1.6, floors: 9 },
]

export type Facility = {
  id: string
  label: string
  x: number
  y: number
  kind: 'metro' | 'school' | 'hospital' | 'shop' | 'park' | 'road'
}

export const FACILITIES: Facility[] = [
  { id: 'metro', label: '地铁站', x: 14.6, y: 8.6, kind: 'metro' },
  { id: 'school', label: '幼儿园', x: 12.8, y: 2.6, kind: 'school' },
  { id: 'hospital', label: '社区医院', x: -1.4, y: 6.2, kind: 'hospital' },
  { id: 'shop', label: '商超', x: 13.4, y: 6.4, kind: 'shop' },
  { id: 'park', label: '中心绿地', x: 5, y: 6.3, kind: 'park' },
  { id: 'road', label: '主干道', x: 7, y: 11.2, kind: 'road' },
]

/** 城市场景入口：ToB / ToC 角色（演示用，可扩展） */
export const SCENARIO_ROLES: ScenarioRole[] = [
  {
    id: 'tob-merchant',
    audience: 'tob',
    title: '个体商户选址',
    subtitle: 'ToB · 商业选址',
    description: '评估人流、临街噪声、地铁可达与周边配套，辅助门店与铺位决策。',
    focus: ['客流代理', '临街可视', '通勤可达', '噪声风险'],
    defaultQuery: '拱墅区 · 桂语江南',
    defaultAddress: '浙江省杭州市拱墅区丽水路 · 商业周边',
    cta: '进入商户选址演示 →',
  },
  {
    id: 'tob-tourism',
    audience: 'tob',
    title: '旅游项目开发',
    subtitle: 'ToB · 文旅地块',
    description: '在城市三维影像中圈选文旅节点，比较日照、视域开阔度与配套辐射。',
    focus: ['视域开阔', '景观朝向', '配套辐射', '空间适配'],
    defaultQuery: '滨江区 · 江南之星',
    defaultAddress: '浙江省杭州市滨江区江陵路 · 文旅地块',
    cta: '进入文旅选址演示 →',
  },
  {
    id: 'tob-developer',
    audience: 'tob',
    title: '房地产项目开发',
    subtitle: 'ToB · 开发商',
    description: '面向开发与规划沟通：楼栋布局、楼层日照、遮挡与地块条件一镜讲解。',
    focus: ['楼栋日照', '楼间遮挡', '地块条件', '方案对比'],
    defaultQuery: '萧山区 · 金茂悦',
    defaultAddress: '浙江省杭州市萧山区市心北路 · 开发地块',
    cta: '进入开发商演示 →',
  },
  {
    id: 'toc-buyer',
    audience: 'toc',
    title: '个人购房选房',
    subtitle: 'ToC · 城市小区',
    description: '在真实三维影像中点选楼栋与楼层，快速看懂日照、通勤、学区与噪声。',
    focus: ['楼层日照', '地铁通勤', '学区配套', '临街噪声'],
    defaultQuery: '拱墅区 · 桂语江南',
    defaultAddress: '浙江省杭州市拱墅区丽水路 · 小区',
    cta: '进入购房选房演示 →',
  },
  {
    id: 'toc-renter',
    audience: 'toc',
    title: '租房 / 改善换房',
    subtitle: 'ToC · 居住决策',
    description: '比较同一小区不同楼栋楼层的安静度、采光与生活配套，辅助租住或换房。',
    focus: ['采光对比', '安静度', '生活配套', '通勤成本'],
    defaultQuery: '滨江区 · 江南之星',
    defaultAddress: '浙江省杭州市滨江区江陵路 · 小区',
    cta: '进入租住决策演示 →',
  },
  {
    id: 'toc-family',
    audience: 'toc',
    title: '家庭置业规划',
    subtitle: 'ToC · 家庭场景',
    description: '围绕学区、医疗、公园与日照，为家庭择房提供可解释的空间证据卡。',
    focus: ['学区距离', '医疗配套', '公园可达', '日照充足'],
    defaultQuery: '萧山区 · 金茂悦',
    defaultAddress: '浙江省杭州市萧山区市心北路 · 小区',
    cta: '进入家庭置业演示 →',
  },
]

