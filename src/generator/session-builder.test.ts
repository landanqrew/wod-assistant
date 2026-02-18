import { describe, it, expect } from "vitest";
import { buildSession } from "./session-builder.js";
import { createAthlete, Sex } from "../models/athlete.js";
import { EQUIPMENT_PRESETS } from "../models/equipment.js";
import { WorkoutFormat, SessionBlockType } from "../models/workout.js";
import { getBenchmark } from "./benchmark-library.js";

function makeAthlete() {
  return createAthlete("test", "Test", Sex.Male, [
    ...EQUIPMENT_PRESETS.fullGym,
  ]);
}

describe("buildSession", () => {
  it("builds a session with warm-up, WOD, and cool-down", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete);

    expect(result.session.blocks).toHaveLength(3);
    expect(result.session.blocks[0].type).toBe(SessionBlockType.WarmUp);
    expect(result.session.blocks[1].type).toBe(SessionBlockType.Metcon);
    expect(result.session.blocks[2].type).toBe(SessionBlockType.CoolDown);
  });

  it("respects total duration", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete, { totalMinutes: 45 });

    expect(result.session.totalDurationMinutes).toBeLessThanOrEqual(50);
    expect(result.session.totalDurationMinutes).toBeGreaterThan(0);
  });

  it("includes the WOD workout in the metcon block", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete, {
      generateOptions: { format: WorkoutFormat.AMRAP, movementCount: 3 },
    });

    const metcon = result.session.blocks.find(
      (b) => b.type === SessionBlockType.Metcon
    );
    expect(metcon).toBeDefined();
    expect(metcon!.workout).toBeDefined();
    expect(metcon!.workout!.movements.length).toBeGreaterThan(0);
  });

  it("generates warm-up drills based on the WOD", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete);

    expect(result.warmUpDrills.length).toBeGreaterThan(0);
    expect(result.warmUpDrills[0].name).toBe("Easy Jog / Row");
  });

  it("generates cool-down drills", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete);

    expect(result.coolDownDrills.length).toBeGreaterThan(0);
  });

  it("can skip warm-up", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete, { includeWarmUp: false });

    expect(result.session.blocks[0].type).toBe(SessionBlockType.Metcon);
    expect(result.warmUpDrills).toHaveLength(0);
  });

  it("can skip cool-down", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete, { includeCoolDown: false });

    const types = result.session.blocks.map((b) => b.type);
    expect(types).not.toContain(SessionBlockType.CoolDown);
    expect(result.coolDownDrills).toHaveLength(0);
  });

  it("accepts a pre-built benchmark workout", () => {
    const athlete = makeAthlete();
    const fran = getBenchmark("fran")!;
    const result = buildSession(athlete, { workout: fran });

    const metcon = result.session.blocks.find(
      (b) => b.type === SessionBlockType.Metcon
    );
    expect(metcon!.workout!.name).toBe("Fran");
  });

  it("generates a session with a unique ID and today's date", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete);

    expect(result.session.id).toMatch(/^session_/);
    expect(result.session.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("warm-up block has notes with drill details", () => {
    const athlete = makeAthlete();
    const result = buildSession(athlete);

    const warmUp = result.session.blocks.find(
      (b) => b.type === SessionBlockType.WarmUp
    );
    expect(warmUp!.notes).toBeDefined();
    expect(warmUp!.notes!.length).toBeGreaterThan(0);
    expect(warmUp!.notes).toContain("Easy Jog / Row");
  });
});
