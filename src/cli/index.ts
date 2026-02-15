#!/usr/bin/env node

import { Command } from "commander";
import { generateWorkout } from "../generator/index.js";
import { createAthlete, Sex } from "../models/athlete.js";
import { WorkoutFormat } from "../models/workout.js";
import { EQUIPMENT_PRESETS } from "../models/equipment.js";
import { getAllMovements } from "../movements/library.js";

const program = new Command();

program
  .name("wod")
  .description("WOD Assistant - Multi-purpose fitness programming utility")
  .version("0.1.0");

program
  .command("generate")
  .alias("gen")
  .description("Generate a workout")
  .option(
    "-f, --format <format>",
    "Workout format (amrap, emom, for_time, rounds_for_time, tabata, chipper, ladder, strength)",
    "amrap"
  )
  .option("-m, --movements <count>", "Number of movements", "3")
  .option("-t, --time <minutes>", "Time cap in minutes")
  .option("-r, --rounds <count>", "Number of rounds")
  .option(
    "-e, --equipment <preset>",
    "Equipment preset (full_gym, home_gym, minimal, bodyweight)",
    "full_gym"
  )
  .option("-s, --sex <sex>", "Sex for Rx loads (male, female)", "male")
  .action((opts) => {
    const equipMap: Record<string, Set<any>> = {
      full_gym: EQUIPMENT_PRESETS.fullGym,
      home_gym: EQUIPMENT_PRESETS.homeGym,
      minimal: EQUIPMENT_PRESETS.minimal,
      bodyweight: EQUIPMENT_PRESETS.bodyweight,
    };

    const athlete = createAthlete(
      "cli_user",
      "CLI User",
      opts.sex === "female" ? Sex.Female : Sex.Male,
      [...(equipMap[opts.equipment] ?? EQUIPMENT_PRESETS.fullGym)]
    );

    const format = opts.format as WorkoutFormat;
    const workout = generateWorkout(athlete, {
      format,
      movementCount: parseInt(opts.movements, 10),
      timeCap: opts.time ? parseInt(opts.time, 10) : undefined,
      rounds: opts.rounds ? parseInt(opts.rounds, 10) : undefined,
    });

    console.log("\n" + formatWorkoutDisplay(workout));
  });

program
  .command("movements")
  .alias("list")
  .description("List available movements")
  .option("-m, --modality <modality>", "Filter by modality")
  .action((opts) => {
    let movements = getAllMovements();
    if (opts.modality) {
      movements = movements.filter((m) => m.modality === opts.modality);
    }
    console.log(`\n${movements.length} movements available:\n`);
    for (const m of movements) {
      const equip =
        m.equipment[0] === "none"
          ? "bodyweight"
          : m.equipment.join(", ");
      console.log(
        `  ${m.name.padEnd(25)} ${m.modality.padEnd(18)} ${m.difficulty.padEnd(14)} ${equip}`
      );
    }
    console.log();
  });

function formatWorkoutDisplay(workout: any): string {
  const lines: string[] = [];
  lines.push("═".repeat(50));
  lines.push(`  ${workout.name}`);
  lines.push("═".repeat(50));
  lines.push("");

  if (workout.format === "amrap" && workout.timeCap) {
    lines.push(`  ${workout.timeCap}-Minute AMRAP:`);
  } else if (workout.format === "emom" && workout.emomMinutes) {
    lines.push(
      `  ${workout.emomMinutes}-Minute EMOM (${workout.movements.length} stations):`
    );
  } else if (workout.format === "for_time") {
    lines.push(`  For Time${workout.timeCap ? ` (${workout.timeCap} min cap)` : ""}:`);
  } else if (workout.format === "rounds_for_time" && workout.rounds) {
    lines.push(`  ${workout.rounds} Rounds For Time:`);
  } else if (workout.format === "chipper") {
    lines.push(`  Chipper${workout.timeCap ? ` (${workout.timeCap} min cap)` : ""}:`);
  } else {
    lines.push(`  ${workout.format.toUpperCase()}:`);
  }
  lines.push("");

  for (const p of workout.movements) {
    const parts: string[] = [];
    if (p.reps) parts.push(`${p.reps}`);
    parts.push(p.movement?.name ?? p.movementId);
    if (p.load) parts.push(`(${p.load} lbs)`);
    if (p.distance) parts.push(`${p.distance}m`);
    if (p.calories) parts.push(`${p.calories} cal`);
    if (p.duration) parts.push(`${p.duration}s`);
    lines.push(`  - ${parts.join(" ")}`);
  }

  lines.push("");
  lines.push(`  Score: ${workout.scoreType.replace(/_/g, " ")}`);
  if (workout.estimatedDuration) {
    lines.push(`  Est. Duration: ~${workout.estimatedDuration} min`);
  }
  lines.push("═".repeat(50));
  return lines.join("\n");
}

program.parse();
