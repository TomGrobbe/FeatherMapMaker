// SVG <defs>: paper texture, biome patterns, and the hand-drawn "sketch" filter.
// Patterns use userSpaceOnUse so they tile consistently in world coordinates.

export default function Defs() {
  return (
    <defs>
      {/* Faint parchment speckle overlaid on the base paper colour. */}
      <pattern id="pat-paper" width="64" height="64" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="12" r="0.9" fill="#7a6038" opacity="0.06" />
        <circle cx="40" cy="6" r="0.7" fill="#7a6038" opacity="0.05" />
        <circle cx="22" cy="34" r="1.1" fill="#7a6038" opacity="0.05" />
        <circle cx="54" cy="44" r="0.8" fill="#7a6038" opacity="0.06" />
        <circle cx="14" cy="54" r="0.7" fill="#7a6038" opacity="0.05" />
        <circle cx="48" cy="24" r="0.6" fill="#7a6038" opacity="0.05" />
      </pattern>

      {/* Forest: little stylised trees. */}
      <pattern id="pat-forest" width="30" height="30" patternUnits="userSpaceOnUse">
        <g fill="#3f5a2c" opacity="0.55">
          <path d="M8 18 L11 9 L14 18 Z" />
          <rect x="10" y="17" width="2" height="4" />
          <path d="M20 26 L23 18 L26 26 Z" />
          <rect x="22" y="25" width="2" height="3" />
        </g>
      </pattern>

      {/* Mountains: carets. */}
      <pattern id="pat-mountains" width="34" height="26" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="#4b3c2a" strokeWidth="1.4" opacity="0.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20 L11 8 L18 20" />
          <path d="M9 22 L9 22" />
          <path d="M19 22 L26 12 L33 22" />
        </g>
      </pattern>

      {/* Desert: scattered dots. */}
      <pattern id="pat-desert" width="26" height="26" patternUnits="userSpaceOnUse">
        <g fill="#9c7d3c" opacity="0.5">
          <circle cx="6" cy="8" r="1.1" />
          <circle cx="18" cy="5" r="0.9" />
          <circle cx="13" cy="18" r="1" />
          <circle cx="22" cy="20" r="0.9" />
        </g>
      </pattern>

      {/* Grassland: little tufts. */}
      <pattern id="pat-grass" width="26" height="26" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="#5d7838" strokeWidth="1.1" opacity="0.55" strokeLinecap="round">
          <path d="M6 20 Q6 13 5 12" />
          <path d="M6 20 Q7 13 9 12" />
          <path d="M18 22 Q18 15 17 14" />
          <path d="M18 22 Q19 15 21 14" />
        </g>
      </pattern>

      {/* Water: wavelets. */}
      <pattern id="pat-water" width="30" height="18" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="#3f6e8c" strokeWidth="1.1" opacity="0.5" strokeLinecap="round">
          <path d="M0 6 Q7 1 15 6 T30 6" />
          <path d="M0 14 Q7 9 15 14 T30 14" />
        </g>
      </pattern>

      {/* Subtle hand-drawn waver applied to roads + feature outlines. */}
      <filter id="sketch" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.018"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="2.2"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  )
}
