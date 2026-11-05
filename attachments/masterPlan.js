// Approximate 3D layout derived from the official brochure master plan.
// Geometry is illustrative — confirm exact dimensions with the project team.

export const STATUS_META = {
  available: {
    label: 'Available',
    labelGu: 'ઉપલબ્ધ',
    color: '#f4f0e6',
    note: 'Open for enquiry.',
    noteGu: 'પૂછપરછ માટે ખુલ્લું.',
  },
  reserved: {
    label: 'Reserved',
    labelGu: 'અનામત',
    color: '#d4a84b',
    note: 'Currently held.',
    noteGu: 'હાલમાં અનામત.',
  },
  sold: {
    label: 'Sold',
    labelGu: 'વેચાયેલ',
    color: '#6b7280',
    note: 'Already sold.',
    noteGu: 'પહેલેથી વેચાયેલ.',
  },
}

function pad(n) {
  return String(n).padStart(3, '0')
}

function buildRow({ section, sectionGu, firstNumber, count, firstX, step, z, width, depth, areaAt, statusAt }) {
  return Array.from({ length: count }, (_, i) => {
    const num = firstNumber + i
    return {
      id: pad(num),
      number: num,
      section,
      sectionGu,
      status: statusAt ? statusAt(i + 1) : 'available',
      x: firstX + i * step,
      z,
      width,
      depth,
      areaSqft: areaAt ? areaAt(i + 1) : Math.round(width * depth * 95),
    }
  })
}

// Layout roughly mirrors brochure:
// - Left: 40 ft crossover road
// - Horizontal 25 ft roads
// - Centre vertical 25 ft road
// - Common Plot-2 (5990) upper band
// - Common Plot (7658) east block
// - Dense south row

export const PLOTS = [
  // Top-left cluster (west of common-2)
  ...buildRow({
    section: 'North-West',
    sectionGu: 'ઉત્તર-પશ્ચિમ',
    firstNumber: 1,
    count: 7,
    firstX: -18.5,
    step: 1.55,
    z: -7.2,
    width: 1.35,
    depth: 3.6,
    areaAt: (p) => [1109, 871, 777, 1206, 1019, 865, 815][p - 1] || 900,
    statusAt: (p) => (p === 3 ? 'sold' : p === 5 ? 'reserved' : 'available'),
  }),

  // Top band east of common-2 (tapering north edge)
  ...buildRow({
    section: 'North',
    sectionGu: 'ઉત્તર',
    firstNumber: 8,
    count: 18,
    firstX: -4.5,
    step: 1.45,
    z: -7.0,
    width: 1.25,
    depth: 3.4,
    areaAt: (p) => {
      const sizes = [1936, 1433, 1377, 702, 655, 642, 529, 515, 503, 577, 564, 551, 537, 523, 516, 485, 468, 424]
      return sizes[p - 1] || 500
    },
    statusAt: (p) => (p % 6 === 0 ? 'sold' : p % 8 === 0 ? 'reserved' : 'available'),
  }),

  // Middle-west block (between roads, west of centre road)
  ...buildRow({
    section: 'Centre-West',
    sectionGu: 'મધ્ય-પશ્ચિમ',
    firstNumber: 51,
    count: 14,
    firstX: -16.5,
    step: 1.35,
    z: -0.8,
    width: 1.2,
    depth: 2.8,
    areaAt: () => 480,
    statusAt: (p) => (p % 5 === 0 ? 'sold' : 'available'),
  }),
  ...buildRow({
    section: 'Centre-West',
    sectionGu: 'મધ્ય-પશ્ચિમ',
    firstNumber: 65,
    count: 4,
    firstX: -16.5,
    step: 1.35,
    z: 2.4,
    width: 1.2,
    depth: 2.4,
    areaAt: (p) => [1074, 961, 480, 1079][p - 1] || 500,
    statusAt: () => 'available',
  }),

  // Middle-east block (between roads, east of centre road, west of common 7658)
  ...buildRow({
    section: 'Centre-East',
    sectionGu: 'મધ્ય-પૂર્વ',
    firstNumber: 80,
    count: 12,
    firstX: 3.5,
    step: 1.35,
    z: -0.8,
    width: 1.2,
    depth: 2.8,
    areaAt: () => 480,
    statusAt: (p) => (p % 7 === 0 ? 'reserved' : 'available'),
  }),
  ...buildRow({
    section: 'Centre-East',
    sectionGu: 'મધ્ય-પૂર્વ',
    firstNumber: 92,
    count: 3,
    firstX: 3.5,
    step: 1.35,
    z: 2.4,
    width: 1.2,
    depth: 2.4,
    areaAt: (p) => [914, 480, 961][p - 1] || 500,
    statusAt: () => 'available',
  }),

  // South long row (brochure bottom band)
  ...buildRow({
    section: 'South',
    sectionGu: 'દક્ષિણ',
    firstNumber: 100,
    count: 28,
    firstX: -18.5,
    step: 1.32,
    z: 6.8,
    width: 1.15,
    depth: 3.2,
    areaAt: (p) => {
      const edge = [914, 815, 544, 536, 524, 531, 528, 525, 522, 519, 516, 512, 508, 505, 500, 496, 490, 486, 480, 477, 473, 469, 467, 463, 459, 456, 452, 449]
      return edge[p - 1] || 480
    },
    statusAt: (p) => (p % 9 === 0 ? 'sold' : p === 4 ? 'reserved' : 'available'),
  }),
]

export const COMMON_AREAS = [
  {
    id: 'common-2',
    name: 'Common Plot-2',
    nameGu: 'કોમન પ્લોટ-૨',
    areaSqft: 5990,
    x: -7.2,
    z: -7.0,
    width: 3.8,
    depth: 3.6,
  },
  {
    id: 'common-1',
    name: 'Common Plot',
    nameGu: 'કોમન પ્લોટ',
    areaSqft: 7658,
    x: 18.5,
    z: 0.5,
    width: 5.2,
    depth: 6.8,
  },
]

// Roads matching brochure labels (scaled units)
export const ROADS = [
  // 40 ft wide crossover road — west edge
  { x: -22.2, z: 0, width: 2.8, depth: 22, label: '40 ft', labelGu: '૪૦ ફૂટ' },
  // North horizontal 25 ft
  { x: 0, z: -4.2, width: 44, depth: 1.6, label: '25 ft', labelGu: '૨૫ ફૂટ' },
  // South horizontal 25 ft
  { x: 0, z: 4.6, width: 44, depth: 1.6, label: '25 ft', labelGu: '૨૫ ફૂટ' },
  // Centre vertical 25 ft
  { x: 0.8, z: 0.2, width: 1.6, depth: 7.2, label: '25 ft', labelGu: '૨૫ ફૂટ' },
]

export const SITE_BOUNDARY = { width: 52, depth: 22 }

export const SITE_TITLE = {
  en: 'Radhe Krishna Residency (Phase-2)',
  gu: 'રાધેકૃષ્ણ રેસીડેન્સી (ફેઝ-૨)',
}

export const SITE_TAGLINE = {
  en: 'Beautiful planning of open plots…',
  gu: 'ઓપન પ્લોટ્સ નું સુંદર આયોજન…',
}

export function countPlotsByStatus(plots) {
  const counts = { available: 0, reserved: 0, sold: 0 }
  for (const plot of plots) counts[plot.status] += 1
  return counts
}
