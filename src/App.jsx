import { useCallback, useEffect, useState } from 'react'
import MapCanvas from './MapCanvas.jsx'
import { BIOMES, BIOME_KEYS } from './biomes.js'

const STORAGE_KEY = 'feathermap.poc.v1'

const EMPTY = { towns: [], roads: [], features: [] }

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      towns: data.towns || [],
      roads: data.roads || [],
      features: data.features || [],
    }
  } catch {
    return null
  }
}

const TOOLS = [
  { id: 'select', label: 'Select / Pan', hint: 'Drag the map to pan. Click a town/road/area to select it.' },
  { id: 'town', label: 'Town', hint: 'Click to place a town. Double-click a town to rename it.' },
  { id: 'road', label: 'Road', hint: 'Click one town, then another, to connect them. Select a road and double-click it to add a bend.' },
  { id: 'region', label: 'Region', hint: 'Click to outline a biome. Press Finish (or Enter) to complete it.' },
  { id: 'border', label: 'Border', hint: 'Click to outline a dotted boundary. Finish to complete.' },
  { id: 'river', label: 'River', hint: 'Click along the river course. Finish to complete.' },
]

export default function App() {
  const [tool, setTool] = useState('select')
  const [biome, setBiome] = useState('forest')
  const [map, setMap] = useState(() => loadMap() || EMPTY)
  const [selected, setSelected] = useState(null)
  const [draft, setDraft] = useState(null)

  // Auto-save to localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [map])

  const chooseTool = useCallback(
    (t) => {
      setTool(t)
      setSelected(null)
      if (t === 'region' || t === 'border' || t === 'river') {
        setDraft({ type: t, biome: t === 'region' ? biome : null, points: [] })
      } else {
        setDraft(null)
      }
    },
    [biome],
  )

  // Keep the active draft's biome in sync with the selector.
  useEffect(() => {
    if (draft && draft.type === 'region') {
      setDraft((d) => (d ? { ...d, biome } : d))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biome])

  const finishDraft = useCallback(() => {
    setDraft((d) => {
      if (!d) return d
      const min = d.type === 'river' ? 2 : 3
      if (d.points.length >= min) {
        let name = null
        if (d.type === 'region') {
          name = window.prompt('Region label (optional):', '') || null
        }
        setMap((m) => ({
          ...m,
          features: [
            ...m.features,
            { id: crypto.randomUUID(), type: d.type, biome: d.biome, points: d.points, name },
          ],
        }))
      }
      // start a fresh draft of the same tool so you can keep drawing
      return { type: d.type, biome: d.type === 'region' ? biome : null, points: [] }
    })
  }, [biome])

  const cancelDraft = useCallback(() => {
    setDraft((d) => (d ? { ...d, points: [] } : d))
  }, [])

  const deleteSelected = useCallback(() => {
    setSelected((sel) => {
      if (!sel) return null
      setMap((m) => {
        if (sel.kind === 'town') {
          return {
            ...m,
            towns: m.towns.filter((t) => t.id !== sel.id),
            roads: m.roads.filter((r) => r.a !== sel.id && r.b !== sel.id),
          }
        }
        if (sel.kind === 'road') return { ...m, roads: m.roads.filter((r) => r.id !== sel.id) }
        if (sel.kind === 'feature') return { ...m, features: m.features.filter((f) => f.id !== sel.id) }
        return m
      })
      return null
    })
  }, [])

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Enter' && draft) {
        e.preventDefault()
        finishDraft()
      } else if (e.key === 'Escape') {
        if (draft) cancelDraft()
        else setSelected(null)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, finishDraft, cancelDraft, deleteSelected])

  const activeTool = TOOLS.find((t) => t.id === tool)
  const drafting = !!draft && (draft.type === 'region' || draft.type === 'border' || draft.type === 'river')

  return (
    <div className="app">
      <div className="toolbar">
        <div className="brand">
          <span className="brand-mark">❦</span> FeatherMapMaker
          <span className="brand-tag">POC</span>
        </div>

        <div className="tool-group">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool-btn${tool === t.id ? ' active' : ''}`}
              onClick={() => chooseTool(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tool === 'region' && (
          <div className="tool-group">
            <label className="field-label">Biome</label>
            <select value={biome} onChange={(e) => setBiome(e.target.value)}>
              {BIOME_KEYS.map((k) => (
                <option key={k} value={k}>
                  {BIOMES[k].label}
                </option>
              ))}
            </select>
          </div>
        )}

        {drafting && (
          <div className="tool-group">
            <button className="tool-btn primary" onClick={finishDraft}>
              Finish ⏎
            </button>
            <button className="tool-btn" onClick={cancelDraft}>
              Clear points
            </button>
          </div>
        )}

        <div className="tool-group">
          <button className="tool-btn" disabled={!selected} onClick={deleteSelected}>
            Delete ⌫
          </button>
          <button
            className="tool-btn danger"
            onClick={() => {
              if (window.confirm('Clear the entire map?')) {
                setMap(EMPTY)
                setSelected(null)
                setDraft(draft ? { ...draft, points: [] } : null)
              }
            }}
          >
            Clear all
          </button>
        </div>

        <div className="hint">{drafting ? `${activeTool.label}: ${activeTool.hint}` : activeTool.hint}</div>
      </div>

      <MapCanvas
        map={map}
        setMap={setMap}
        tool={tool}
        biome={biome}
        selected={selected}
        setSelected={setSelected}
        draft={draft}
        setDraft={setDraft}
      />
    </div>
  )
}
