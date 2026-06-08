// Small, dependency-free geometry helpers for the map editor.

/** Generate a reasonably unique id. */
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Euclidean distance between two {x,y} points. */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Shortest distance from point p to the line segment a-b. */
export function distToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return dist(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/** Move `from` toward `to` by `d` world units; returns a new point. */
export function movePointToward(from, to, d) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  return { x: from.x + (dx / len) * d, y: from.y + (dy / len) * d }
}

/**
 * Trim the first/last points of an ordered point list inward by the given
 * radii. Used so a road visually starts/ends at the *edge* of a town marker
 * rather than its centre.
 */
export function trimEnds(points, r0, r1) {
  if (points.length < 2) return points.map((p) => ({ ...p }))
  const pts = points.map((p) => ({ ...p }))
  pts[0] = movePointToward(pts[0], pts[1], r0)
  const last = pts.length - 1
  pts[last] = movePointToward(pts[last], pts[last - 1], r1)
  return pts
}

/** Average position of a set of points (used for region labels). */
export function centroid(points) {
  if (!points.length) return { x: 0, y: 0 }
  let sx = 0
  let sy = 0
  for (const p of points) {
    sx += p.x
    sy += p.y
  }
  return { x: sx / points.length, y: sy / points.length }
}

/**
 * Build a smooth open path through the given points using a Catmull-Rom
 * spline converted to cubic beziers.
 */
export function smoothPath(points) {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

/** Like smoothPath, but wraps around to form a closed loop (regions/borders). */
export function smoothClosedPath(points) {
  const n = points.length
  if (n < 3) return smoothPath(points)
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d + ' Z'
}

/**
 * Convert client (screen) coordinates to SVG world coordinates using the
 * element's current screen CTM. Robust to viewBox letterboxing and zoom.
 */
export function screenToWorld(svg, clientX, clientY) {
  if (!svg) return { x: 0, y: 0 }
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}
