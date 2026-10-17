// Outline icon set (24px grid, 1.75 stroke) matching the reference's line icons.

const ICONS = {
  home: ['M3.5 10.5 12 3.5l8.5 7V20.5h-5.5v-6h-6v6H3.5z'],
  colour: ['M12 3.5s6.5 6.6 6.5 11a6.5 6.5 0 0 1-13 0c0-4.4 6.5-11 6.5-11z'],
  profile: ['M4.5 20.5c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5', 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  settings: [
    'M4 7h9',
    'M17 7h3',
    'M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M4 12h3',
    'M11 12h9',
    'M9 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M4 17h11',
    'M19 17h1',
    'M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  back: ['M19 12H5', 'M11 6l-6 6 6 6'],
  chevron: ['M9 6l6 6-6 6'],
  camera: ['M4 8.5h3l1.8-3h6.4l1.8 3h3v10.5H4z', 'M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z'],
  upload: ['M12 15.5V4.5', 'M7.5 9 12 4.5 16.5 9', 'M4.5 19.5h15'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'],
  shield: ['M12 3.5l7.5 3v5.5c0 4.6-3.2 7.6-7.5 8.5-4.3-.9-7.5-3.9-7.5-8.5V6.5z'],
  box: ['M4 7.5 12 3.5l8 4v9l-8 4-8-4z', 'M4 7.5l8 4 8-4', 'M12 11.5v9'],
  sun: [
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M12 2.5v2',
    'M12 19.5v2',
    'M2.5 12h2',
    'M19.5 12h2',
    'M5.3 5.3l1.4 1.4',
    'M17.3 17.3l1.4 1.4',
    'M5.3 18.7l1.4-1.4',
    'M17.3 6.7l1.4-1.4',
  ],
  card: ['M4.5 5.5h15v13h-15z', 'M8 9.5h8'],
  server: ['M4.5 4.5h15v6h-15z', 'M4.5 13.5h15v6h-15z', 'M8 7.5h.01', 'M8 16.5h.01'],
  trash: ['M5 7h14', 'M9.5 7V4.5h5V7', 'M6.5 7l1 13h9l1-13'],
  sparkle: ['M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6-5.6-1.9 5.6-1.9z'],
  voice: ['M4.5 9.5h3l4.5-4v13l-4.5-4h-3z', 'M15.5 9.2a4 4 0 0 1 0 5.6', 'M18.2 6.6a7.6 7.6 0 0 1 0 10.8'],
  'voice-off': ['M4.5 9.5h3l4.5-4v13l-4.5-4h-3z', 'M16 9.5l5 5', 'M21 9.5l-5 5'],
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
