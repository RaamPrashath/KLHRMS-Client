export type PlanLocationValue = "OFFICE" | "WFH" | "LEAVE" | "HOLIDAY";

export interface PlanLocationOption {
  value: PlanLocationValue;
  label: string;
  short_label: string;
  color: string;
}

export interface PlanLocationTheme {
  bg: string;
  text: string;
  border: string;
  dot: string;
  tint: string;
}

export const FALLBACK_PLAN_LOCATIONS: PlanLocationOption[] = [
  {
    value: "OFFICE",
    label: "Office",
    short_label: "OFC",
    color: "#0f766e",
  },
  {
    value: "WFH",
    label: "WFH",
    short_label: "WFH",
    color: "#2563eb",
  },
  {
    value: "LEAVE",
    label: "Leave",
    short_label: "LV",
    color: "#dc2626",
  },
  {
    value: "HOLIDAY",
    label: "Holiday",
    short_label: "HOL",
    color: "#dc2626",
  },
];

export const PLAN_LOCATION_THEMES: Record<PlanLocationValue, PlanLocationTheme> = {
  OFFICE: {
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    dot: "bg-teal-500",
    tint: "from-teal-100/80 to-white",
  },
  WFH: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-500",
    tint: "from-blue-100/80 to-white",
  },
  LEAVE: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
    tint: "from-rose-100/80 to-white",
  },
  HOLIDAY: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    dot: "bg-red-500",
    tint: "from-red-100/80 to-white",
  },
};

export const PLAN_LOCATION_MAP = Object.fromEntries(
  FALLBACK_PLAN_LOCATIONS.map((location) => [location.value, location]),
) as Record<PlanLocationValue, PlanLocationOption>;
