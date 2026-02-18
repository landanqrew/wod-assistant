/**
 * A data point for charting.
 */
export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Render a horizontal bar chart in the terminal.
 */
export function barChart(
  title: string,
  data: ChartPoint[],
  opts: { width?: number; unit?: string; maxLabelWidth?: number } = {}
): string {
  if (data.length === 0) return `  ${title}\n  (no data)`;

  const width = opts.width ?? 30;
  const unit = opts.unit ?? "";
  const maxLabelWidth = opts.maxLabelWidth ?? 16;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const lines: string[] = [];

  lines.push(`  ${title}`);
  lines.push(`  ${"─".repeat(maxLabelWidth + width + 12)}`);

  for (const point of data) {
    const barLen = Math.round((point.value / maxValue) * width);
    const bar = "█".repeat(barLen) + "░".repeat(width - barLen);
    const label = point.label.slice(0, maxLabelWidth).padEnd(maxLabelWidth);
    const valStr = unit ? `${point.value}${unit}` : `${point.value}`;
    lines.push(`  ${label} ${bar} ${valStr}`);
  }

  return lines.join("\n");
}

/**
 * Render a sparkline-style trend chart for a series of values.
 * Uses Unicode block characters for a compact visual.
 */
export function sparkline(values: number[]): string {
  if (values.length === 0) return "";

  const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((v) => {
      const idx = Math.min(
        Math.floor(((v - min) / range) * (blocks.length - 1)),
        blocks.length - 1
      );
      return blocks[idx];
    })
    .join("");
}

/**
 * Render a timeline chart showing RPE or load values over time.
 */
export function timelineChart(
  title: string,
  data: { label: string; value: number }[],
  opts: { height?: number; unit?: string; width?: number } = {}
): string {
  if (data.length === 0) return `  ${title}\n  (no data)`;

  const height = opts.height ?? 8;
  const unit = opts.unit ?? "";

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const lines: string[] = [];
  lines.push(`  ${title}`);

  // Build the chart row by row, top to bottom
  for (let row = height; row >= 1; row--) {
    const threshold = minValue + (row / height) * range;
    const yLabel = row === height
      ? maxValue.toFixed(1).padStart(5)
      : row === 1
        ? minValue.toFixed(1).padStart(5)
        : "     ";

    let rowStr = `  ${yLabel} │`;
    for (const point of data) {
      const normalizedHeight = ((point.value - minValue) / range) * height;
      if (normalizedHeight >= row) {
        rowStr += "█";
      } else if (normalizedHeight >= row - 0.5) {
        rowStr += "▄";
      } else {
        rowStr += " ";
      }
    }
    lines.push(rowStr);
  }

  // X-axis
  lines.push(`  ${"     "}└${"─".repeat(data.length)}`);

  // Date labels (first and last)
  if (data.length >= 2) {
    const first = data[0].label;
    const last = data[data.length - 1].label;
    const gap = Math.max(0, data.length - first.length - last.length);
    lines.push(`  ${"      "}${first}${" ".repeat(gap)}${last}`);
  }

  if (unit) {
    lines.push(`  (${unit})`);
  }

  return lines.join("\n");
}

/**
 * Render a simple distribution chart (like a pie chart as text).
 */
export function distributionChart(
  title: string,
  data: Record<string, number>,
  opts: { width?: number } = {}
): string {
  const width = opts.width ?? 30;
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return `  ${title}\n  (no data)`;

  const lines: string[] = [];
  lines.push(`  ${title}`);
  lines.push(`  ${"─".repeat(width + 25)}`);

  for (const [label, pct] of entries) {
    const barLen = Math.round((pct / 100) * width);
    const bar = "█".repeat(barLen) + "░".repeat(width - barLen);
    const name = label.replace(/_/g, " ").padEnd(16);
    lines.push(`  ${name} ${bar} ${pct}%`);
  }

  return lines.join("\n");
}
