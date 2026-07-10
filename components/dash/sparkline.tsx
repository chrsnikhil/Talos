"use client"

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts"

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({
  data,
  color = "#28d391",
  width,
  height = 48,
}: SparklineProps) {
  // Handle empty or single-point data
  if (!data || data.length === 0) {
    return (
      <svg
        width={width ?? "100%"}
        height={height}
        style={{ display: "block" }}
      >
        <line
          x1="0"
          y1={height / 2}
          x2="100%"
          y2={height / 2}
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
    )
  }

  if (data.length === 1) {
    return (
      <svg
        width={width ?? "100%"}
        height={height}
        style={{ display: "block" }}
      >
        <line
          x1="0"
          y1={height / 2}
          x2="100%"
          y2={height / 2}
          stroke={color}
          strokeOpacity={0.4}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <circle cx="50%" cy={height / 2} r={3} fill={color} />
      </svg>
    )
  }

  const chartData = data.map((v, i) => ({ i, v }))

  const gradientId = `sparkline-grad-${color.replace("#", "")}`

  return (
    <div style={{ width: width ?? "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip
            content={() => null}
            cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
