// Biome definitions: base fill colour, outline stroke colour, and the id of
// the SVG <pattern> (defined in Defs.jsx) used as a texture overlay.

export const BIOMES = {
  forest: { label: 'Forest', base: '#8fae74', stroke: '#4f6b3a', pattern: 'pat-forest' },
  mountains: { label: 'Mountains', base: '#bfb295', stroke: '#5b4a36', pattern: 'pat-mountains' },
  desert: { label: 'Desert', base: '#e6d39a', stroke: '#b08f48', pattern: 'pat-desert' },
  grassland: { label: 'Grassland', base: '#bcd189', stroke: '#6f8a45', pattern: 'pat-grass' },
  water: { label: 'Water', base: '#9cc0d6', stroke: '#4a7a9b', pattern: 'pat-water' },
}

export const BIOME_KEYS = Object.keys(BIOMES)
