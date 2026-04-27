/**
 * Color utilities — sem dependências externas.
 * Todas as funções são puras e determinísticas. Trabalham com hex `#RRGGBB`.
 *
 * Cobre: parsing/serialização, conversão HSL, luminância relativa WCAG,
 * contrast ratio, escolha automática de cor de texto, ajuste iterativo
 * para atingir contraste mínimo, lighten/darken, mix e helpers.
 */

export type RGB = { r: number; g: number; b: number }
export type HSL = { h: number; s: number; l: number }

const HEX_RE = /^#?([a-f\d]{3}|[a-f\d]{6})$/i

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n))
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function normalizeHex(hex: string): string {
  const m = HEX_RE.exec(hex.trim())
  if (!m) return '#000000'
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return `#${h.toLowerCase()}`
}

export function hexToRgb(hex: string): RGB {
  const n = normalizeHex(hex).slice(1)
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (v: number) => clamp255(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
      case gn: h = ((bn - rn) / d + 2) / 6; break
      case bn: h = ((rn - gn) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = clamp(s / 100), ln = clamp(l / 100)
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl))
}

/** WCAG 2.x relative luminance. Input em 0-255. Output 0..1. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const ch = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** Contrast ratio WCAG entre duas cores. Retorna 1..21. */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(hexToRgb(fg))
  const l2 = relativeLuminance(hexToRgb(bg))
  const a = Math.max(l1, l2), b = Math.min(l1, l2)
  return (a + 0.05) / (b + 0.05)
}

export function isLight(hex: string): boolean {
  return relativeLuminance(hexToRgb(hex)) > 0.5
}

/**
 * Escolhe entre branco e preto (ou um tom de cinza) garantindo contraste
 * mínimo. Default 4.5 (texto normal AA).
 * Retorna `#000000` ou `#ffffff` quando passa; senão, escolhe a melhor.
 */
export function getReadableTextColor(bg: string, minRatio = 4.5): string {
  const black = '#000000', white = '#ffffff'
  const rb = contrastRatio(black, bg)
  const rw = contrastRatio(white, bg)
  if (rb >= minRatio && rb >= rw) return black
  if (rw >= minRatio) return white
  return rb >= rw ? black : white
}

/**
 * Ajusta `fg` (em HSL) escurecendo ou clareando até atingir `minRatio`
 * com `bg`. Limita a 20 iterações de 5% em luminance.
 * Decide direção pelo bg: bg claro → escurece fg; bg escuro → clareia.
 */
export function adjustForContrast(fg: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(fg, bg) >= minRatio) return normalizeHex(fg)
  const bgLight = isLight(bg)
  let hsl = hexToHsl(fg)
  for (let i = 0; i < 20; i++) {
    hsl = { ...hsl, l: clamp(hsl.l + (bgLight ? -5 : 5), 0, 100) }
    const candidate = hslToHex(hsl)
    if (contrastRatio(candidate, bg) >= minRatio) return candidate
    if (hsl.l <= 0 || hsl.l >= 100) break
  }
  // Fallback: branco ou preto, o que tiver maior contraste
  return getReadableTextColor(bg, minRatio)
}

export function lightenColor(hex: string, amount: number): string {
  const hsl = hexToHsl(hex)
  return hslToHex({ ...hsl, l: clamp(hsl.l + amount, 0, 100) })
}

export function darkenColor(hex: string, amount: number): string {
  return lightenColor(hex, -amount)
}

/** Mistura linear entre duas cores (RGB). weight 0..1, 0=a, 1=b. */
export function mixColors(a: string, b: string, weight = 0.5): string {
  const w = clamp(weight)
  const ra = hexToRgb(a), rb = hexToRgb(b)
  return rgbToHex({
    r: ra.r * (1 - w) + rb.r * w,
    g: ra.g * (1 - w) + rb.g * w,
    b: ra.b * (1 - w) + rb.b * w,
  })
}

/**
 * Gera shades 50→900 a partir de uma cor base (que ocupa o slot 500).
 * Mantém matiz e saturação, varia luminance. Saída memoizada.
 */
const paletteCache = new Map<string, Record<string, string>>()
export function generatePalette(hex: string): Record<string, string> {
  const key = normalizeHex(hex)
  const cached = paletteCache.get(key)
  if (cached) return cached
  const { h, s } = hexToHsl(key)
  const sat = Math.min(s, 100)
  const palette: Record<string, string> = {
    50: hslToHex({ h, s: sat, l: 95 }),
    100: hslToHex({ h, s: sat, l: 90 }),
    200: hslToHex({ h, s: sat, l: 80 }),
    300: hslToHex({ h, s: sat, l: 70 }),
    400: hslToHex({ h, s: sat, l: 60 }),
    500: key,
    600: hslToHex({ h, s: sat, l: 42 }),
    700: hslToHex({ h, s: sat, l: 34 }),
    800: hslToHex({ h, s: sat, l: 26 }),
    900: hslToHex({ h, s: sat, l: 18 }),
  }
  paletteCache.set(key, palette)
  return palette
}

/** Classifica contraste segundo WCAG. */
export type ContrastLevel = 'AAA' | 'AA' | 'weak' | 'fail'
export function classifyContrast(ratio: number, large = false): ContrastLevel {
  const aaa = large ? 4.5 : 7
  const aa = large ? 3 : 4.5
  if (ratio >= aaa) return 'AAA'
  if (ratio >= aa) return 'AA'
  if (ratio >= 3) return 'weak'
  return 'fail'
}
