'use client'

interface CharacterProps {
  size?: number
  expression?: 'happy' | 'excited' | 'thinking'
}

export default function Character({ size = 120, expression = 'happy' }: CharacterProps) {
  return (
    <div className="char-idle" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Shadow */}
        <ellipse cx="60" cy="115" rx="25" ry="5" fill="rgba(0,0,0,0.15)" />

        {/* Body */}
        <ellipse cx="60" cy="75" rx="28" ry="32" fill="#FFE4B5" />

        {/* Belly */}
        <ellipse cx="60" cy="80" rx="18" ry="20" fill="#FFF5E0" />

        {/* Head */}
        <circle cx="60" cy="48" r="32" fill="#FFE4B5" />

        {/* Ears */}
        <ellipse cx="35" cy="28" rx="10" ry="14" fill="#FFE4B5" />
        <ellipse cx="85" cy="28" rx="10" ry="14" fill="#FFE4B5" />
        <ellipse cx="35" cy="28" rx="6" ry="9" fill="#FFB5C8" />
        <ellipse cx="85" cy="28" rx="6" ry="9" fill="#FFB5C8" />

        {/* Eyes */}
        <g className="eye-blink" style={{ transformOrigin: '48px 46px' }}>
          <circle cx="48" cy="46" r="8" fill="white" />
          <circle cx="48" cy="46" r="5" fill="#3D2B1F" />
          <circle cx="50" cy="44" r="2" fill="white" />
        </g>
        <g className="eye-blink" style={{ transformOrigin: '72px 46px' }}>
          <circle cx="72" cy="46" r="8" fill="white" />
          <circle cx="72" cy="46" r="5" fill="#3D2B1F" />
          <circle cx="74" cy="44" r="2" fill="white" />
        </g>

        {/* Nose */}
        <ellipse cx="60" cy="56" rx="5" ry="3" fill="#FF9BAA" />

        {/* Mouth */}
        {expression === 'happy' && (
          <path d="M 52 62 Q 60 70 68 62" stroke="#CC6677" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
        {expression === 'excited' && (
          <ellipse cx="60" cy="64" rx="8" ry="5" fill="#CC6677" />
        )}

        {/* Cheeks */}
        <circle cx="38" cy="60" r="8" fill="#FFB5C8" opacity="0.5" />
        <circle cx="82" cy="60" r="8" fill="#FFB5C8" opacity="0.5" />

        {/* Arms */}
        <ellipse cx="32" cy="78" rx="8" ry="14" fill="#FFE4B5" transform="rotate(-15 32 78)" />
        <ellipse cx="88" cy="78" rx="8" ry="14" fill="#FFE4B5" transform="rotate(15 88 78)" />

        {/* Legs */}
        <ellipse cx="50" cy="104" rx="10" ry="7" fill="#FFE4B5" />
        <ellipse cx="70" cy="104" rx="10" ry="7" fill="#FFE4B5" />

        {/* Hat / Accessory */}
        <path d="M 35 25 Q 60 5 85 25" stroke="#FF6B9D" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="16" r="6" fill="#FF6B9D" />
        <circle cx="60" cy="16" r="3" fill="#FFD700" />
      </svg>
    </div>
  )
}
