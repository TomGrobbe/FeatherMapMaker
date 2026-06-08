import { useEffect, useMemo, useRef, useState } from 'react'
import Defs from './Defs.jsx'
import { BIOMES } from './biomes.js'
import {
  centroid,
  distToSegment,
  screenToWorld,
  smoothClosedPath,
  smoothPath,
  trimEnds,
  uid,
} from './geometry.js'

const TOWN_RADIUS = 16 // world units; roads snap to this edge
const WORLD = 20000 // size of the (huge) background rect

export default function MapCanvas({
  map,
  setMap,
  tool,
  biome,
  selected,
  setSelected,
  draft,
  setDraft,
}) {
  const svgRef = useRef(null)
  const [view, setView] = useState({ x: -200, y: -150, w: 1600, h: 1000 })
  const [drag, setDrag] = useState(null) // {kind, ...}
  const [roadStart, setRoadStart] = useState(null) // town id
  const [cursor, setCursor] = useState(null) // world point, for live previews

  const townById = useMemo(() => {
    const m = {}
    for (const t of map.towns) m[t.id] = t
    return m
  }, [map.towns])

  // Reset the in-progress road when we leave the road tool.
  useEffect(() => {
    if (tool !== 'road') setRoadStart(null)
  }, [tool])

  // Non-passive wheel listener so we can preventDefault (zoom, not page scroll).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    function onWheel(e) {
      e.preventDefault()
      const world = screenToWorld(svg, e.clientX, e.clientY)
      const scale = e.deltaY > 0 ? 1.1 : 1 / 1.1
      setView((v) => ({
        x: world.x - (world.x - v.x) * scale,
        y: world.y - (world.y - v.y) * scale,
        w: v.w * scale,
        h: v.h * scale,
      }))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  function worldOf(e) {
    return screenToWorld(svgRef.current, e.clientX, e.clientY)
  }

  // ---- Background pointer handling (tool-dependent) ----
  function onBgPointerDown(e) {
    if (e.button !== 0) return
    if (!e.target.getAttribute('data-bg')) return // only react to the background
    const world = worldOf(e)

    if (tool === 'select') {
      setSelected(null)
      const rect = svgRef.current.getBoundingClientRect()
      setDrag({
        kind: 'pan',
        sx: e.clientX,
        sy: e.clientY,
        view0: view,
        wppx: view.w / rect.width,
        wppy: view.h / rect.height,
      })
      svgRef.current.setPointerCapture(e.pointerId)
    } else if (tool === 'town') {
      setMap((m) => ({
        ...m,
        towns: [...m.towns, { id: uid(), x: world.x, y: world.y, name: 'New Town' }],
      }))
    } else if (tool === 'region' || tool === 'border' || tool === 'river') {
      setDraft((d) => ({
        type: tool,
        biome: tool === 'region' ? biome : null,
        points: [...(d?.points || []), { x: world.x, y: world.y }],
      }))
    }
  }

  function onPointerMove(e) {
    if (roadStart || draft) setCursor(worldOf(e))
    if (!drag) return
    if (drag.kind === 'pan') {
      const dx = e.clientX - drag.sx
      const dy = e.clientY - drag.sy
      setView({
        ...drag.view0,
        x: drag.view0.x - dx * drag.wppx,
        y: drag.view0.y - dy * drag.wppy,
      })
    } else if (drag.kind === 'town') {
      const world = worldOf(e)
      setMap((m) => ({
        ...m,
        towns: m.towns.map((t) => (t.id === drag.id ? { ...t, x: world.x, y: world.y } : t)),
      }))
    } else if (drag.kind === 'waypoint') {
      const world = worldOf(e)
      setMap((m) => ({
        ...m,
        roads: m.roads.map((r) =>
          r.id === drag.roadId
            ? {
                ...r,
                waypoints: r.waypoints.map((w, i) =>
                  i === drag.index ? { x: world.x, y: world.y } : w,
                ),
              }
            : r,
        ),
      }))
    }
  }

  function onPointerUp(e) {
    if (drag && svgRef.current?.hasPointerCapture?.(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId)
    }
    setDrag(null)
  }

  // ---- Town interactions ----
  function onTownPointerDown(e, town) {
    e.stopPropagation()
    if (e.button !== 0) return
    if (tool === 'road') {
      if (!roadStart) {
        setRoadStart(town.id)
      } else if (roadStart === town.id) {
        setRoadStart(null)
      } else {
        const a = roadStart
        const b = town.id
        const exists = map.roads.some(
          (r) => (r.a === a && r.b === b) || (r.a === b && r.b === a),
        )
        if (!exists) {
          setMap((m) => ({
            ...m,
            roads: [...m.roads, { id: uid(), a, b, waypoints: [] }],
          }))
        }
        setRoadStart(null)
      }
      return
    }
    // select / town tools: select + drag
    setSelected({ kind: 'town', id: town.id })
    setDrag({ kind: 'town', id: town.id })
    svgRef.current.setPointerCapture(e.pointerId)
  }

  function renameTown(town) {
    const name = window.prompt('Town name:', town.name)
    if (name == null) return
    setMap((m) => ({
      ...m,
      towns: m.towns.map((t) => (t.id === town.id ? { ...t, name } : t)),
    }))
  }

  // ---- Road interactions ----
  function roadPoints(road) {
    const a = townById[road.a]
    const b = townById[road.b]
    if (!a || !b) return null
    const full = [{ x: a.x, y: a.y }, ...road.waypoints, { x: b.x, y: b.y }]
    return trimEnds(full, TOWN_RADIUS, TOWN_RADIUS)
  }

  function insertWaypoint(road, world) {
    const a = townById[road.a]
    const b = townById[road.b]
    if (!a || !b) return
    const full = [{ x: a.x, y: a.y }, ...road.waypoints, { x: b.x, y: b.y }]
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < full.length - 1; i++) {
      const d = distToSegment(world, full[i], full[i + 1])
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    const wps = [...road.waypoints]
    wps.splice(best, 0, { x: world.x, y: world.y }) // segment index == waypoint insert index
    setMap((m) => ({
      ...m,
      roads: m.roads.map((r) => (r.id === road.id ? { ...r, waypoints: wps } : r)),
    }))
  }

  function removeWaypoint(roadId, index) {
    setMap((m) => ({
      ...m,
      roads: m.roads.map((r) =>
        r.id === roadId ? { ...r, waypoints: r.waypoints.filter((_, i) => i !== index) } : r,
      ),
    }))
  }

  // ---- Rendering ----
  const startTown = roadStart ? townById[roadStart] : null

  return (
    <svg
      ref={svgRef}
      className="canvas"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onBgPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Defs />

      {/* Background (parchment + speckle). Both rects carry data-bg for hit-testing. */}
      <rect data-bg x={-WORLD / 2} y={-WORLD / 2} width={WORLD} height={WORLD} fill="#e8dcb8" />
      <rect
        data-bg
        x={-WORLD / 2}
        y={-WORLD / 2}
        width={WORLD}
        height={WORLD}
        fill="url(#pat-paper)"
      />

      {/* Roads + features get the hand-drawn waver. Towns + text stay crisp. */}
      <g filter="url(#sketch)">
        {/* Regions (filled) */}
        {map.features
          .filter((f) => f.type === 'region')
          .map((f) => {
            const cfg = BIOMES[f.biome] || BIOMES.forest
            const d = smoothClosedPath(f.points)
            const isSel = selected?.kind === 'feature' && selected.id === f.id
            return (
              <g key={f.id} onPointerDown={(e) => selectFeature(e, f.id)}>
                <path d={d} fill={cfg.base} opacity={0.4} />
                <path d={d} fill={`url(#${cfg.pattern})`} />
                <path
                  d={d}
                  fill="none"
                  stroke={cfg.stroke}
                  strokeWidth={isSel ? 3.5 : 2}
                  strokeDasharray="8 6"
                  strokeLinejoin="round"
                />
              </g>
            )
          })}

        {/* Rivers */}
        {map.features
          .filter((f) => f.type === 'river')
          .map((f) => {
            const isSel = selected?.kind === 'feature' && selected.id === f.id
            return (
              <path
                key={f.id}
                d={smoothPath(f.points)}
                fill="none"
                stroke="#4a7a9b"
                strokeWidth={isSel ? 6 : 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
                onPointerDown={(e) => selectFeature(e, f.id)}
              />
            )
          })}

        {/* Borders (dotted) */}
        {map.features
          .filter((f) => f.type === 'border')
          .map((f) => {
            const isSel = selected?.kind === 'feature' && selected.id === f.id
            return (
              <path
                key={f.id}
                d={smoothClosedPath(f.points)}
                fill="none"
                stroke="#6b4f3a"
                strokeWidth={isSel ? 4 : 3}
                strokeDasharray="0.1 9"
                strokeLinecap="round"
                onPointerDown={(e) => selectFeature(e, f.id)}
              />
            )
          })}

        {/* Roads */}
        {map.roads.map((road) => {
          const pts = roadPoints(road)
          if (!pts) return null
          const isSel = selected?.kind === 'road' && selected.id === road.id
          return (
            <path
              key={road.id}
              d={smoothPath(pts)}
              fill="none"
              stroke={isSel ? '#9c6b2f' : '#7a5a3a'}
              strokeWidth={isSel ? 5 : 3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                setSelected({ kind: 'road', id: road.id })
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                insertWaypoint(road, worldOf(e))
              }}
            />
          )
        })}
      </g>

      {/* Region labels (crisp) */}
      {map.features
        .filter((f) => f.type === 'region' && f.name)
        .map((f) => {
          const c = centroid(f.points)
          return (
            <text key={`lbl-${f.id}`} className="region-label" x={c.x} y={c.y} textAnchor="middle">
              {f.name}
            </text>
          )
        })}

      {/* Waypoint handles for the selected road */}
      {selected?.kind === 'road' &&
        (map.roads.find((r) => r.id === selected.id)?.waypoints || []).map((w, i) => (
          <circle
            key={`wp-${i}`}
            className="handle"
            cx={w.x}
            cy={w.y}
            r={6}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (e.button !== 0) return
              setDrag({ kind: 'waypoint', roadId: selected.id, index: i })
              svgRef.current.setPointerCapture(e.pointerId)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              removeWaypoint(selected.id, i)
            }}
          />
        ))}

      {/* Towns */}
      {map.towns.map((t) => {
        const isSel = selected?.kind === 'town' && selected.id === t.id
        const isStart = roadStart === t.id
        return (
          <g
            key={t.id}
            transform={`translate(${t.x} ${t.y})`}
            style={{ cursor: tool === 'road' ? 'crosshair' : 'pointer' }}
            onPointerDown={(e) => onTownPointerDown(e, t)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              renameTown(t)
            }}
          >
            {(isSel || isStart) && (
              <circle r={TOWN_RADIUS + 4} fill="none" stroke="#9c6b2f" strokeWidth={1.5} strokeDasharray="3 3" />
            )}
            <circle r={10} fill="#f3ead0" stroke="#5b4636" strokeWidth={2} />
            {/* little house glyph */}
            <rect x={-5} y={-4} width={10} height={8} fill="#7a5a3a" />
            <path d="M-7 -4 L0 -12 L7 -4 Z" fill="#5b4636" />
            <text className="town-label" x={0} y={28} textAnchor="middle">
              {t.name}
            </text>
          </g>
        )
      })}

      {/* Live road preview while connecting */}
      {startTown && cursor && (
        <line
          x1={startTown.x}
          y1={startTown.y}
          x2={cursor.x}
          y2={cursor.y}
          stroke="#9c6b2f"
          strokeWidth={2}
          strokeDasharray="6 6"
          pointerEvents="none"
        />
      )}

      {/* Draft preview for region/border/river in progress */}
      {draft && draft.points.length > 0 && (
        <g pointerEvents="none">
          <path
            d={smoothPath(cursor ? [...draft.points, cursor] : draft.points)}
            fill="none"
            stroke="#9c6b2f"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          {draft.points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#9c6b2f" />
          ))}
        </g>
      )}
    </svg>
  )

  function selectFeature(e, id) {
    e.stopPropagation()
    // Don't hijack clicks while actively drawing a new feature.
    if (draft) return
    setSelected({ kind: 'feature', id })
  }
}
