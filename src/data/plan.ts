import raw from "./plan-geometry.json"

export const SCALE = 0.052

type Pt = [number, number]

type RawPlot = {
  id: number
  areaSqft: number
  frontageFt: number
  polygon: Pt[]
}

type RawCommon = {
  id: string
  name: string
  nameGu: string
  areaSqft: number
  polygon: Pt[]
}

type RawRoad = {
  id: string
  label: string
  labelGu: string
  widthFt: number
  polygon: Pt[]
}

const data = raw as {
  plots: RawPlot[]
  commons: RawCommon[]
  roads: RawRoad[]
}

function boundsOf(polys: Pt[][]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const poly of polys) {
    for (const [x, y] of poly) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return { minX, minY, maxX, maxY }
}

const allPolys = [
  ...data.plots.map((p) => p.polygon),
  ...data.commons.map((c) => c.polygon),
  ...data.roads.map((r) => r.polygon),
]
const bounds = boundsOf(allPolys)
export const ORIGIN = {
  x: (bounds.minX + bounds.maxX) / 2,
  y: (bounds.minY + bounds.maxY) / 2,
}

export function worldX(feetX: number) {
  return (feetX - ORIGIN.x) * SCALE
}
export function worldZ(feetY: number) {
  return (feetY - ORIGIN.y) * SCALE
}

function toWorld(polygon: Pt[]) {
  return polygon.map(([x, y]) => [worldX(x), worldZ(y)] as Pt)
}

function centroid(polygon: Pt[]) {
  let x = 0
  let y = 0
  for (const [px, py] of polygon) {
    x += px
    y += py
  }
  return [x / polygon.length, y / polygon.length] as Pt
}

export type SectionId = "west" | "central" | "east"

export function sectionOf(id: number): SectionId {
  if (id <= 27) return "west"
  if (id >= 79) return "east"
  return "central"
}

export type Plot = RawPlot & {
  section: SectionId
  wx: number
  wz: number
  world: Pt[]
}

export const PLOTS: Plot[] = data.plots
  .map((plot) => {
    const [cx, cy] = centroid(plot.polygon)
    return {
      ...plot,
      section: sectionOf(plot.id),
      wx: worldX(cx),
      wz: worldZ(cy),
      world: toWorld(plot.polygon),
    }
  })
  .sort((a, b) => a.id - b.id)

export const PLOT_BY_ID = new Map(PLOTS.map((plot) => [plot.id, plot]))

export const COMMONS = data.commons.map((area) => {
  const [cx, cy] = centroid(area.polygon)
  return { ...area, wx: worldX(cx), wz: worldZ(cy), world: toWorld(area.polygon) }
})

export const ROADS = data.roads.map((road) => ({
  ...road,
  world: toWorld(road.polygon),
}))

function cross(o: Pt, a: Pt, b: Pt) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

export function siteHull(): Pt[] {
  const pts = allPolys.flat().map(([x, y]) => [worldX(x), worldZ(y)] as Pt)
  const uniq = new Map<string, Pt>()
  for (const p of pts) uniq.set(`${p[0].toFixed(2)},${p[1].toFixed(2)}`, p)
  const sorted = [...uniq.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  const lower: Pt[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

export const AREA_MIN = Math.min(...PLOTS.map((p) => p.areaSqft))
export const AREA_MAX = Math.max(...PLOTS.map((p) => p.areaSqft))
