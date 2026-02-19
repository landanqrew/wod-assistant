# WOD Assistant

A CLI fitness programming utility for CrossFit-style workouts and beyond. Generate workouts, browse benchmark WODs, build full training sessions with warm-ups, follow structured strength programs (5/3/1, StrongLifts), running plans (Couch to 5K), and bodybuilding splits (PPL, Upper/Lower) -- plus log results, track PRs, monitor volume, detect biases, and visualize progress. All stored locally in SQLite.

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

# 2b. Or pick a benchmark WOD
wod generate --benchmark fran

# 2c. Or build a full session (warm-up + WOD + cool-down)
wod session -d 60 -f for_time

# 3. Log your result (use the workout ID from step 2)
wod log -w <workout-id> --rounds 7 --reps 4 --rpe 8 --rx

# 4. Check your PRs
wod prs

# 5. Review your week
wod volume

# 6. Check for training blind spots
wod insights

# 7. Visualize progress
wod progress

# 8. Follow a structured program
wod program 531 -s 300 -b 200 -d 400 -p 150
wod program run -p couch_to_5k -w 1
wod program split -t ppl -d 0
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
  -b, --benchmark <name>      Use a named benchmark WOD (e.g., fran, grace, murph)
```

```bash
wod generate                           # default 12-min AMRAP
wod generate -f for_time -m 4          # 4-movement For Time
wod generate -f strength               # single-movement strength session
wod gen -f chipper -m 6 -t 30          # 6-movement chipper with 30 min cap
wod generate --benchmark fran          # classic Fran: 21-15-9 Thrusters & Pull-ups
wod gen -b murph                       # Murph Hero WOD
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

### `wod benchmark` (alias: `bm`)

Browse the library of 17 named benchmark workouts including The Girls (Fran, Grace, Helen, etc.), Hero WODs (Murph, DT, etc.), and classics (Fight Gone Bad).

#### `wod benchmark list`

```
Options:
  -c, --category <cat>        Filter: girl | hero | open
```

```bash
wod benchmark list                     # show all 17 benchmarks
wod bm list -c girl                    # just The Girls
wod bm list -c hero                    # just Hero WODs
```

#### `wod benchmark show <name>`

Show details of a benchmark workout, including your previous attempts if any.

```bash
wod benchmark show fran
wod bm show murph
```

### `wod session`

Generate a complete training session with warm-up, WOD, and cool-down. The warm-up drills are tailored to the movements in the workout (e.g., shoulder mobility for pressing, hip activation for squats).

```
Options:
  -d, --duration <minutes>    Total session duration (default: 60)
  -f, --format <format>       WOD format (default: amrap)
  -m, --movements <count>     Number of movements in WOD (default: 3)
  -b, --benchmark <name>      Use a named benchmark WOD
  --no-warmup                 Skip warm-up block
  --no-cooldown               Skip cool-down block
```

```bash
wod session                            # 60-min session with random AMRAP
wod session -d 45 -f for_time          # 45-min session with For Time WOD
wod session --benchmark fran           # session built around Fran
wod session --no-cooldown -d 30        # quick 30-min, skip cool-down
```

### `wod movements` (alias: `list`)

List all 68 movements in the library.

```
Options:
  -m, --modality <modality>   Filter: weightlifting | gymnastics | monostructural | strongman
```

```bash
wod movements
wod movements -m gymnastics
```

### `wod insights`

Analyze your training history for programming biases, movement gaps, and fatigue indicators. Surfaces issues like missing modalities, push/pull imbalances, RPE trends, and overtraining signals.

```
Options:
  -d, --days <days>           Analysis period in days (default: 30)
```

```bash
wod insights                           # 30-day analysis
wod insights -d 14                     # last 2 weeks
```

Example output includes:
- Alerts for missing modalities ("No gymnastics in 30 days")
- Push/pull ratio warnings
- RPE trend sparkline and averages
- Training frequency analysis
- Modality and muscle group distribution charts

### `wod progress`

Visualize training progress with ASCII charts: RPE over time, workout frequency per week, format mix, and per-movement load tracking.

```
Options:
  -m, --movement <id>         Show load progress for a specific movement
  -d, --days <days>           Number of days to chart (default: 30)
```

```bash
wod progress                           # overall 30-day view
wod progress -d 60                     # last 2 months
wod progress -m back_squat             # back squat load chart
```

### `wod program`

Access structured training programs beyond WODs: strength programming, running plans, and bodybuilding splits.

#### `wod program 531`

Generate a Wendler 5/3/1 training day or full week. Calculates working sets from your training maxes using the standard percentage scheme.

```
Options:
  -s, --squat <lbs>           Squat training max (required)
  -b, --bench <lbs>           Bench training max (required)
  -d, --deadlift <lbs>        Deadlift training max (required)
  -p, --press <lbs>           Press training max (required)
  -w, --week <1-4>            Week in cycle: 1=5s, 2=3s, 3=5/3/1, 4=Deload (default: 1)
  -l, --lift <lift>           Single lift: squat | bench | deadlift | press (default: full week)
  --no-bbb                    Skip Boring But Big accessory work
```

```bash
wod program 531 -s 300 -b 200 -d 400 -p 150           # full week 1
wod program 531 -s 300 -b 200 -d 400 -p 150 -w 3      # 5/3/1 week
wod program 531 -s 300 -b 200 -d 400 -p 150 -l squat  # squat day only
```

#### `wod program stronglifts`

Generate a StrongLifts 5x5 A/B day with your current working weights.

```
Options:
  -s, --squat <lbs>           Squat weight (required)
  -b, --bench <lbs>           Bench weight (required)
  -r, --row <lbs>             Row weight (required)
  -p, --press <lbs>           Press weight (required)
  -d, --deadlift <lbs>        Deadlift weight (required)
  --day <A|B>                 Day A or B (default: A)
```

```bash
wod program stronglifts -s 225 -b 185 -r 135 -p 115 -d 315 --day A
wod program stronglifts -s 225 -b 185 -r 135 -p 115 -d 315 --day B
```

#### `wod program run`

Follow a structured running plan with progressive weekly programming.

```
Options:
  -p, --plan <plan>           couch_to_5k | 5k_improvement (default: couch_to_5k)
  -w, --week <number>         Week number (default: 1)
  -d, --day <number>          Day of week, 0=Mon (default: 0)
```

```bash
wod program run -p couch_to_5k -w 1                    # full week overview
wod program run -p couch_to_5k -w 1 -d 0               # Monday's workout
wod program run -p 5k_improvement -w 3                  # week 3 overview
```

#### `wod program split`

Follow a bodybuilding split with structured hypertrophy programming.

```
Options:
  -t, --type <split>          ppl | upper_lower | full_body (default: ppl)
  -d, --day <index>           Day index in the split (default: 0)
```

```bash
wod program split -t ppl -d 0                           # Push Day
wod program split -t ppl -d 1                           # Pull Day
wod program split -t upper_lower -d 0                   # Upper A (Strength)
wod program split -t full_body -d 2                     # Full Body C
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
  frameworks/   Strength programs (5/3/1, StrongLifts), running plans, bodybuilding splits
  generator/    Workout generation, benchmarks, warm-up engine, session builder
  models/       TypeScript interfaces and enums
  movements/    Movement library (68 movements)
  scaling/      Constraint engine, substitution, scaling tiers
  tracking/     PR detection, volume summaries, bias detection, fatigue tracking, charts
```
