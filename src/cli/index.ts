#!/usr/bin/env node

import { Command } from "commander";
import { generateWorkout } from "../generator/index.js";
import {
  getAllBenchmarks,
  getBenchmark,
  getBenchmarksByCategory,
} from "../generator/benchmark-library.js";
import { buildSession } from "../generator/session-builder.js";
import { createAthlete, Sex } from "../models/athlete.js";
import type { Workout } from "../models/workout.js";
import { WorkoutFormat, ScoreType } from "../models/workout.js";
import { EQUIPMENT_PRESETS } from "../models/equipment.js";
import { DifficultyTier } from "../models/movement.js";
import { getAllMovements, getMovement } from "../movements/library.js";
import { scaleWorkoutToTier } from "../scaling/scaling-tiers.js";
import { getDb } from "../db/connection.js";
import { AthleteRepository } from "../db/athlete-repository.js";
import { WorkoutRepository } from "../db/workout-repository.js";
import { ResultRepository } from "../db/result-repository.js";
import { PRTracker } from "../tracking/pr-tracker.js";
import { VolumeTracker } from "../tracking/volume-tracker.js";
import { BiasDetector } from "../tracking/bias-detector.js";
import { FatigueTracker } from "../tracking/fatigue-tracker.js";
import {
  barChart,
  sparkline,
  distributionChart,
  timelineChart,
} from "../tracking/progress-chart.js";
import { createWorkoutResult } from "../models/workout-result.js";

const program = new Command();

program
  .name("wod")
  .description("WOD Assistant - Multi-purpose fitness programming utility")
  .version("0.1.0");

/**
 * Resolve the current athlete. Uses the saved profile if one exists,
 * otherwise falls back to a transient in-memory athlete.
 */
function resolveAthlete(opts: { sex?: string; equipment?: string }) {
  const db = getDb();
  const athleteRepo = new AthleteRepository(db);
  const saved = athleteRepo.getDefault();

  if (saved) return saved;

  const equipMap: Record<string, Set<any>> = {
    full_gym: EQUIPMENT_PRESETS.fullGym,
    home_gym: EQUIPMENT_PRESETS.homeGym,
    minimal: EQUIPMENT_PRESETS.minimal,
    bodyweight: EQUIPMENT_PRESETS.bodyweight,
  };

  return createAthlete(
    "cli_user",
    "CLI User",
    opts.sex === "female" ? Sex.Female : Sex.Male,
    [...(equipMap[opts.equipment ?? "full_gym"] ?? EQUIPMENT_PRESETS.fullGym)]
  );
}

// ─── ATHLETE ──────────────────────────────────────────────────────

const athlete = program
  .command("athlete")
  .description("Manage your athlete profile");

athlete
  .command("create")
  .description("Create or update your athlete profile")
  .requiredOption("-n, --name <name>", "Your name")
  .option("-s, --sex <sex>", "Sex (male, female)", "male")
  .option(
    "-e, --equipment <preset>",
    "Equipment preset (full_gym, home_gym, minimal, bodyweight)",
    "full_gym"
  )
  .option("-d, --duration <minutes>", "Preferred workout duration in minutes")
  .action((opts) => {
    const db = getDb();
    const repo = new AthleteRepository(db);

    const equipMap: Record<string, Set<any>> = {
      full_gym: EQUIPMENT_PRESETS.fullGym,
      home_gym: EQUIPMENT_PRESETS.homeGym,
      minimal: EQUIPMENT_PRESETS.minimal,
      bodyweight: EQUIPMENT_PRESETS.bodyweight,
    };

    const id = opts.name.toLowerCase().replace(/\s+/g, "_");
    const a = createAthlete(
      id,
      opts.name,
      opts.sex === "female" ? Sex.Female : Sex.Male,
      [...(equipMap[opts.equipment] ?? EQUIPMENT_PRESETS.fullGym)]
    );
    if (opts.duration) {
      a.preferredDuration = parseInt(opts.duration, 10);
    }

    repo.save(a);
    console.log(`\nAthlete profile saved: ${a.name} (${a.id})`);
    console.log(`  Sex: ${a.sex}`);
    console.log(`  Equipment: ${opts.equipment}`);
    if (a.preferredDuration) {
      console.log(`  Preferred duration: ${a.preferredDuration} min`);
    }
    console.log();
  });

athlete
  .command("show")
  .description("Show your athlete profile")
  .action(() => {
    const db = getDb();
    const repo = new AthleteRepository(db);
    const resultRepo = new ResultRepository(db);
    const a = repo.getDefault();

    if (!a) {
      console.log("\nNo athlete profile found. Create one with:");
      console.log('  wod athlete create -n "Your Name"\n');
      return;
    }

    const totalWorkouts = resultRepo.countByAthlete(a.id);

    console.log("\n" + "═".repeat(40));
    console.log(`  ${a.name}`);
    console.log("═".repeat(40));
    console.log(`  ID: ${a.id}`);
    console.log(`  Sex: ${a.sex}`);
    console.log(`  Equipment: ${[...a.equipment].join(", ") || "none"}`);
    if (a.preferredDuration) {
      console.log(`  Preferred duration: ${a.preferredDuration} min`);
    }
    console.log(`  Total workouts logged: ${totalWorkouts}`);
    console.log("═".repeat(40) + "\n");
  });

// ─── GENERATE ─────────────────────────────────────────────────────

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
  .option(
    "-b, --benchmark <name>",
    "Use a named benchmark WOD (e.g., fran, grace, murph)"
  )
  .action((opts) => {
    const db = getDb();
    const workoutRepo = new WorkoutRepository(db);

    let workout: Workout;

    if (opts.benchmark) {
      const bm = getBenchmark(opts.benchmark);
      if (!bm) {
        console.error(`\nBenchmark not found: "${opts.benchmark}"`);
        console.error("Run `wod benchmark list` to see available benchmarks.\n");
        process.exit(1);
      }
      // Give it a unique ID so it can be saved / logged
      workout = { ...bm, id: `wod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    } else {
      const a = resolveAthlete(opts);
      const format = opts.format as WorkoutFormat;
      workout = generateWorkout(a, {
        format,
        movementCount: parseInt(opts.movements, 10),
        timeCap: opts.time ? parseInt(opts.time, 10) : undefined,
        rounds: opts.rounds ? parseInt(opts.rounds, 10) : undefined,
      });
    }

    // Save workout to DB so it can be referenced by `wod log`
    workoutRepo.save(workout);

    console.log("\n" + formatWorkoutDisplay(workout));
    console.log(`  Workout ID: ${workout.id}`);
    console.log(`  Log your result: wod log -w ${workout.id}\n`);
  });

// ─── MOVEMENTS ────────────────────────────────────────────────────

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

// ─── LOG ──────────────────────────────────────────────────────────

program
  .command("log")
  .description("Log a workout result")
  .requiredOption("-w, --workout <id>", "Workout ID (from `wod generate`)")
  .option("--time <seconds>", "Time in seconds (for ForTime/RoundsForTime)")
  .option("--rounds <count>", "Rounds completed (for AMRAP)")
  .option("--reps <count>", "Partial reps / total reps")
  .option("--load <lbs>", "Peak load in lbs (for Strength)")
  .option("--calories <cal>", "Total calories")
  .option("--distance <meters>", "Total distance in meters")
  .option("--rpe <value>", "Rate of perceived exertion (1-10)")
  .option("--rx", "Workout completed as prescribed", false)
  .option("--notes <text>", "Notes about the workout")
  .action((opts) => {
    const db = getDb();
    const workoutRepo = new WorkoutRepository(db);
    const resultRepo = new ResultRepository(db);
    const prTracker = new PRTracker(db);

    const workout = workoutRepo.getById(opts.workout);
    if (!workout) {
      console.error(`\nWorkout not found: ${opts.workout}`);
      console.error("Run `wod generate` first to create a workout.\n");
      process.exit(1);
    }

    const a = resolveAthlete({});
    const result = createWorkoutResult(
      a.id,
      workout.id,
      workout.scoreType,
      opts.rx ?? false
    );

    // Populate score fields based on what the user provided
    if (opts.time) result.timeSeconds = parseFloat(opts.time);
    if (opts.rounds) result.roundsCompleted = parseInt(opts.rounds, 10);
    if (opts.reps) result.partialReps = parseInt(opts.reps, 10);
    if (opts.load) result.peakLoad = parseFloat(opts.load);
    if (opts.calories) result.totalCalories = parseFloat(opts.calories);
    if (opts.distance) result.totalDistance = parseFloat(opts.distance);
    if (opts.rpe) result.rpe = parseFloat(opts.rpe);
    if (opts.notes) result.notes = opts.notes;

    // Build movement results from workout prescription
    result.movementResults = workout.movements.map((m) => ({
      movementId: m.movementId,
      load: opts.load ? parseFloat(opts.load) : m.load,
      reps: m.reps,
      rx: opts.rx ?? false,
    }));

    resultRepo.save(result);

    console.log("\n" + "═".repeat(50));
    console.log("  Result Logged!");
    console.log("═".repeat(50));
    console.log(`  Workout: ${workout.name}`);
    console.log(`  Date: ${new Date(result.performedAt).toLocaleDateString()}`);

    if (result.timeSeconds !== undefined) {
      const mins = Math.floor(result.timeSeconds / 60);
      const secs = Math.round(result.timeSeconds % 60);
      console.log(`  Time: ${mins}:${secs.toString().padStart(2, "0")}`);
    }
    if (result.roundsCompleted !== undefined) {
      const partial = result.partialReps ? ` + ${result.partialReps} reps` : "";
      console.log(`  Score: ${result.roundsCompleted} rounds${partial}`);
    }
    if (result.peakLoad !== undefined) {
      console.log(`  Peak Load: ${result.peakLoad} lbs`);
    }
    if (result.rpe !== undefined) {
      console.log(`  RPE: ${result.rpe}/10`);
    }
    if (result.rx) {
      console.log("  Rx: Yes");
    }

    // Detect PRs
    const newPRs = prTracker.detectAndSavePRs(result);
    if (newPRs.length > 0) {
      console.log("");
      console.log("  *** NEW PERSONAL RECORDS ***");
      for (const pr of newPRs) {
        const name =
          pr.referenceType === "movement"
            ? getMovement(pr.referenceId)?.name ?? pr.referenceId
            : workout.name;
        const improvement =
          pr.previousValue !== undefined
            ? ` (prev: ${formatPRValue(pr.previousValue, pr.unit)})`
            : "";
        console.log(
          `  PR: ${name} - ${pr.category}: ${formatPRValue(pr.value, pr.unit)}${improvement}`
        );
      }
    }

    console.log("═".repeat(50) + "\n");
  });

// ─── HISTORY ──────────────────────────────────────────────────────

program
  .command("history")
  .description("View past workout results")
  .option("-n, --limit <count>", "Number of results to show", "10")
  .action((opts) => {
    const db = getDb();
    const resultRepo = new ResultRepository(db);
    const workoutRepo = new WorkoutRepository(db);
    const a = resolveAthlete({});

    const limit = parseInt(opts.limit, 10);
    const results = resultRepo.getByAthlete(a.id, limit);

    if (results.length === 0) {
      console.log("\nNo workout results found. Log one with `wod log`.\n");
      return;
    }

    console.log(`\nLast ${results.length} workout${results.length > 1 ? "s" : ""}:\n`);
    console.log(
      "  " +
        "Date".padEnd(12) +
        "Workout".padEnd(30) +
        "Score".padEnd(20) +
        "Rx"
    );
    console.log("  " + "-".repeat(64));

    for (const r of results) {
      const workout = workoutRepo.getById(r.workoutId);
      const name = workout
        ? workout.name.slice(0, 28)
        : r.workoutId.slice(0, 28);
      const date = new Date(r.performedAt).toLocaleDateString();
      const score = formatScore(r);
      const rx = r.rx ? "Rx" : "";

      console.log(
        `  ${date.padEnd(12)}${name.padEnd(30)}${score.padEnd(20)}${rx}`
      );
    }
    console.log();
  });

// ─── PRS ──────────────────────────────────────────────────────────

program
  .command("prs")
  .description("View personal records")
  .option("-m, --movement <id>", "Filter by movement ID")
  .action((opts) => {
    const db = getDb();
    const prTracker = new PRTracker(db);
    const a = resolveAthlete({});

    let prs;
    if (opts.movement) {
      prs = prTracker.getMovementPRs(a.id, opts.movement);
    } else {
      prs = prTracker.getAllPRs(a.id);
    }

    if (prs.length === 0) {
      console.log("\nNo personal records yet. Log workouts to start tracking PRs.\n");
      return;
    }

    // Group by reference
    const grouped = new Map<string, typeof prs>();
    for (const pr of prs) {
      const key = `${pr.referenceType}:${pr.referenceId}`;
      const group = grouped.get(key) ?? [];
      group.push(pr);
      grouped.set(key, group);
    }

    console.log("\n" + "═".repeat(50));
    console.log("  Personal Records");
    console.log("═".repeat(50));

    const workoutRepo = new WorkoutRepository(db);

    for (const [key, records] of grouped) {
      const [type, refId] = key.split(":");
      let name: string;
      if (type === "movement") {
        name = getMovement(refId)?.name ?? refId;
      } else {
        const w = workoutRepo.getById(refId);
        name = w?.name ?? refId;
      }

      console.log(`\n  ${name} (${type}):`);
      for (const pr of records) {
        const date = new Date(pr.achievedAt).toLocaleDateString();
        console.log(
          `    ${pr.category.padEnd(16)} ${formatPRValue(pr.value, pr.unit).padEnd(14)} ${date}`
        );
      }
    }

    console.log("\n" + "═".repeat(50) + "\n");
  });

// ─── VOLUME ───────────────────────────────────────────────────────

program
  .command("volume")
  .alias("vol")
  .description("View training volume summary")
  .option("-p, --period <period>", "Period: week or month", "week")
  .action((opts) => {
    const db = getDb();
    const volumeTracker = new VolumeTracker(db);
    const a = resolveAthlete({});

    const summary =
      opts.period === "month"
        ? volumeTracker.monthSummary(a.id)
        : volumeTracker.weekSummary(a.id);

    const periodLabel = opts.period === "month" ? "30-Day" : "7-Day";

    console.log("\n" + "═".repeat(50));
    console.log(`  ${periodLabel} Volume Summary`);
    console.log("═".repeat(50));
    console.log(`  Total Workouts: ${summary.totalWorkouts}`);
    console.log(`  Rx Workouts: ${summary.rxWorkouts}`);
    console.log(
      `  Total Volume: ${summary.totalVolumeLbs.toLocaleString()} lbs`
    );
    if (summary.averageRpe !== null) {
      console.log(`  Average RPE: ${summary.averageRpe}/10`);
    }

    if (summary.movementBreakdown.length > 0) {
      console.log("\n  Top Movements:");
      for (const mv of summary.movementBreakdown.slice(0, 8)) {
        const name = getMovement(mv.movementId)?.name ?? mv.movementId;
        const loadStr =
          mv.maxLoad > 0 ? ` (max: ${mv.maxLoad} lbs)` : "";
        console.log(
          `    ${name.padEnd(25)} ${String(mv.totalReps).padEnd(6)} reps${loadStr}`
        );
      }
    }

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hasActivity = summary.dayDistribution.some((d) => d > 0);
    if (hasActivity) {
      console.log("\n  Training Days:");
      console.log(
        "    " +
          days.map((d, i) => `${d}: ${summary.dayDistribution[i]}`).join("  ")
      );
    }

    console.log("\n" + "═".repeat(50) + "\n");
  });

// ─── SCALE ────────────────────────────────────────────────────────

program
  .command("scale")
  .description("Scale a workout to a different difficulty tier")
  .requiredOption("-w, --workout <id>", "Workout ID")
  .option(
    "-t, --tier <tier>",
    "Target tier (beginner, intermediate, advanced, rx, rx_plus)",
    "intermediate"
  )
  .action((opts) => {
    const db = getDb();
    const workoutRepo = new WorkoutRepository(db);
    const a = resolveAthlete({});

    const workout = workoutRepo.getById(opts.workout);
    if (!workout) {
      console.error(`\nWorkout not found: ${opts.workout}`);
      console.error("Run `wod generate` first to create a workout.\n");
      process.exit(1);
    }

    const tierMap: Record<string, DifficultyTier> = {
      beginner: DifficultyTier.Beginner,
      intermediate: DifficultyTier.Intermediate,
      advanced: DifficultyTier.Advanced,
      rx: DifficultyTier.Rx,
      rx_plus: DifficultyTier.RxPlus,
    };

    const tier = tierMap[opts.tier];
    if (!tier) {
      console.error(`\nUnknown tier: ${opts.tier}`);
      console.error(
        "Valid tiers: beginner, intermediate, advanced, rx, rx_plus\n"
      );
      process.exit(1);
    }

    const scaled = scaleWorkoutToTier(workout, tier, a.equipment);

    console.log("\n" + formatWorkoutDisplay(scaled.workout));

    if (scaled.scalingNotes.length > 0) {
      console.log("  Scaling Notes:");
      for (const note of scaled.scalingNotes) {
        for (const change of note.changes) {
          if (change !== "kept") {
            console.log(`    ${note.originalName}: ${change}`);
          }
        }
      }
    }

    console.log();
  });

// ─── BENCHMARK ───────────────────────────────────────────────────

const benchmarkCmd = program
  .command("benchmark")
  .alias("bm")
  .description("Browse and use benchmark workouts (The Girls, Hero WODs, etc.)");

benchmarkCmd
  .command("list")
  .description("List all benchmark workouts")
  .option(
    "-c, --category <cat>",
    "Filter by category (girl, hero, open)"
  )
  .action((opts) => {
    const benchmarks = opts.category
      ? getBenchmarksByCategory(opts.category)
      : getAllBenchmarks();

    if (benchmarks.length === 0) {
      console.log("\nNo benchmarks found.\n");
      return;
    }

    console.log(`\n${benchmarks.length} benchmark workouts:\n`);
    console.log(
      "  " +
        "Name".padEnd(20) +
        "Category".padEnd(10) +
        "Format".padEnd(18) +
        "Est. Duration"
    );
    console.log("  " + "-".repeat(60));

    for (const bm of benchmarks) {
      const dur = bm.estimatedDuration ? `~${bm.estimatedDuration} min` : "-";
      console.log(
        `  ${bm.name.padEnd(20)}${bm.category.padEnd(10)}${bm.format.padEnd(18)}${dur}`
      );
    }

    console.log("\n  Use `wod benchmark show <name>` for details.");
    console.log("  Use `wod generate --benchmark <name>` to start one.\n");
  });

benchmarkCmd
  .command("show <name>")
  .description("Show details of a benchmark workout")
  .action((name) => {
    const bm = getBenchmark(name);
    if (!bm) {
      console.error(`\nBenchmark not found: "${name}"`);
      console.error("Run `wod benchmark list` to see available benchmarks.\n");
      process.exit(1);
    }

    console.log("\n" + formatWorkoutDisplay(bm));

    if (bm.description) {
      console.log(`\n  ${bm.description}`);
    }
    console.log(`  Category: ${bm.category}`);

    // Check for previous attempts
    const db = getDb();
    const workoutRepo = new WorkoutRepository(db);
    const resultRepo = new ResultRepository(db);
    const a = resolveAthlete({});

    // Find all saved instances of this benchmark
    const savedBenchmarks = workoutRepo.getBenchmarks().filter(
      (w) => w.name === bm.name
    );

    if (savedBenchmarks.length > 0) {
      const allResults = savedBenchmarks.flatMap((w) =>
        resultRepo.getByAthleteAndWorkout(a.id, w.id)
      );

      if (allResults.length > 0) {
        console.log(`\n  Previous attempts (${allResults.length}):`);
        for (const r of allResults.slice(0, 5)) {
          const date = new Date(r.performedAt).toLocaleDateString();
          const score = formatScore(r);
          const rx = r.rx ? " (Rx)" : "";
          console.log(`    ${date}  ${score}${rx}`);
        }
      }
    }

    console.log(`\n  Start this workout: wod generate --benchmark ${name}\n`);
  });

// ─── SESSION ─────────────────────────────────────────────────────

program
  .command("session")
  .description("Generate a full training session (warm-up + WOD + cool-down)")
  .option(
    "-d, --duration <minutes>",
    "Total session duration in minutes",
    "60"
  )
  .option(
    "-f, --format <format>",
    "WOD format (amrap, emom, for_time, rounds_for_time, tabata, chipper, ladder, strength)",
    "amrap"
  )
  .option("-m, --movements <count>", "Number of movements in WOD", "3")
  .option(
    "-b, --benchmark <name>",
    "Use a named benchmark WOD"
  )
  .option("--no-warmup", "Skip warm-up block")
  .option("--no-cooldown", "Skip cool-down block")
  .action((opts) => {
    const a = resolveAthlete({});
    const db = getDb();
    const workoutRepo = new WorkoutRepository(db);

    let providedWorkout: Workout | undefined;

    if (opts.benchmark) {
      const bm = getBenchmark(opts.benchmark);
      if (!bm) {
        console.error(`\nBenchmark not found: "${opts.benchmark}"`);
        console.error("Run `wod benchmark list` to see available benchmarks.\n");
        process.exit(1);
      }
      providedWorkout = {
        ...bm,
        id: `wod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      };
    }

    const result = buildSession(a, {
      totalMinutes: parseInt(opts.duration, 10),
      includeWarmUp: opts.warmup !== false,
      includeCoolDown: opts.cooldown !== false,
      workout: providedWorkout,
      generateOptions: providedWorkout
        ? undefined
        : {
            format: opts.format as WorkoutFormat,
            movementCount: parseInt(opts.movements, 10),
          },
    });

    // Save the WOD to DB
    const wodBlock = result.session.blocks.find((b) => b.workout);
    if (wodBlock?.workout) {
      workoutRepo.save(wodBlock.workout);
    }

    // Display session
    console.log("\n" + "═".repeat(50));
    console.log(`  Training Session - ${result.session.date}`);
    console.log(`  Total Duration: ~${result.session.totalDurationMinutes} min`);
    console.log("═".repeat(50));

    for (const block of result.session.blocks) {
      const label = block.type.replace(/_/g, " ").toUpperCase();
      console.log(`\n  ── ${label} (~${block.durationMinutes} min) ──`);

      if (block.workout) {
        console.log("");
        // Display the workout
        const wDisplay = formatWorkoutDisplay(block.workout);
        // Indent the workout display
        for (const line of wDisplay.split("\n")) {
          console.log(`  ${line}`);
        }
      }

      if (block.notes && !block.workout) {
        for (const line of block.notes.split("\n")) {
          console.log(`    ${line}`);
        }
      }
    }

    if (wodBlock?.workout) {
      console.log(`\n  Workout ID: ${wodBlock.workout.id}`);
      console.log(`  Log your result: wod log -w ${wodBlock.workout.id}`);
    }

    console.log("\n" + "═".repeat(50) + "\n");
  });

// ─── INSIGHTS ────────────────────────────────────────────────────

program
  .command("insights")
  .description("Analyze training for biases, gaps, and fatigue indicators")
  .option("-d, --days <days>", "Analysis period in days", "30")
  .action((opts) => {
    const db = getDb();
    const a = resolveAthlete({});
    const days = parseInt(opts.days, 10);

    const biasDetector = new BiasDetector(db);
    const fatigueTracker = new FatigueTracker(db);

    const biasReport = biasDetector.analyze(a.id, days);
    const fatigueReport = fatigueTracker.analyze(a.id);

    console.log("\n" + "═".repeat(55));
    console.log(`  Training Insights (last ${days} days)`);
    console.log(`  ${biasReport.totalWorkouts} workouts analyzed`);
    console.log("═".repeat(55));

    // Bias insights
    const allInsights = [
      ...biasReport.insights,
      ...fatigueReport.insights,
    ];

    if (allInsights.length === 0) {
      console.log("\n  No issues detected. Keep training!\n");
    } else {
      // Group by severity
      const alerts = allInsights.filter((i) => i.severity === "alert" || i.severity === "warning");
      const cautions = allInsights.filter((i) => i.severity === "caution");
      const infos = allInsights.filter((i) => i.severity === "info" || i.severity === "good");

      if (alerts.length > 0) {
        console.log("\n  !! ALERTS !!");
        for (const insight of alerts) {
          console.log(`    ${insight.message}`);
          console.log(`      -> ${insight.recommendation}`);
        }
      }

      if (cautions.length > 0) {
        console.log("\n  ! CAUTIONS");
        for (const insight of cautions) {
          console.log(`    ${insight.message}`);
          console.log(`      -> ${insight.recommendation}`);
        }
      }

      if (infos.length > 0) {
        console.log("\n  Notes:");
        for (const insight of infos) {
          console.log(`    ${insight.message}`);
          console.log(`      -> ${insight.recommendation}`);
        }
      }
    }

    // Modality distribution
    if (biasReport.totalWorkouts > 0) {
      console.log("\n" + distributionChart(
        "Modality Distribution",
        biasReport.modalityDistribution
      ));

      console.log("\n" + distributionChart(
        "Muscle Group Distribution",
        biasReport.muscleGroupDistribution
      ));
    }

    // RPE trend
    if (fatigueReport.rpeTrend.length > 0) {
      console.log(`\n  RPE Trend: ${sparkline(fatigueReport.rpeTrend.map((p) => p.rpe))}`);
      if (fatigueReport.weeklyRpeAvg !== null) {
        console.log(`  7-day avg RPE: ${fatigueReport.weeklyRpeAvg}/10`);
      }
      if (fatigueReport.monthlyRpeAvg !== null) {
        console.log(`  30-day avg RPE: ${fatigueReport.monthlyRpeAvg}/10`);
      }
      console.log(`  Load trend: ${fatigueReport.loadTrend.replace(/_/g, " ")}`);
    }

    // Top movements
    if (biasReport.movementFrequency.length > 0) {
      console.log("\n" + barChart(
        "Most Used Movements",
        biasReport.movementFrequency.slice(0, 8).map((m) => ({
          label: m.name,
          value: m.count,
        })),
        { unit: "x" }
      ));
    }

    console.log("\n" + "═".repeat(55) + "\n");
  });

// ─── PROGRESS ────────────────────────────────────────────────────

program
  .command("progress")
  .description("Visualize training progress over time")
  .option("-m, --movement <id>", "Show progress for a specific movement")
  .option("-d, --days <days>", "Number of days to show", "30")
  .action((opts) => {
    const db = getDb();
    const a = resolveAthlete({});
    const resultRepo = new ResultRepository(db);
    const workoutRepo = new WorkoutRepository(db);
    const days = parseInt(opts.days, 10);

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);

    const results = resultRepo.getByDateRange(
      a.id,
      start.toISOString(),
      end.toISOString()
    );

    if (results.length === 0) {
      console.log(`\nNo workouts in the last ${days} days.\n`);
      return;
    }

    console.log("\n" + "═".repeat(55));
    console.log(`  Progress Report (last ${days} days)`);
    console.log("═".repeat(55));

    // RPE over time chart
    const rpeData = results
      .filter((r) => r.rpe !== undefined)
      .reverse()
      .map((r) => ({
        label: r.performedAt.split("T")[0].slice(5), // MM-DD
        value: r.rpe!,
      }));

    if (rpeData.length >= 2) {
      console.log("\n" + timelineChart("RPE Over Time", rpeData, { unit: "RPE (1-10)" }));
    }

    // Movement-specific progress
    if (opts.movement) {
      const movementName = getMovement(opts.movement)?.name ?? opts.movement;
      const loadData: { label: string; value: number }[] = [];

      for (const r of results.reverse()) {
        for (const mr of r.movementResults) {
          if (mr.movementId === opts.movement && mr.load) {
            loadData.push({
              label: r.performedAt.split("T")[0].slice(5),
              value: mr.load,
            });
          }
        }
      }

      if (loadData.length >= 2) {
        console.log("\n" + timelineChart(`${movementName} Load`, loadData, { unit: "lbs" }));
      } else if (loadData.length > 0) {
        console.log(`\n  ${movementName}: ${loadData[0].value} lbs (only 1 data point)`);
      } else {
        console.log(`\n  No logged data for ${movementName} in this period.`);
      }
    }

    // Workout frequency per week
    const weekMap = new Map<string, number>();
    for (const r of results) {
      const date = new Date(r.performedAt);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekLabel = weekStart.toISOString().split("T")[0].slice(5);
      weekMap.set(weekLabel, (weekMap.get(weekLabel) ?? 0) + 1);
    }

    const weekData = [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ label: `wk ${label}`, value: count }));

    if (weekData.length >= 2) {
      console.log("\n" + barChart("Workouts per Week", weekData, { unit: "" }));
    }

    // Format distribution
    const formatCounts = new Map<string, number>();
    for (const r of results) {
      const w = workoutRepo.getById(r.workoutId);
      if (w) {
        formatCounts.set(w.format, (formatCounts.get(w.format) ?? 0) + 1);
      }
    }

    if (formatCounts.size > 0) {
      const fmtDist: Record<string, number> = {};
      for (const [fmt, count] of formatCounts) {
        fmtDist[fmt] = Math.round((count / results.length) * 100);
      }
      console.log("\n" + distributionChart("Format Mix", fmtDist));
    }

    console.log("\n" + "═".repeat(55) + "\n");
  });

// ─── Formatting Helpers ───────────────────────────────────────────

function formatWorkoutDisplay(workout: Workout): string {
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
    lines.push(
      `  For Time${workout.timeCap ? ` (${workout.timeCap} min cap)` : ""}:`
    );
  } else if (workout.format === "rounds_for_time" && workout.rounds) {
    lines.push(`  ${workout.rounds} Rounds For Time:`);
  } else if (workout.format === "chipper") {
    lines.push(
      `  Chipper${workout.timeCap ? ` (${workout.timeCap} min cap)` : ""}:`
    );
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

function formatScore(result: {
  scoreType: ScoreType;
  timeSeconds?: number;
  roundsCompleted?: number;
  partialReps?: number;
  peakLoad?: number;
  totalReps?: number;
  totalCalories?: number;
  totalDistance?: number;
}): string {
  switch (result.scoreType) {
    case ScoreType.Time:
      if (result.timeSeconds !== undefined) {
        const mins = Math.floor(result.timeSeconds / 60);
        const secs = Math.round(result.timeSeconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      }
      return "-";
    case ScoreType.RoundsAndReps: {
      if (result.roundsCompleted !== undefined) {
        const partial = result.partialReps
          ? ` + ${result.partialReps}`
          : "";
        return `${result.roundsCompleted} rds${partial}`;
      }
      return "-";
    }
    case ScoreType.Load:
      return result.peakLoad !== undefined ? `${result.peakLoad} lbs` : "-";
    case ScoreType.Reps:
      return result.totalReps !== undefined ? `${result.totalReps} reps` : "-";
    case ScoreType.Calories:
      return result.totalCalories !== undefined
        ? `${result.totalCalories} cal`
        : "-";
    case ScoreType.Distance:
      return result.totalDistance !== undefined
        ? `${result.totalDistance}m`
        : "-";
    default:
      return "-";
  }
}

function formatPRValue(value: number, unit: string): string {
  switch (unit) {
    case "seconds": {
      const mins = Math.floor(value / 60);
      const secs = Math.round(value % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    case "lbs":
      return `${value} lbs`;
    case "reps":
      return `${value} reps`;
    case "rounds_reps": {
      const rounds = Math.floor(value / 1000);
      const reps = value % 1000;
      return reps > 0 ? `${rounds}+${reps}` : `${rounds} rds`;
    }
    case "calories":
      return `${value} cal`;
    case "meters":
      return `${value}m`;
    default:
      return `${value}`;
  }
}

program.parse();
