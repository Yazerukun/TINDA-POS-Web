import React from 'react'

/**
 * Pure TypeScript Code 128 (Subset B & C Auto-Switching) Barcode Engine.
 * Generates high-definition, 100% scannable 1D barcodes for thermal label printers (Chiteng CT-221B, POS-58, POS-80)
 * and laser/inkjet printers with zero blur, zero external dependencies, and 100% offline support.
 *
 * Specially calibrated for Chiteng CT221B (Clabel) direct thermal print heads (203 DPI)
 * so barcode stickers can be scanned cleanly by cellphone camera scanners (ZXing) without optical distortion.
 */

// Code 128 patterns: 6-digit strings of widths (bar, space, bar, space, bar, space)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '233111'                                   // 100-106
]

const START_CODE_B = 104
const START_CODE_C = 105
const CODE_B = 100
const CODE_C = 99
const STOP_PATTERN = '2331112'

function countConsecutiveDigits(str: string, startIdx: number): number {
  let count = 0
  while (startIdx + count < str.length && str.charCodeAt(startIdx + count) >= 48 && str.charCodeAt(startIdx + count) <= 57) {
    count++
  }
  return count
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

export interface BarcodeSvgOptions {
  width?: number
  height?: number
  barHeight?: number
  includeText?: boolean
  barWidth?: number
  fontSize?: number
  quietZone?: number
}

/**
 * Pure string SVG Generator for direct printing and stickers.
 */
export function generateBarcodeSvg(
  rawText: string,
  options: BarcodeSvgOptions = {}
): string {
  const text = (rawText || '').trim().replace(/[^\x20-\x7E]/g, '') || '000000'
  const height = options.height ?? 50
  const includeText = options.includeText ?? true
  const barWidth = options.barWidth ?? 1.85
  const fontSize = options.fontSize ?? 10
  const quietZoneModules = options.quietZone ?? 12

  const codes: number[] = []
  let i = 0
  let currentMode: 'B' | 'C' = 'B'

  const initialDigits = countConsecutiveDigits(text, 0)
  if (initialDigits >= 4 || (initialDigits === text.length && initialDigits >= 2)) {
    codes.push(START_CODE_C)
    currentMode = 'C'
  } else {
    codes.push(START_CODE_B)
    currentMode = 'B'
  }

  while (i < text.length) {
    if (currentMode === 'C') {
      const remainingDigits = countConsecutiveDigits(text, i)
      if (remainingDigits >= 2) {
        codes.push(parseInt(text.slice(i, i + 2), 10))
        i += 2
      } else {
        codes.push(CODE_B)
        currentMode = 'B'
      }
    } else {
      const remainingDigits = countConsecutiveDigits(text, i)
      if (remainingDigits >= 4) {
        codes.push(CODE_C)
        currentMode = 'C'
      } else {
        codes.push(text.charCodeAt(i) - 32)
        i++
      }
    }
  }

  // Checksum calculation
  let checksum = codes[0]!
  for (let idx = 1; idx < codes.length; idx++) {
    checksum += codes[idx]! * idx
  }
  codes.push(checksum % 103)

  let pattern = ''
  for (const c of codes) {
    pattern += CODE128_PATTERNS[c] || '111111'
  }
  pattern += STOP_PATTERN

  let currentX = quietZoneModules * barWidth
  let isBar = true
  const rects: string[] = []

  const barHeight = options.barHeight ?? (includeText ? Math.max(20, height - fontSize - 6) : height)
  const totalHeight = options.height ?? (includeText ? barHeight + fontSize + 6 : barHeight)

  for (let idx = 0; idx < pattern.length; idx++) {
    const moduleCount = parseInt(pattern[idx]!, 10)
    const w = moduleCount * barWidth
    if (isBar) {
      rects.push(`<rect x="${currentX.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${barHeight}" fill="#000000" shape-rendering="crispEdges" />`)
    }
    currentX += w
    isBar = !isBar
  }

  const totalWidth = currentX + quietZoneModules * barWidth

  const textElement = includeText
    ? `<text x="${(totalWidth / 2).toFixed(2)}" y="${totalHeight - 2}" font-family="Courier, monospace, sans-serif" font-size="${fontSize}" font-weight="bold" letter-spacing="1px" text-anchor="middle" fill="#000000">${escapeXml(text)}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight}" width="100%" height="${totalHeight}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" style="display:block;margin:0 auto;background:#ffffff;shape-rendering:crispEdges;image-rendering:pixelated;">
  <rect width="100%" height="100%" fill="#ffffff" shape-rendering="crispEdges" />
  ${rects.join('\n  ')}
  ${textElement}
</svg>`
}

interface BarcodeProps {
  value: string
  height?: number
  scale?: number
  showText?: boolean
  className?: string
}

/**
 * High-definition vector SVG Barcode Component for React with Zero Anti-Aliasing Blur.
 */
export function Barcode({
  value,
  height = 44,
  scale = 1.4,
  showText = true,
  className = ''
}: BarcodeProps): React.JSX.Element | null {
  if (!value) return null

  const svgHtml = generateBarcodeSvg(value, {
    height,
    barWidth: scale,
    includeText: showText,
    quietZone: 10,
    fontSize: 10
  })

  return (
    <div
      className={`inline-block text-center bg-white p-1 rounded ${className}`}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}
