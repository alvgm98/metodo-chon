// Símbolo de Método Chon: la "C" de Chon que brota en una hoja.
// Geometría compartida por la web (SVG), el informe PDF y los iconos de la PWA.

/** viewBox ajustado al símbolo (sin márgenes). */
export const SYMBOL_VIEWBOX = '7.5 2 38 38'

/** Arco de la C (trazo). */
export const C_ARC = 'M32.6 15.6 A13 13 0 1 0 32.6 36.4'
export const C_STROKE = 4.6

/** Hoja que brota del extremo superior de la C (relleno). */
export const LEAF = 'M32.6 15.6 C31.6 8.6 36.6 3.6 44.6 3.2 C44.4 11 39.6 16.4 32.6 15.6 Z'

/** Nervio de la hoja. */
export const VEIN = 'M33.6 14.6 L41.6 6.4'

export const BRAND = {
  green: '#1f7449',
  leaf: '#7fc79d',
  leafOnGreen: '#a9dbbc',
  ink: '#10291d',
} as const
