/**
 * Gera os ícones PWA com o logo branco centralizado (80% do espaço)
 * sobre fundo #0d0d1a.
 *
 * Usa a API Canvas do Node (via sharp + composição).
 * Dependência: sharp (já pode estar no projeto; se não, instalar temporariamente).
 *
 * Alternativa: usa canvas puro se sharp não disponível.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'kv', 'pwa')

// Cria SVG com ícone branco sobre fundo escuro
function createIconSVG(size) {
  const padding = Math.round(size * 0.1) // 10% padding each side = 80% icon
  const iconSize = size - padding * 2
  // O livro aberto do logo ATA — reproduzido em path SVG
  // Baseado na forma do favicon existente (livro aberto com duas "páginas")
  const pageW = iconSize * 0.42
  const pageH = iconSize * 0.6
  const gap = iconSize * 0.04
  const cx = size / 2
  const cy = size / 2
  const radius = iconSize * 0.08
  const curveDepth = iconSize * 0.06

  const leftX = cx - gap / 2 - pageW
  const rightX = cx + gap / 2
  const topY = cy - pageH / 2
  const bottomY = cy + pageH / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0d0d1a"/>
  <!-- Left page -->
  <path d="
    M${leftX + radius} ${topY}
    H${leftX + pageW}
    V${bottomY - curveDepth}
    Q${leftX + pageW} ${bottomY} ${leftX + pageW - curveDepth} ${bottomY}
    H${leftX + radius}
    Q${leftX} ${bottomY} ${leftX} ${bottomY - radius}
    V${topY + radius}
    Q${leftX} ${topY} ${leftX + radius} ${topY}
    Z" fill="white"/>
  <!-- Right page -->
  <path d="
    M${rightX + curveDepth} ${bottomY}
    Q${rightX} ${bottomY} ${rightX} ${bottomY - curveDepth}
    V${topY}
    H${rightX + pageW - radius}
    Q${rightX + pageW} ${topY} ${rightX + pageW} ${topY + radius}
    V${bottomY - radius}
    Q${rightX + pageW} ${bottomY} ${rightX + pageW - radius} ${bottomY}
    H${rightX + curveDepth}
    Z" fill="white"/>
</svg>`
}

mkdirSync(OUT_DIR, { recursive: true })

const sizes = [
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

// Write SVGs (can be converted to PNG with any tool)
for (const { name, size } of sizes) {
  const svg = createIconSVG(size)
  const svgName = name.replace('.png', '.svg')
  writeFileSync(join(OUT_DIR, svgName), svg)
  console.log(`✓ ${svgName} (${size}x${size})`)
}

// Also write a master 512 SVG for reference
writeFileSync(join(OUT_DIR, 'icon-master.svg'), createIconSVG(512))
console.log('\n✓ SVGs gerados em public/kv/pwa/')
console.log('→ Converta para PNG com: npx sharp-cli ou qualquer editor')
console.log('  Ou use diretamente no manifest como SVG')
