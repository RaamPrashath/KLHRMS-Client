/**
 * Re-exports from the canonical source of truth.
 * Types and constants are defined in hooks/functions/weekly_plan.ts.
 * Components import from here — never from hooks/functions/ directly.
 */

export {
  WorkLocationType,
  WORK_LOCATION_LABELS,
  WORK_LOCATION_COLORS,
} from "@/hooks/functions/weekly_plan";

export type {
  WeeklyPlanEntry,
  SetDayInput,
} from "@/hooks/functions/weekly_plan";
