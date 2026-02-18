import { describe, it, expect } from "vitest";
import {
  getSplitDays,
  generateSplitDay,
  SPLIT_INFO,
} from "./bodybuilding.js";
import { SessionBlockType } from "../models/workout.js";

describe("Bodybuilding splits", () => {
  it("PPL has 3 days", () => {
    const days = getSplitDays("ppl");
    expect(days).toHaveLength(3);
  });

  it("Upper/Lower has 4 days", () => {
    const days = getSplitDays("upper_lower");
    expect(days).toHaveLength(4);
  });

  it("Full Body has 3 days", () => {
    const days = getSplitDays("full_body");
    expect(days).toHaveLength(3);
  });

  it("PPL day names match push/pull/legs", () => {
    const days = getSplitDays("ppl");
    expect(days[0].name).toBe("Push Day");
    expect(days[1].name).toBe("Pull Day");
    expect(days[2].name).toBe("Leg Day");
  });

  it("each day has exercises with sets and reps", () => {
    const days = getSplitDays("ppl");
    for (const day of days) {
      expect(day.exercises.length).toBeGreaterThan(0);
      for (const ex of day.exercises) {
        expect(ex.sets).toBeGreaterThan(0);
        expect(ex.reps).toBeTruthy();
      }
    }
  });

  it("generates a training session for a split day", () => {
    const session = generateSplitDay("ppl", 0);
    expect(session.id).toMatch(/^session_bb_/);
    expect(session.blocks.length).toBeGreaterThan(0);
    expect(session.totalDurationMinutes).toBeGreaterThan(0);
  });

  it("generated session includes warm-up and cool-down", () => {
    const session = generateSplitDay("upper_lower", 0);
    const types = session.blocks.map((b) => b.type);
    expect(types).toContain(SessionBlockType.WarmUp);
    expect(types).toContain(SessionBlockType.CoolDown);
  });

  it("generated session includes a strength block", () => {
    const session = generateSplitDay("full_body", 0);
    const strengthBlock = session.blocks.find(
      (b) => b.type === SessionBlockType.Strength
    );
    expect(strengthBlock).toBeDefined();
    expect(strengthBlock!.workout).toBeDefined();
    expect(strengthBlock!.workout!.movements.length).toBeGreaterThan(0);
  });

  it("day index wraps around split length", () => {
    const session = generateSplitDay("ppl", 3);
    // Index 3 wraps to 0 (Push Day)
    expect(session.notes).toContain("Push Day");
  });

  it("SPLIT_INFO has all split types", () => {
    expect(SPLIT_INFO.ppl).toBeDefined();
    expect(SPLIT_INFO.upper_lower).toBeDefined();
    expect(SPLIT_INFO.full_body).toBeDefined();
  });

  it("SPLIT_INFO has correct days per week", () => {
    expect(SPLIT_INFO.ppl.daysPerWeek).toBe(6);
    expect(SPLIT_INFO.upper_lower.daysPerWeek).toBe(4);
    expect(SPLIT_INFO.full_body.daysPerWeek).toBe(3);
  });

  it("upper/lower alternates strength and hypertrophy", () => {
    const days = getSplitDays("upper_lower");
    expect(days[0].name).toContain("Strength");
    expect(days[2].name).toContain("Hypertrophy");
  });

  it("each day has an estimated duration", () => {
    for (const split of ["ppl", "upper_lower", "full_body"] as const) {
      const days = getSplitDays(split);
      for (const day of days) {
        expect(day.estimatedDuration).toBeGreaterThan(0);
      }
    }
  });
});
