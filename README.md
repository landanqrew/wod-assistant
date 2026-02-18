# WOD Assistant

A CLI fitness programming utility for CrossFit-style workouts. Generate workouts, log results, track personal records, and monitor training volume -- all stored locally in SQLite.

## Install

```bash
npm install
npm run build
npm link        # makes the `wod` command available globally
```

For development without building:

```bash
npm run dev -- <command>       # e.g. npm run dev -- generate
```

## Quick Start

```bash
# 1. Create your athlete profile
wod athlete create -n "Jane Doe" -s female -e home_gym

# 2. Generate a workout
wod generate -f amrap -m 3 -t 12

# 3. Log your result (use the workout ID from step 2)
wod log -w <workout-id> --rounds 7 --reps 4 --rpe 8 --rx

# 4. Check your PRs
wod prs

# 5. Review your week
wod volume
```

## Commands

### `wod athlete create`

Create or update your athlete profile. This is persisted in your local database and used by all other commands.

```
Options:
  -n, --name <name>           Your name (required)
  -s, --sex <sex>             male | female (default: male)
  -e, --equipment <preset>    full_gym | home_gym | minimal | bodyweight (default: full_gym)
  -d, --duration <minutes>    Preferred workout duration
```

```bash
wod athlete create -n "Jane Doe" -s female -e home_gym
```

### `wod athlete show`

Display your saved profile and total workout count.

```bash
wod athlete show
```

### `wod generate` (alias: `gen`)

Generate a random workout. The workout is saved to your local database so you can log results against it.

```
Options:
  -f, --format <format>       amrap | emom | for_time | rounds_for_time | tabata | chipper | ladder | strength (default: amrap)
  -m, --movements <count>     Number of movements (default: 3)
  -t, --time <minutes>        Time cap in minutes
  -r, --rounds <count>        Number of rounds
  -e, --equipment <preset>    Equipment override (default: uses athlete profile)
  -s, --sex <sex>             Sex for Rx loads (default: uses athlete profile)
```

```bash
wod generate                           # default 12-min AMRAP
wod generate -f for_time -m 4          # 4-movement For Time
wod generate -f strength               # single-movement strength session
wod gen -f chipper -m 6 -t 30          # 6-movement chipper with 30 min cap
```

### `wod log`

Log a workout result. Automatically detects and saves personal records.

```
Options:
  -w, --workout <id>          Workout ID (required, from `wod generate` output)
  --time <seconds>            Time in seconds (ForTime / RoundsForTime)
  --rounds <count>            Rounds completed (AMRAP)
  --reps <count>              Partial reps (AMRAP) or total reps (Tabata)
  --load <lbs>                Peak load in lbs (Strength)
  --calories <cal>            Total calories
  --distance <meters>         Total distance in meters
  --rpe <value>               Rate of perceived exertion (1-10)
  --rx                        Completed as prescribed
  --notes <text>              Free-form notes
```

```bash
# AMRAP result: 7 rounds + 4 reps
wod log -w wod_abc123 --rounds 7 --reps 4 --rpe 7 --rx

# For Time result: 9 minutes 30 seconds
wod log -w wod_abc123 --time 570 --rx

# Strength result: 275 lbs
wod log -w wod_abc123 --load 275 --rpe 9 --rx --notes "felt strong"
```

### `wod history`

View past workout results in a table.

```
Options:
  -n, --limit <count>         Number of results to show (default: 10)
```

```bash
wod history
wod history -n 25
```

### `wod prs`

View your personal records, grouped by movement and workout.

```
Options:
  -m, --movement <id>         Filter by movement ID (e.g. back_squat)
```

```bash
wod prs
wod prs -m back_squat
```

### `wod volume` (alias: `vol`)

View training volume summary for the past week or month.

```
Options:
  -p, --period <period>       week | month (default: week)
```

```bash
wod volume
wod vol -p month
```

### `wod scale`

Scale a saved workout to a different difficulty tier. Adjusts loads, reps, and substitutes movements as needed.

```
Options:
  -w, --workout <id>          Workout ID (required)
  -t, --tier <tier>           beginner | intermediate | advanced | rx | rx_plus (default: intermediate)
```

```bash
wod scale -w wod_abc123 -t beginner
wod scale -w wod_abc123 -t rx_plus
```

### `wod movements` (alias: `list`)

List all 64 movements in the library.

```
Options:
  -m, --modality <modality>   Filter: weightlifting | gymnastics | monostructural | strongman
```

```bash
wod movements
wod movements -m gymnastics
```

## Equipment Presets

| Preset | Equipment Included |
|---|---|
| `full_gym` | Everything: barbells, dumbbells, kettlebells, rings, rowers, bikes, ropes, etc. |
| `home_gym` | Barbell, plates, dumbbells, kettlebells, pull-up bar, box, jump rope, bands, bench, squat rack |
| `minimal` | Dumbbells, kettlebells, pull-up bar, jump rope, bands |
| `bodyweight` | No equipment needed |

## Data Storage

All data is stored locally in `~/.wod-assistant/wod.db` (SQLite). No network calls, no accounts.

## Development

```bash
npm test              # run test suite
npm run test:watch    # watch mode
npm run build         # compile TypeScript
```

## Architecture

```
src/
  cli/          CLI commands (Commander.js)
  db/           SQLite connection, migrations, repositories
  generator/    Workout generation engine
  models/       TypeScript interfaces and enums
  movements/    Movement library (64 movements)
  scaling/      Constraint engine, substitution, scaling tiers
  tracking/     PR detection, volume summaries
```
