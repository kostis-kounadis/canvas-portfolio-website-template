/**
 * defaults.ts
 *
 * Single source of truth for default sub-object shapes used throughout the CMS
 * forms. Import these instead of repeating inline object literals in every
 * onChange handler — changing a default here propagates everywhere automatically.
 */

export const DEFAULT_IMAGE_SHADOW = {
  enabled: true,
  opacity: 0.06,
  blur: 30,
  color: '#000000',
} as const;

export const DEFAULT_IMAGE_EFFECTS = {
  initialState: 'colour',
  clickMode: 'none',
  clickStickyMode: 'multi',
  blurOthersOnClick: false,
  roundedCorners: { enabled: false, radius: 8 },
} as const;

export const DEFAULT_IMAGE_CLICK = {
  lightbox: { enabled: true, backdropEffect: 'darken' },
  canvasExpand: { enabled: false },
} as const;

export const DEFAULT_LIGHTBOX = {
  enabled: true,
  backdropEffect: 'darken',
} as const;

export const DEFAULT_CANVAS_EXPAND = {
  enabled: false,
} as const;
