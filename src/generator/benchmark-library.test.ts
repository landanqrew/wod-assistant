import { describe, it, expect } from "vitest";
import {
  getAllBenchmarks,
  getBenchmark,
  getBenchmarksByCategory,
  searchBenchmarks,
  BENCHMARK_LIBRARY,
} from "./benchmark-library.js";
import { getMovement } from "../movements/library.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";

describe("benchmark library", () => {
  it("contains at least 15 benchmark workouts", () => {
    expect(getAllBenchmarks().length).toBeGreaterThanOrEqual(15);
  });

  it("all benchmarks are marked as isBenchmark", () => {
    for (const bm of BENCHMARK_LIBRARY) {
      expect(bm.isBenchmark).toBe(true);
    }
  });

  it("all benchmark IDs are unique", () => {
    const ids = BENCHMARK_LIBRARY.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all benchmark movement references exist in the movement library", () => {
    for (const bm of BENCHMARK_LIBRARY) {
      for (const p of bm.movements) {
        const movement = getMovement(p.movementId);
        expect(
          movement,
          `Movement "${p.movementId}" in benchmark "${bm.name}" not found in library`
        ).toBeDefined();
      }
    }
  });

  it("looks up Fran by name (case-insensitive)", () => {
    const fran = getBenchmark("Fran");
    expect(fran).toBeDefined();
    expect(fran!.name).toBe("Fran");
    expect(fran!.format).toBe(WorkoutFormat.ForTime);
    expect(fran!.scoreType).toBe(ScoreType.Time);
    expect(fran!.category).toBe("girl");
  });

  it("looks up Murph by lowercase name", () => {
    const murph = getBenchmark("murph");
    expect(murph).toBeDefined();
    expect(murph!.name).toBe("Murph");
    expect(murph!.category).toBe("hero");
  });

  it("looks up benchmark by ID", () => {
    const grace = getBenchmark("benchmark_grace");
    expect(grace).toBeDefined();
    expect(grace!.name).toBe("Grace");
  });

  it("returns undefined for unknown benchmark", () => {
    expect(getBenchmark("nonexistent")).toBeUndefined();
  });

  it("filters by category: girl", () => {
    const girls = getBenchmarksByCategory("girl");
    expect(girls.length).toBeGreaterThan(0);
    for (const bm of girls) {
      expect(bm.category).toBe("girl");
    }
  });

  it("filters by category: hero", () => {
    const heroes = getBenchmarksByCategory("hero");
    expect(heroes.length).toBeGreaterThan(0);
    for (const bm of heroes) {
      expect(bm.category).toBe("hero");
    }
  });

  it("searches benchmarks by name", () => {
    const results = searchBenchmarks("fran");
    expect(results.some((b) => b.name === "Fran")).toBe(true);
  });

  it("searches benchmarks by description content", () => {
    const results = searchBenchmarks("pull-up");
    expect(results.length).toBeGreaterThan(0);
  });

  it("Cindy is a 20-min AMRAP", () => {
    const cindy = getBenchmark("cindy");
    expect(cindy).toBeDefined();
    expect(cindy!.format).toBe(WorkoutFormat.AMRAP);
    expect(cindy!.timeCap).toBe(20);
    expect(cindy!.movements).toHaveLength(3);
  });

  it("DT has 5 rounds", () => {
    const dt = getBenchmark("dt");
    expect(dt).toBeDefined();
    expect(dt!.rounds).toBe(5);
    expect(dt!.movements).toHaveLength(3);
  });
});
