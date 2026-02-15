# WOD Assistant - Project Plan

## Vision

A multi-purpose fitness programming utility that helps athletes and coaches plan,
track, and optimize workouts. While rooted in CrossFit-style programming (WODs),
the tool is framework-agnostic and supports various training methodologies.

---

## Key Pain Points Technology Can Solve

### 1. Workout Programming & Variation

**Problem:** Athletes and coaches repeat the same movements, neglect muscle groups,
or fail to balance stimulus types (strength, cardio, gymnastics, etc.). Writing
varied programming is time-consuming and requires deep knowledge.

**Solution:**
- Movement library with metadata (muscle groups, equipment, modality, skill level)
- Workout generator that ensures balanced programming across time
- Template system for common workout formats (AMRAP, EMOM, For Time, intervals, etc.)
- Bias detection -- surface which movements/modalities are over- or under-represented

### 2. Scaling & Accessibility

**Problem:** Prescribed (Rx) workouts don't fit every athlete. Beginners, athletes
with injuries, or those with limited equipment need appropriate substitutions.
Coaches spend significant time writing scaled versions.

**Solution:**
- Movement substitution engine (e.g., pull-ups -> ring rows -> banded pull-ups)
- Equipment-aware scaling (no barbell? suggest dumbbell or kettlebell alternatives)
- Difficulty tiers per movement (beginner / intermediate / advanced / Rx / Rx+)
- Injury-aware modifications (flag movements by joint/body region)

### 3. Load & Volume Management

**Problem:** Athletes either under-train or over-train. Without tracking volume
and intensity over time, it's hard to know if programming is balanced or if
recovery is adequate.

**Solution:**
- Track prescribed and actual loads, reps, rounds
- Weekly/monthly volume summaries by muscle group and modality
- Intensity scoring per workout (estimated stimulus)
- Fatigue and recovery indicators based on recent training history

### 4. Workout Logging & History

**Problem:** Athletes forget scores, can't track progress, and lose motivation
without visible improvement. Paper logbooks get lost. Scattered notes across
apps are hard to query.

**Solution:**
- Structured workout result logging (time, rounds+reps, load, RPE)
- Personal records (PR) tracking by movement and benchmark workouts
- Historical comparison (last time you did "Fran", your time was X)
- Progress visualization over time

### 5. Time & Session Planning

**Problem:** Athletes show up to the gym without a plan, or coaches need to fit
programming into specific class time windows (e.g., 60-minute class with warm-up,
skill work, WOD, and cool-down).

**Solution:**
- Session builder with time blocks (warm-up, strength, metcon, accessory, cool-down)
- Estimated workout duration based on movement count and format
- Ready-made warm-up suggestions based on the movements in the day's workout

### 6. Benchmark & Testing Gaps

**Problem:** Athletes don't retest benchmark workouts frequently enough to measure
progress. Coaches lose track of when benchmarks were last programmed.

**Solution:**
- Benchmark workout library (e.g., "The Girls", "Hero WODs", custom benchmarks)
- Retest reminders and scheduling
- Side-by-side comparison of benchmark attempts over time

### 7. Multi-Framework Support

**Problem:** Not everyone does CrossFit. People follow strength programs (5/3/1,
Starting Strength), running plans, hybrid training, HIIT, bodybuilding splits, etc.
Most tools are locked into one paradigm.

**Solution:**
- Pluggable "framework" system where workout structures are configurable
- Built-in templates for common frameworks:
  - CrossFit / functional fitness
  - Strength training (percentage-based, linear progression)
  - Running / endurance
  - HIIT / interval training
  - Bodybuilding (push/pull/legs, upper/lower splits)
  - Hybrid / concurrent training
- Users pick their framework(s) and the tool adapts its suggestions and tracking

---

## Proposed Architecture

### Tech Stack (initial considerations)

| Layer       | Technology                        | Rationale                                    |
|-------------|-----------------------------------|----------------------------------------------|
| Runtime     | Node.js + TypeScript              | Matches .gitignore setup, strong typing      |
| CLI         | Commander.js or Ink               | Start as CLI tool, fast iteration            |
| Data        | SQLite (via better-sqlite3)       | Local-first, no server needed, portable      |
| Future UI   | React (web or React Native)       | Natural progression from CLI                 |
| Testing     | Vitest                            | Fast, modern, TypeScript-native              |

### Core Domain Models

```
Movement        - name, modality, equipment, muscle groups, difficulty, substitutions
Workout         - name, type (AMRAP/EMOM/ForTime/etc.), movements + prescriptions
Session         - date, time blocks (warm-up, strength, metcon, etc.)
WorkoutResult   - athlete, workout, score, loads, RPE, notes, date
Athlete         - profile, PRs, preferences, injury flags, equipment available
Program         - multi-day/week plan, framework, goals
```

### Module Breakdown

```
src/
  models/          - Domain entities and types
  movements/       - Movement library, substitution engine
  generator/       - Workout generation and templates
  scaling/         - Scaling and modification logic
  tracking/        - Logging, PR tracking, volume analysis
  program/         - Multi-day programming, session builder
  frameworks/      - Framework-specific logic (CrossFit, strength, etc.)
  cli/             - CLI interface
  db/              - Database layer
```

---

## Implementation Phases

### Phase 1: Foundation
- Project scaffolding (TypeScript, build, test, lint)
- Core domain models and types
- Movement library with seed data
- SQLite database layer
- Basic CLI skeleton

### Phase 2: Core Workout Features
- Workout templates (AMRAP, EMOM, For Time, etc.)
- Workout generator with movement selection
- Movement substitution engine
- Scaling tiers

### Phase 3: Tracking & Logging
- Workout result logging via CLI
- PR tracking
- Workout history and search
- Basic volume/intensity summaries

### Phase 4: Programming & Planning
- Session builder with time blocks
- Multi-day/week program creation
- Warm-up suggestions
- Benchmark library and retest tracking

### Phase 5: Intelligence & Analysis
- Programming bias detection
- Recovery/fatigue indicators
- Progress visualization (terminal charts or exportable)
- Framework-specific recommendations

### Phase 6: Multi-Framework Expansion
- Strength program templates (5/3/1, linear progression)
- Running/endurance plan support
- Bodybuilding split support
- Hybrid training support

---

## Open Questions for Discussion

1. **CLI-first or Web-first?** CLI is faster to build and iterate on, but a web
   UI would be more accessible. Start CLI then add web, or go straight to web?

2. **Local-only or cloud-sync?** Local SQLite is simple and private. But
   coach-athlete sharing and multi-device access need a server. Start local?

3. **Single user or multi-user?** Solo athlete tool first, then add coach/gym
   features? Or design for multi-user from the start?

4. **Movement library scope?** Start with a curated set of ~100-150 common
   movements, or build a framework for users to add their own from day one?
