import { describe, it, expect } from "vitest";
import {
  generateFiveThreeOneDay,
  generateFiveThreeOneWeek,
  generateLinearProgressionDay,
  generateStrongLiftsDay,
} from "./strength.js";
import type { FiveThreeOneConfig } from "./strength.js";
import { SessionBlockType } from "../models/workout.js";

const DEFAULT_531_CONFIG: FiveThreeOneConfig = {
  trainingMax: { squat: 300, bench: 200, deadlift: 400, press: 150 },
  week: 1,
};

describe("5/3/1 strength program", () => {
  it("generates a squat day with 3 working sets", () => {
    const session = generateFiveThreeOneDay("squat", DEFAULT_531_CONFIG);
    const strengthBlock = session.blocks.find(
      (b) => b.type === SessionBlockType.Strength
    );
    expect(strengthBlock).toBeDefined();
    expect(strengthBlock!.workout).toBeDefined();
    expect(strengthBlock!.workout!.movements).toHaveLength(3);
  });

  it("uses correct percentages for week 1 (5s week)", () => {
    const session = generateFiveThreeOneDay("squat", DEFAULT_531_CONFIG);
    const workout = session.blocks[0].workout!;
    // Week 1: 65%, 75%, 85% of TM(300)
    expect(workout.movements[0].load).toBe(195); // 300 * 0.65 = 195
    expect(workout.movements[1].load).toBe(225); // 300 * 0.75 = 225
    expect(workout.movements[2].load).toBe(255); // 300 * 0.85 = 255
  });

  it("uses correct percentages for week 2 (3s week)", () => {
    const config = { ...DEFAULT_531_CONFIG, week: 2 as const };
    const session = generateFiveThreeOneDay("bench", config);
    const workout = session.blocks[0].workout!;
    // Week 2: 70%, 80%, 90% of TM(200)
    expect(workout.movements[0].load).toBe(140);
    expect(workout.movements[1].load).toBe(160);
    expect(workout.movements[2].load).toBe(180);
  });

  it("uses correct percentages for week 3 (5/3/1 week)", () => {
    const config = { ...DEFAULT_531_CONFIG, week: 3 as const };
    const session = generateFiveThreeOneDay("deadlift", config);
    const workout = session.blocks[0].workout!;
    // Week 3: 75%, 85%, 95% of TM(400)
    expect(workout.movements[0].load).toBe(300);
    expect(workout.movements[1].load).toBe(340);
    expect(workout.movements[2].load).toBe(380);
  });

  it("generates deload week with lower percentages", () => {
    const config = { ...DEFAULT_531_CONFIG, week: 4 as const };
    const session = generateFiveThreeOneDay("squat", config);
    const workout = session.blocks[0].workout!;
    // Week 4: 40%, 50%, 60% of TM(300)
    expect(workout.movements[0].load).toBe(120);
    expect(workout.movements[1].load).toBe(150);
    expect(workout.movements[2].load).toBe(180);
  });

  it("includes BBB accessory work by default", () => {
    const session = generateFiveThreeOneDay("squat", DEFAULT_531_CONFIG);
    const accessoryBlocks = session.blocks.filter(
      (b) => b.type === SessionBlockType.Accessory
    );
    expect(accessoryBlocks.length).toBeGreaterThanOrEqual(1);
  });

  it("skips BBB when disabled", () => {
    const config = { ...DEFAULT_531_CONFIG, includeBBB: false };
    const session = generateFiveThreeOneDay("squat", config);
    const accessoryBlocks = session.blocks.filter(
      (b) => b.type === SessionBlockType.Accessory
    );
    expect(accessoryBlocks).toHaveLength(0);
  });

  it("generates a full 4-day week", () => {
    const sessions = generateFiveThreeOneWeek(DEFAULT_531_CONFIG);
    expect(sessions).toHaveLength(4);
  });

  it("rounds weights to nearest 5 lbs", () => {
    const config: FiveThreeOneConfig = {
      trainingMax: { squat: 287, bench: 193, deadlift: 411, press: 137 },
      week: 1,
    };
    const session = generateFiveThreeOneDay("squat", config);
    const workout = session.blocks[0].workout!;
    for (const m of workout.movements) {
      expect(m.load! % 5).toBe(0);
    }
  });
});

describe("Linear Progression", () => {
  it("generates a day with specified lifts", () => {
    const session = generateLinearProgressionDay({
      lifts: [
        { movementId: "back_squat", weight: 225 },
        { movementId: "bench_press", weight: 185 },
      ],
      day: "A",
    });
    const strengthBlocks = session.blocks.filter(
      (b) => b.type === SessionBlockType.Strength
    );
    expect(strengthBlocks).toHaveLength(2);
  });

  it("uses 5x5 by default", () => {
    const session = generateLinearProgressionDay({
      lifts: [{ movementId: "back_squat", weight: 225 }],
      day: "A",
    });
    const block = session.blocks[0];
    expect(block.workout!.rounds).toBe(5);
    expect(block.workout!.movements[0].reps).toBe(5);
  });
});

describe("StrongLifts", () => {
  const weights = { squat: 225, bench: 185, row: 135, press: 115, deadlift: 315 };

  it("Day A has squat, bench, row", () => {
    const session = generateStrongLiftsDay("A", weights);
    const movements = session.blocks
      .filter((b) => b.workout)
      .map((b) => b.workout!.movements[0].movementId);
    expect(movements).toContain("back_squat");
    expect(movements).toContain("bench_press");
    expect(movements).toContain("dumbbell_row");
  });

  it("Day B has squat, press, deadlift", () => {
    const session = generateStrongLiftsDay("B", weights);
    const movements = session.blocks
      .filter((b) => b.workout)
      .map((b) => b.workout!.movements[0].movementId);
    expect(movements).toContain("back_squat");
    expect(movements).toContain("strict_press");
    expect(movements).toContain("deadlift");
  });
});
