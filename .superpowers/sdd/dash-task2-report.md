# Dashboard Task 2 Report — Chart Primitives

## Charting approach

`recharts` 2.15.4 is already in `package.json`, so it was used for `Sparkline` (AreaChart via ResponsiveContainer). `BarCompare` uses pure inline SVG — horizontal bars map naturally to SVG rects and the recharts BarChart would require extra wiring for a horizontal layout with label columns.

## Component APIs

### `Sparkline` (`components/dash/sparkline.tsx`)
```ts
Sparkline({ data: number[], color?: string, width?: number, height?: number })
```
- Renders a recharts `AreaChart` with auto-scaled Y domain, area fill gradient (`color` at 25% → 2% opacity), no axes/gridlines, no animation.
- Empty data → dashed horizontal line (placeholder).
- Single-point data → dashed line + dot.
- Default color: `#28d391` (green).

### `BarCompare` (`components/dash/bar-compare.tsx`)
```ts
BarCompare({ items: BarItem[], barWidth?: number, rowHeight?: number, formatValue?: (v: number) => string })
// BarItem = { label: string, value: number, highlight?: boolean }
```
- Pure SVG, no dependencies.
- Bars scaled proportionally to the max value; each row: label (left), track + fill (center), value (right).
- Highlighted item: `#28d391` (green), others: `#3b9eff` (blue), labels in `#8b98ab` (muted).
- Empty data → "NO DATA" text fallback.
- Default `formatValue`: `v.toFixed(2) + "%"` (suitable for APY display).

## Build result

`pnpm exec tsc --noEmit` — zero errors in `components/dash/`. Pre-existing errors in `components/interests-book.tsx`, `components/site/cta.tsx`, `components/site/footer.tsx`, `components/wallet/vault-panel.tsx`, and `lib/talos/{kai,sevenk}.ts` are unchanged.

`pnpm build` — compiled successfully, all 14 pages generated, no new errors.

## Self-review

- Both components are purely presentational (no data fetching, no side-effects).
- Aesthetic matched: bg `#0d1319`, green `#28d391`, blue `#3b9eff`, muted `#8b98ab`, monospace font in SVG text.
- No new dependencies added. `recharts` was already present.
- Edge cases handled: empty array, single value for Sparkline; empty items for BarCompare.
- Ready to be consumed by Task 4 dashboard panel.
