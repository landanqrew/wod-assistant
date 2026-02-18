import { describe, it, expect } from "vitest";
import {
  getRunPlan,
  getRunWeek,
  runWorkoutToSession,
  RUN_PLAN_INFO,
} from "./running.js";
import { SessionBlockType } from "../models/workout.js";

describe("Running plans", () => {
  it("Couch to 5K has 8 weeks", () => {
    const plan = getRunPlan("couch_to_5k");
    expect(plan).toHaveLength(8);
  });

  it("5K Improvement has 4 weeks", () => {
    const plan = getRunPlan("5k_improvement");
    expect(plan).toHaveLength(4);
  });

  it("each week has 7 days", () => {
    const plan = getRunPlan("couch_to_5k");
    for (const week of plan) {
      expect(week.days).toHaveLength(7);
    }
  });

  it("retrieves a specific week", () => {
    const week = getRunWeek("couch_to_5k", 1);
    expect(week).toBeDefined();
    expect(week!.weekNumber).toBe(1);
  });

  it("returns undefined for invalid week", () => {
    expect(getRunWeek("couch_to_5k", 99)).toBeUndefined();
  });

  it("C25K week 1 has interval workouts", () => {
    const week = getRunWeek("couch_to_5k", 1)!;
    const intervals = week.days.filter((d) => d.type === "interval");
    expect(intervals.length).toBeGreaterThan(0);
  });

  it("C25K week 8 ends with a 5K attempt", () => {
    const week = getRunWeek("couch_to_5k", 8)!;
    const lastRun = week.days.find((d) => d.type === "long");
    expect(lastRun).toBeDefined();
    expect(lastRun!.distanceKm).toBe(5);
  });

  it("converts a run workout to a training session", () => {
    const week = getRunWeek("couch_to_5k", 1)!;
    const session = runWorkoutToSession(week.days[0], 1, 0);
    expect(session.id).toMatch(/^session_run_/);
    expect(session.blocks.length).toBeGreaterThan(0);
  });

  it("rest days have zero duration", () => {
    const week = getRunWeek("couch_to_5k", 1)!;
    const restDay = week.days.find((d) => d.type === "rest")!;
    const session = runWorkoutToSession(restDay, 1, 1);
    expect(session.totalDurationMinutes).toBe(0);
  });

  it("non-rest run days include warm-up and cool-down", () => {
    const week = getRunWeek("couch_to_5k", 1)!;
    const runDay = week.days.find((d) => d.type !== "rest")!;
    const session = runWorkoutToSession(runDay, 1, 0);
    const types = session.blocks.map((b) => b.type);
    expect(types).toContain(SessionBlockType.WarmUp);
    expect(types).toContain(SessionBlockType.CoolDown);
  });

  it("plan info has all plan types", () => {
    expect(RUN_PLAN_INFO.couch_to_5k).toBeDefined();
    expect(RUN_PLAN_INFO["5k_improvement"]).toBeDefined();
  });

  it("5K improvement has tempo runs", () => {
    const plan = getRunPlan("5k_improvement");
    const hasTempos = plan.some((w) =>
      w.days.some((d) => d.type === "tempo")
    );
    expect(hasTempos).toBe(true);
  });
});
