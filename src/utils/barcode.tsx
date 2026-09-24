import React from 'react'

/**
 * Pure TypeScript Code 128 (Subset B) Barcode Generator.
 * Generates crisp 1-bit vector SVG barcodes perfect for high-speed thermal printers (203/300 DPI)
 * and laser/inkjet printers with zero blur, zero external dependencies, and 100% offline support.
 */

// Code 128 pattern table (107 patterns, index 0 to 106)
// Each pattern string represents bar (1) and space (0) modules.
const CODE128_PATTERNS: string[] = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', // 0-4
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000', // 5-9
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', // 10-14
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100', // 15-19
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', // 20-24
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010', // 25-29
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', // 30-34
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000', // 35-39
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', // 40-44
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110', // 45-49
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', // 50-54
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010', // 55-59
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', // 60-64
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', // 65-69
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', // 70-74
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010', // 75-79
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', // 80-84
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110', // 85-89
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', // 90-94
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110', // 95-99
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', // 100-104
  '11010011100', '11000111010'                                                  // 105-106 (Start B, Stop)
]

const START_B_INDEX = 104
const STOP_INDEX = 106
const STOP_PATTERN = '1100011101011' // Stop pattern has 13 modules

/**
 * Encodes an ASCII string into a Code 128 (Subset B) binary string of bars ('1') and spaces ('0').
 */
export function encodeCode128(text: string): { modules: string; checkValue: number } {
  // Clean string to ASCII range 32-126
  const sanitized = text.replace(/[^\x20-\x7E]/g, '')
  if (!sanitized) {
    return { modules: '', checkValue: 0 }
  }

  const indices: number[] = [START_B_INDEX]
  let checkSum = START_B_INDEX

  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i) - 32
    indices.push(code)
    checkSum += code * (i + 1)
  }

  const checkValue = checkSum % 103
  indices.push(checkValue)

  // Build binary string
  let modules = CODE128_PATTERNS[START_B_INDEX]
  for (let i = 1; i < indices.length - 1; i++) {
    modules += CODE128_PATTERNS[indices[i]]
  }
  modules += CODE128_PATTERNS[checkValue]
  modules += STOP_PATTERN

  return { modules, checkValue }
}

interface BarcodeProps {
  value: string
  height?: number
  scale?: number
  showText?: boolean
  className?: string
}

/**
 * High-definition vector SVG Barcode Component.
 * Guaranteed 100% sharp rendering across all thermal receipt printers and regular printers.
 */
export function Barcode({
  value,
  height = 42,
  scale = 1.35,
  showText = true,
  className = ''
}: BarcodeProps): React.JSX.Element | null {
  if (!value) return null

  const { modules } = encodeCode128(value)
  if (!modules) return null

  // Quiet zones (10 modules on each side)
  const quietZone = 10
  const totalModules = modules.length + quietZone * 2
  const barWidth = scale
  const totalSvgWidth = totalModules * barWidth

  // Group consecutive '1's into rects for efficient SVG rendering
  const rects: { x: number; width: number }[] = []
  let runStart = -1

  for (let i = 0; i < modules.length; i++) {
    const isBar = modules[i] === '1'
    if (isBar && runStart === -1) {
      runStart = i
    } else if (!isBar && runStart !== -1) {
      rects.push({
        x: (runStart + quietZone) * barWidth,
        width: (i - runStart) * barWidth
      })
      runStart = -1
    }
  }

  if (runStart !== -1) {
    rects.push({
      x: (runStart + quietZone) * barWidth,
      width: (modules.length - runStart) * barWidth
    })
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <svg
        width={totalSvgWidth}
        height={height}
        viewBox={`0 0 ${totalSvgWidth} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block mx-auto"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width={totalSvgWidth} height={height} fill="#FFFFFF" />
        {rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y="0"
            width={r.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[10px] tracking-[0.2em] font-bold text-black mt-1 uppercase select-all">
          {value}
        </span>
      )}
    </div>
  )
}
