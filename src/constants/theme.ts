export const colors = {
  // Backgrounds
  bg:        '#111111',
  bgCard:    '#1A1A1A',
  bgInput:   '#222222',
  bgMuted:   '#161616',

  // Accent
  accent:      '#FF4D1C',
  accentLight: '#FF7A50',
  accentDim:   'rgba(255,77,28,0.15)',

  // Status
  success:     '#4DD890',
  successDim:  'rgba(77,216,144,0.12)',
  info:        '#7AB8E8',
  infoDim:     'rgba(122,184,232,0.12)',

  // Text
  text:        '#FFFFFF',
  textMuted:   'rgba(255,255,255,0.45)',
  textHint:    'rgba(255,255,255,0.25)',

  // Borders
  border:      'rgba(255,255,255,0.10)',
  borderStrong:'rgba(255,255,255,0.20)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
};

export const font = {
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   22,
  xxl:  28,
};

// Skill level → color mapping
export const skillColor: Record<string, string> = {
  beginner:     '#4DD890',
  intermediate: '#FF7A50',
  advanced:     '#E24B4A',
};

// Martial art → tag color
export const artColor = colors.accentLight;
