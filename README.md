# FeatherMapMaker

A browser tool for designing **storybook / old-paper style fantasy maps** — the kind you'd find folded inside a board game box or printed as a movie prop. Place towns, draw winding roads between them, sketch out forests, mountains, deserts and rivers, and mark territory borders with dotted lines.

This repository currently holds a **proof of concept (POC)**: enough to make the idea tangible and to validate the interaction model. It is intentionally not a finished product (see [Roadmap](#roadmap)).

> ❦ Live demo (once deployed): `https://<your-username>.github.io/FeatherMapMaker/`

---

## The idea

Existing fantasy-map tools (Inkarnate, Wonderdraft, Azgaar's generator) are mostly **brush/stamp** based or **procedural**. The gap this tool aims at is treating a map as an **editable vector graph**:

- **Towns are nodes** you place and name.
- **Roads are editable edges** between towns — they auto-snap to the town's edge, and you drop waypoints to curve them or add stops along the way.
- **Biomes and rivers are vector shapes** you draw, styled with hand-drawn textures.
- **Borders** are dotted boundary lines.

All wrapped in an aged-paper aesthetic rather than a CAD-diagram look.

## What the POC does today

| Feature | Status |
| --- | --- |
| Pan & zoom (drag background / mouse wheel) | ✅ |
| Place towns, drag to reposition, double-click to rename | ✅ |
| Connect two towns with a road (auto-snaps to town edge) | ✅ |
| Curve a road: select it, double-click to add a draggable waypoint (double-click a waypoint to remove) | ✅ |
| Draw biome **regions** (forest / mountains / desert / grassland / water) with textured fills + dashed outline + optional label | ✅ |
| Draw dotted area **borders** | ✅ |
| Draw **rivers** | ✅ |
| Delete selected item (Delete/Backspace) · Clear all | ✅ |
| Auto-save to browser `localStorage` | ✅ |
| Aged-paper styling, fantasy fonts, subtle hand-drawn waver on strokes | ✅ |
| Export to PNG/SVG | ❌ (roadmap) |
| Server-side persistence / accounts | ❌ (roadmap) |

### How to use it

1. Pick a tool from the toolbar (the hint line explains each one).
2. **Town** tool → click empty paper to drop a town; double-click a town to rename it.
3. **Road** tool → click one town, then another, to connect them.
4. Back in **Select / Pan**, click a road and double-click along it to add a bend; drag the white handles to shape the curve.
5. **Region / Border / River** tools → click to drop points, then **Finish** (or press <kbd>Enter</kbd>). <kbd>Esc</kbd> clears the points in progress.
6. Your map auto-saves locally and reloads on your next visit.

## Tech stack

- **[Vite](https://vitejs.dev/) + [React](https://react.dev/)** (plain JSX).
- **SVG** for the whole editor — vector paths, draggable handles, dashed/dotted strokes, polygon biomes and text labels all map cleanly onto it.
- No backend; state lives in React and is mirrored to `localStorage`.

The hand-drawn look comes from Catmull-Rom smoothing, dotted/dashed strokes, SVG `<pattern>` biome textures, and a subtle `feTurbulence` + `feDisplacementMap` "sketch" filter — no image assets.

## Project structure

```
index.html                 Entry HTML + Google Fonts (Cinzel, IM Fell English)
vite.config.js             Vite config — `base` must match the repo name for Pages
src/
  main.jsx                 React root
  App.jsx                  State owner + toolbar
  MapCanvas.jsx            The SVG editor and all pointer interactions
  Defs.jsx                 SVG <defs>: paper + biome patterns + sketch filter
  biomes.js                Biome colours / textures
  geometry.js              Path/geometry math (smoothing, snapping, coords)
  styles.css               Layout + toolbar styling
.github/workflows/deploy.yml   Build + deploy to GitHub Pages
```

## Running locally

> Requires Node 18+ and npm. (Not needed just to deploy — CI builds it for you.)

```bash
npm install
npm run dev        # http://localhost:5173/FeatherMapMaker/
npm run build      # production build into dist/
npm run preview    # preview the production build
```

## Deploying to GitHub Pages

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`.

**One-time setup on GitHub:**

1. Create a repository named **`FeatherMapMaker`** and push this code to its `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source = GitHub Actions**.
3. Push to `main` (or run the workflow manually via the Actions tab). When it goes green, the site is live at `https://<your-username>.github.io/FeatherMapMaker/`.

> **Note on the base path:** `vite.config.js` sets `base: '/FeatherMapMaker/'`. GitHub Pages serves project sites under `/<repo-name>/`, so if you rename the repository you **must** update `base` to match, or the JS/CSS will 404.

## Roadmap

- **Export** maps to PNG and SVG.
- **.NET backend** + persistence so maps can be saved to an account and shared (this React frontend will talk to it).
- Richer hand-drawn rendering (e.g. [rough.js](https://roughjs.com/) and/or a canvas engine like [Konva](https://konvajs.org/)).
- Decorative asset stamps (compass rose, sea monsters, individual trees/mountains).
- Undo / redo.
- Touch & mobile polish.

---

*POC built as a starting point — expect rough edges. Feedback on the interaction model is the most valuable thing at this stage.*
