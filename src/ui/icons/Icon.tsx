import type { SVGProps } from 'react';

interface Glyph { d: string; accent?: string; mode?: 'fill' | 'line' }

/** Custom glyph set: 24px grid, rounded strokes, with a soft filled "accent" shape for depth. No stock or AI-sparkle icons. */
const GLYPHS = {
  coach: { d: 'M5.5 5h13A2.5 2.5 0 0 1 21 7.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5V17h-2A2.5 2.5 0 0 1 3 14.5v-7A2.5 2.5 0 0 1 5.5 5z', accent: 'M8 9.5h8M8 12.5h5', mode: 'line' },
  history: { d: 'M4 12a8 8 0 1 0 2.4-5.7M4 4.5v4h4M12 8v4.2l2.8 1.6', accent: 'M12 4a8 8 0 0 1 8 8' },
  notes: { d: 'M6 3.5h9l3.5 3.5v13H6zM15 3.5V7h3.5M9 12h6M9 15.5h4', accent: 'M6 3.5h9l3.5 3.5v3H6z' },
  shield: { d: 'M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z', accent: 'M8.5 12l2.6 2.6 4.4-5', mode: 'line' },
  send: { d: 'M4 11.5 20 4l-5.5 16-3.2-6.3z', accent: 'M11.3 13.7 20 4', mode: 'line' },
  plus: { d: 'M12 5v14M5 12h14' },
  skip: { d: 'M6 5.5l8 6.5-8 6.5zM18 5v14' },
  repeat: { d: 'M4 11.5a5.5 5.5 0 0 1 5.5-5.5H18l-2.2-2.2M20 12.5a5.5 5.5 0 0 1-5.5 5.5H6l2.2 2.2' },
  flag: { d: 'M6 21V4h11.5l-2.3 4.2 2.3 4.3H6', accent: 'M6 4h11.5l-2.3 4.2H6z' },
  target: { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 16.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z', accent: 'M12 13.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z' },
  clock: { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7.5V12l3 2' },
  check: { d: 'M5 12.5l4.6 4.6L19 7.5' },
  bulb: { d: 'M9 18.5h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2.2h5c0-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z', accent: 'M9.5 9.5a2.8 2.8 0 0 1 2.5-2.3', mode: 'line' },
  code: { d: 'M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.2 5.5l-2.4 13', accent: 'M13.2 5.5l-2.4 13', mode: 'line' },
  briefcase: { d: 'M3.5 8h17v11.5h-17zM9 8V5.5h6V8M3.5 13.5h17', accent: 'M3.5 8h17v5.5h-17z' },
  cap: { d: 'M2.5 9 12 4.5 21.5 9 12 13.5zM6.5 11.3v4.4c0 1.3 2.4 2.8 5.5 2.8s5.5-1.5 5.5-2.8v-4.4', accent: 'M2.5 9 12 4.5 21.5 9 12 13.5z' },
  user: { d: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.6 3.7-5.5 7.5-5.5s6.7 1.9 7.5 5.5', accent: 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  layers: { d: 'M12 4 21 9l-9 5-9-5zM3 14l9 5 9-5', accent: 'M12 4 21 9l-9 5-9-5z' },
  eye: { d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z' },
  eyeoff: { d: 'M2.5 12S6 5.5 12 5.5c2 0 3.7.7 5.1 1.6M21.5 12S18 18.5 12 18.5c-2 0-3.7-.7-5.1-1.6M9.9 9.9a2.8 2.8 0 0 0 4 4M4 4l16 16' },
  close: { d: 'M6 6l12 12M18 6 6 18' },
  info: { d: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 11v5M12 8h.01' },
  alert: { d: 'M12 4 21.5 19.5h-19zM12 10v4M12 17h.01' },
  logout: { d: 'M10 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H10M14 8l4 4-4 4M18 12H9.5' },
  wave: { d: 'M4 12h2M8 8v8M12 5v14M16 8v8M20 12h-2' },
} as const satisfies Record<string, Glyph>;

export type IconName = keyof typeof GLYPHS;
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> { name: IconName; size?: number }

export function Icon({ name, size = 20, ...rest }: IconProps) {
  const g: Glyph = GLYPHS[name];
  const line = g.mode === 'line';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {g.accent && !line ? <path d={g.accent} fill="currentColor" fillOpacity={0.16} stroke="none" /> : null}
      <path d={g.d} />
      {g.accent && line ? <path d={g.accent} strokeOpacity={0.5} /> : null}
    </svg>
  );
}
