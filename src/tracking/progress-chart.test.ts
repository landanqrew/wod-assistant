import { describe, it, expect } from "vitest";
import {
  barChart,
  sparkline,
  timelineChart,
  distributionChart,
} from "./progress-chart.js";

describe("barChart", () => {
  it("renders a basic bar chart", () => {
    const output = barChart("Test Chart", [
      { label: "Squats", value: 10 },
      { label: "Pull-ups", value: 5 },
    ]);
    expect(output).toContain("Test Chart");
    expect(output).toContain("Squats");
    expect(output).toContain("Pull-ups");
    expect(output).toContain("█");
  });

  it("renders empty data message", () => {
    const output = barChart("Empty", []);
    expect(output).toContain("no data");
  });

  it("includes unit suffix", () => {
    const output = barChart(
      "Loads",
      [{ label: "Deadlift", value: 315 }],
      { unit: " lbs" }
    );
    expect(output).toContain("315 lbs");
  });
});

describe("sparkline", () => {
  it("renders a sparkline for values", () => {
    const result = sparkline([1, 3, 5, 7, 9, 7, 5, 3, 1]);
    expect(result.length).toBe(9);
    // Should use block characters
    expect(result).toMatch(/[▁▂▃▄▅▆▇█]/);
  });

  it("returns empty string for empty array", () => {
    expect(sparkline([])).toBe("");
  });

  it("handles constant values", () => {
    const result = sparkline([5, 5, 5, 5]);
    expect(result.length).toBe(4);
  });
});

describe("timelineChart", () => {
  it("renders a timeline chart", () => {
    const output = timelineChart("RPE Over Time", [
      { label: "02-01", value: 7 },
      { label: "02-02", value: 8 },
      { label: "02-03", value: 6 },
      { label: "02-04", value: 9 },
    ]);
    expect(output).toContain("RPE Over Time");
    expect(output).toContain("█");
    expect(output).toContain("02-01");
    expect(output).toContain("02-04");
  });

  it("renders empty data message", () => {
    const output = timelineChart("Empty", []);
    expect(output).toContain("no data");
  });

  it("includes unit label", () => {
    const output = timelineChart(
      "Load",
      [
        { label: "01", value: 100 },
        { label: "02", value: 200 },
      ],
      { unit: "lbs" }
    );
    expect(output).toContain("(lbs)");
  });
});

describe("distributionChart", () => {
  it("renders a distribution chart", () => {
    const output = distributionChart("Modality", {
      weightlifting: 45,
      gymnastics: 35,
      monostructural: 20,
    });
    expect(output).toContain("Modality");
    expect(output).toContain("weightlifting");
    expect(output).toContain("45%");
  });

  it("filters out zero values", () => {
    const output = distributionChart("Test", {
      a: 50,
      b: 0,
      c: 50,
    });
    expect(output).not.toContain("b");
  });

  it("sorts by percentage descending", () => {
    const output = distributionChart("Test", {
      low: 10,
      high: 90,
    });
    const lines = output.split("\n");
    const dataLines = lines.filter((l) => l.includes("%"));
    expect(dataLines[0]).toContain("high");
  });

  it("handles empty data", () => {
    const output = distributionChart("Empty", {});
    expect(output).toContain("no data");
  });
});
