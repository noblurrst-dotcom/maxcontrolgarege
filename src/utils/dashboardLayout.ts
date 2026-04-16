export const SNAP_THRESHOLD = 8
export const GRID_SIZE = 20
export const GAP = 8

export interface LayoutBlock {
  id: string
  label: string
  visible: boolean
  x: number
  y: number
  w: number
  h: number
}

export function snapValue(value: number, candidates: number[], threshold = SNAP_THRESHOLD): number {
  let best = value
  let bestDist = threshold
  for (const c of candidates) {
    const dist = Math.abs(value - c)
    if (dist < bestDist) { bestDist = dist; best = c }
  }
  return best
}

export function getSnapCandidates(activeId: string, blocks: LayoutBlock[], containerWidth: number): { x: number[]; y: number[] } {
  const xs = new Set<number>()
  const ys = new Set<number>()
  for (let i = 0; i <= containerWidth; i += GRID_SIZE) xs.add(i)
  for (let i = 0; i <= 3000; i += GRID_SIZE) ys.add(i)
  for (const b of blocks) {
    if (b.id === activeId || !b.visible) continue
    xs.add(b.x); xs.add(b.x + b.w); xs.add(b.x + b.w + GAP)
    ys.add(b.y); ys.add(b.y + b.h); ys.add(b.y + b.h + GAP)
  }
  xs.add(containerWidth)
  return { x: Array.from(xs), y: Array.from(ys) }
}

export function overlaps(a: LayoutBlock, b: LayoutBlock): boolean {
  return (
    a.x < b.x + b.w + GAP &&
    a.x + a.w + GAP > b.x &&
    a.y < b.y + b.h + GAP &&
    a.y + a.h + GAP > b.y
  )
}

export function clampBlock<T extends LayoutBlock>(block: T, containerWidth: number, minW = 200, minH = 120): T {
  const w = Math.max(minW, Math.min(block.w, containerWidth))
  const h = Math.max(minH, block.h)
  const x = Math.max(0, Math.min(block.x, containerWidth - w))
  const y = Math.max(0, block.y)
  return { ...block, x, y, w, h }
}

export function resolveCollisions<T extends LayoutBlock>(blocks: T[], activeId: string, containerWidth = 9999): T[] {
  const MAX_ITER = 20
  let result = blocks.map(b => ({ ...b }))

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let moved = false
    const active = result.find(b => b.id === activeId)
    if (!active) break

    for (let i = 0; i < result.length; i++) {
      const b = result[i]
      if (b.id === activeId || !b.visible) continue
      if (!overlaps(active, b)) continue

      const overlapRight  = (active.x + active.w + GAP) - b.x
      const overlapLeft   = (b.x + b.w + GAP) - active.x
      const overlapBottom = (active.y + active.h + GAP) - b.y
      const overlapTop    = (b.y + b.h + GAP) - active.y
      const minOverlap = Math.min(overlapRight, overlapLeft, overlapBottom, overlapTop)

      if (minOverlap === overlapBottom) {
        result[i] = { ...result[i], y: active.y + active.h + GAP }
      } else if (minOverlap === overlapTop) {
        result[i] = { ...result[i], y: active.y - b.h - GAP }
      } else if (minOverlap === overlapRight) {
        result[i] = { ...result[i], x: active.x + active.w + GAP }
      } else {
        result[i] = { ...result[i], x: active.x - b.w - GAP }
      }

      result[i] = { ...result[i], x: Math.max(0, Math.min(result[i].x, containerWidth - result[i].w)), y: Math.max(0, result[i].y) }
      moved = true
    }
    if (!moved) break
  }
  return result
}

export function calcularAlturaTotal(blocks: LayoutBlock[], livePosMap: Partial<Record<string, { x: number; y: number }>>, liveHMap: Partial<Record<string, number>>): number {
  if (!blocks.length) return 400
  return Math.max(...blocks.map(b => (livePosMap[b.id]?.y ?? b.y) + (liveHMap[b.id] ?? b.h))) + 32
}

export function autoArranjarBlocks<T extends LayoutBlock>(blocks: T[], containerWidth: number, gap = GAP): T[] {
  const visiveis = blocks.filter(b => b.visible)
  const ocultos = blocks.filter(b => !b.visible)
  const resultado: T[] = []
  let curX = 0
  let curY = 0
  let alturaLinha = 0

  for (const block of visiveis) {
    if (curX > 0 && curX + block.w > containerWidth) {
      curX = 0
      curY += alturaLinha + gap
      alturaLinha = 0
    }
    const x = Math.min(curX, containerWidth - block.w)
    resultado.push({ ...block, x: Math.max(0, x), y: curY })
    alturaLinha = Math.max(alturaLinha, block.h)
    curX += block.w + gap
  }

  return [...resultado, ...ocultos]
}
