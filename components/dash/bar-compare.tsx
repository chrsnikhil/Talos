"use client"

export interface BarItem {
  label: string
  value: number
  highlight?: boolean
}

interface BarCompareProps {
  items: BarItem[]
  /** Width of the chart area in px (bar track only, label+value are outside) */
  barWidth?: number
  /** Height of each bar row in px */
  rowHeight?: number
  /** Format the value for display (defaults to 2 dp + %) */
  formatValue?: (v: number) => string
}

const GREEN = "#28d391"
const BLUE = "#3b9eff"
const MUTED = "#8b98ab"
const BG = "#0d1319"

export function BarCompare({
  items,
  barWidth = 200,
  rowHeight = 32,
  formatValue = (v) => `${v.toFixed(2)}%`,
}: BarCompareProps) {
  if (!items || items.length === 0) {
    return (
      <p
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: MUTED,
          margin: 0,
        }}
      >
        NO DATA
      </p>
    )
  }

  const max = Math.max(...items.map((i) => i.value), 0)

  const labelColW = 80
  const valueColW = 64
  const barH = 10
  const svgW = labelColW + barWidth + valueColW
  const svgH = items.length * rowHeight

  return (
    <svg
      width={svgW}
      height={svgH}
      aria-label="Bar comparison chart"
      style={{ background: BG, display: "block", fontFamily: "monospace" }}
    >
      {items.map((item, idx) => {
        const y = idx * rowHeight
        const cy = y + rowHeight / 2
        const fillW =
          max > 0 ? Math.max(2, (item.value / max) * barWidth) : 2
        const barColor = item.highlight ? GREEN : BLUE
        const labelColor = item.highlight ? GREEN : MUTED
        const valueColor = item.highlight ? GREEN : "#c4cdd8"

        return (
          <g key={item.label}>
            {/* Label */}
            <text
              x={labelColW - 8}
              y={cy + 4}
              textAnchor="end"
              fill={labelColor}
              fontSize={10}
              letterSpacing={1}
              fontWeight={item.highlight ? 700 : 400}
            >
              {item.label.toUpperCase()}
            </text>

            {/* Bar track */}
            <rect
              x={labelColW}
              y={cy - barH / 2}
              width={barWidth}
              height={barH}
              fill={barColor}
              fillOpacity={0.08}
              rx={2}
            />

            {/* Bar fill */}
            <rect
              x={labelColW}
              y={cy - barH / 2}
              width={fillW}
              height={barH}
              fill={barColor}
              fillOpacity={item.highlight ? 0.85 : 0.55}
              rx={2}
            />

            {/* Value label */}
            <text
              x={labelColW + barWidth + 8}
              y={cy + 4}
              fill={valueColor}
              fontSize={10}
              letterSpacing={0.5}
              fontWeight={item.highlight ? 700 : 400}
            >
              {formatValue(item.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
