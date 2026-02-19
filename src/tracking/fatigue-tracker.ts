import type Database from "better-sqlite3";
import type { WorkoutResult } from "../models/workout-result.js";
import { ResultRepository } from "../db/result-repository.js";

/**
 * A single fatigue indicator with severity.
 */
export interface FatigueInsight {
  category: "rpe_trend" | "rpe_acute" | "recovery" | "overreaching";
  severity: "good" | "caution" | "warning";
  message: string;
  recommendation: string;
}

/**
 * RPE data point for trend analysis.
 */
export interface RPEDataPoint {
  date: string;
  rpe: number;
  workoutName?: string;
}

/**
 * Full fatigue/recovery report.
 */
export interface FatigueReport {
  insights: FatigueInsight[];
  /** RPE trend over time */
  rpeTrend: RPEDataPoint[];
  /** Rolling 7-day average RPE values */
  weeklyRpeAvg: number | null;
  /** Rolling 30-day average RPE */
  monthlyRpeAvg: number | null;
  /** Recent workouts count (last 7 days) */
  recentWorkoutCount: number;
  /** Training load direction: increasing, steady, decreasing */
  loadTrend: "increasing" | "steady" | "decreasing" | "insufficient_data";
}

/**
 * Tracks fatigue indicators and recovery status from training data.
 */
export class FatigueTracker {
  private resultRepo: ResultRepository;

  constructor(db: Database.Database) {
    this.resultRepo = new ResultRepository(db);
  }

  /**
   * Generate a fatigue/recovery report for an athlete.
   */
  analyze(athleteId: string): FatigueReport {
    const now = new Date();

    // Fetch last 30 days of data
    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    const monthResults = this.resultRepo.getByDateRange(
      athleteId,
      monthStart.toISOString(),
      now.toISOString()
    );

    // Fetch last 7 days
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const weekResults = monthResults.filter(
      (r) => new Date(r.performedAt) >= weekStart
    );

    const insights: FatigueInsight[] = [];

    // Build RPE trend
    const rpeTrend: RPEDataPoint[] = monthResults
      .filter((r) => r.rpe !== undefined)
      .map((r) => ({
        date: r.performedAt.split("T")[0],
        rpe: r.rpe!,
      }))
      .reverse(); // oldest first

    // Weekly and monthly RPE averages
    const weekRpes = weekResults
      .filter((r) => r.rpe !== undefined)
      .map((r) => r.rpe!);
    const monthRpes = monthResults
      .filter((r) => r.rpe !== undefined)
      .map((r) => r.rpe!);

    const weeklyRpeAvg = weekRpes.length > 0 ? avg(weekRpes) : null;
    const monthlyRpeAvg = monthRpes.length > 0 ? avg(monthRpes) : null;

    // Detect load trend
    const loadTrend = this.detectLoadTrend(monthResults);

    // Generate insights
    if (monthResults.length >= 3) {
      insights.push(...this.analyzeRPETrends(weeklyRpeAvg, monthlyRpeAvg, rpeTrend));
      insights.push(...this.analyzeAcuteRPE(weekRpes));
      insights.push(...this.analyzeWorkloadRatio(weekResults.length, monthResults.length));
      insights.push(...this.analyzeRecovery(monthResults));
    } else if (monthResults.length > 0) {
      insights.push({
        category: "recovery",
        severity: "good",
        message: `${monthResults.length} workout(s) in the last 30 days`,
        recommendation: "Log more workouts with RPE for fatigue tracking.",
      });
    }

    return {
      insights,
      rpeTrend,
      weeklyRpeAvg,
      monthlyRpeAvg,
      recentWorkoutCount: weekResults.length,
      loadTrend,
    };
  }

  private analyzeRPETrends(
    weekAvg: number | null,
    monthAvg: number | null,
    trend: RPEDataPoint[]
  ): FatigueInsight[] {
    const insights: FatigueInsight[] = [];

    if (weekAvg !== null && monthAvg !== null) {
      const diff = weekAvg - monthAvg;

      if (diff > 1.5) {
        insights.push({
          category: "rpe_trend",
          severity: "warning",
          message: `Weekly RPE (${weekAvg.toFixed(1)}) is significantly higher than monthly average (${monthAvg.toFixed(1)})`,
          recommendation: "Your perceived effort is spiking. Consider a deload or lighter sessions.",
        });
      } else if (diff > 0.8) {
        insights.push({
          category: "rpe_trend",
          severity: "caution",
          message: `Weekly RPE (${weekAvg.toFixed(1)}) is trending above monthly average (${monthAvg.toFixed(1)})`,
          recommendation: "Training intensity is rising. Monitor how you feel and adjust if needed.",
        });
      } else if (diff < -1) {
        insights.push({
          category: "rpe_trend",
          severity: "good",
          message: `Weekly RPE (${weekAvg.toFixed(1)}) is lower than monthly average (${monthAvg.toFixed(1)})`,
          recommendation: "Good recovery. You may have room to push harder if goals demand it.",
        });
      }
    }

    // Check for consistently high RPE
    if (trend.length >= 5) {
      const recent5 = trend.slice(-5);
      const allHigh = recent5.every((p) => p.rpe >= 9);
      if (allHigh) {
        insights.push({
          category: "rpe_trend",
          severity: "warning",
          message: "Last 5 workouts all rated RPE 9+",
          recommendation: "Sustained max effort increases injury risk. Schedule recovery days.",
        });
      }
    }

    return insights;
  }

  private analyzeAcuteRPE(weekRpes: number[]): FatigueInsight[] {
    const insights: FatigueInsight[] = [];

    if (weekRpes.length === 0) return insights;

    const weekAvg = avg(weekRpes);

    if (weekAvg >= 9) {
      insights.push({
        category: "rpe_acute",
        severity: "warning",
        message: `Average RPE this week is ${weekAvg.toFixed(1)}/10`,
        recommendation: "Very high training intensity. Prioritize sleep, nutrition, and recovery.",
      });
    } else if (weekAvg >= 7.5) {
      insights.push({
        category: "rpe_acute",
        severity: "caution",
        message: `Average RPE this week is ${weekAvg.toFixed(1)}/10`,
        recommendation: "Moderate-high intensity. Ensure you're recovering between sessions.",
      });
    } else if (weekAvg <= 4 && weekRpes.length >= 3) {
      insights.push({
        category: "rpe_acute",
        severity: "good",
        message: `Average RPE this week is ${weekAvg.toFixed(1)}/10 across ${weekRpes.length} sessions`,
        recommendation: "Low intensity — if intentional (deload), great. Otherwise, challenge yourself more.",
      });
    }

    return insights;
  }

  private analyzeWorkloadRatio(
    weekCount: number,
    monthCount: number
  ): FatigueInsight[] {
    const insights: FatigueInsight[] = [];

    // Acute:chronic workload ratio (ACWR concept, simplified)
    // Week count * 4 ≈ projected monthly rate vs actual monthly rate
    const weeklyRate = weekCount;
    const monthlyWeeklyAvg = monthCount / 4;

    if (monthlyWeeklyAvg > 0 && weeklyRate > 0) {
      const acwr = weeklyRate / monthlyWeeklyAvg;

      if (acwr > 1.8) {
        insights.push({
          category: "overreaching",
          severity: "warning",
          message: `Training spike detected: ${weekCount} workouts this week vs ${monthlyWeeklyAvg.toFixed(1)}/week average (ratio: ${acwr.toFixed(1)})`,
          recommendation: "Rapid increases in training volume raise injury risk. Ramp up gradually.",
        });
      } else if (acwr > 1.4) {
        insights.push({
          category: "overreaching",
          severity: "caution",
          message: `Workload is elevated: ${weekCount} this week vs ${monthlyWeeklyAvg.toFixed(1)}/week average (ratio: ${acwr.toFixed(1)})`,
          recommendation: "Keep an eye on recovery. A small increase is fine, but don't sustain it.",
        });
      } else if (acwr < 0.5 && weekCount > 0) {
        insights.push({
          category: "recovery",
          severity: "good",
          message: `Light week: ${weekCount} workout(s) vs ${monthlyWeeklyAvg.toFixed(1)}/week average`,
          recommendation: "Good deload week. Use this recovery to come back stronger.",
        });
      }
    }

    return insights;
  }

  private analyzeRecovery(results: WorkoutResult[]): FatigueInsight[] {
    const insights: FatigueInsight[] = [];

    if (results.length < 2) return insights;

    // Check for back-to-back high-intensity days
    const sorted = [...results].sort(
      (a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
    );

    let consecutiveHighDays = 0;
    let maxConsecutive = 0;

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].performedAt);
      const curr = new Date(sorted[i].performedAt);
      const gapHours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);

      const prevRpe = sorted[i - 1].rpe ?? 0;
      const currRpe = sorted[i].rpe ?? 0;

      if (gapHours < 28 && prevRpe >= 8 && currRpe >= 8) {
        consecutiveHighDays++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveHighDays);
      } else {
        consecutiveHighDays = 0;
      }
    }

    if (maxConsecutive >= 3) {
      insights.push({
        category: "recovery",
        severity: "warning",
        message: `${maxConsecutive + 1} consecutive high-intensity days (RPE 8+)`,
        recommendation: "Take a rest day or active recovery session. Muscles need time to rebuild.",
      });
    } else if (maxConsecutive >= 2) {
      insights.push({
        category: "recovery",
        severity: "caution",
        message: `${maxConsecutive + 1} consecutive high-intensity days detected`,
        recommendation: "Consider alternating heavy and light days.",
      });
    }

    return insights;
  }

  private detectLoadTrend(
    results: WorkoutResult[]
  ): "increasing" | "steady" | "decreasing" | "insufficient_data" {
    const rpeResults = results.filter((r) => r.rpe !== undefined);
    if (rpeResults.length < 6) return "insufficient_data";

    // Sort oldest first
    const sorted = [...rpeResults].sort(
      (a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
    );

    // Compare first half avg to second half avg
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid).map((r) => r.rpe!);
    const secondHalf = sorted.slice(mid).map((r) => r.rpe!);

    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    const diff = secondAvg - firstAvg;

    if (diff > 0.5) return "increasing";
    if (diff < -0.5) return "decreasing";
    return "steady";
  }
}

function avg(nums: number[]): number {
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
