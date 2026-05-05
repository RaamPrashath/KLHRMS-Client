/**
 * weekly_plan — Layer 1 fetch functions.
 *
 * Plain async functions — no React, no hooks.
 * Import baseUrl from api-client. Never read process.env here.
 * Always pass credentials: "include".
 * Always throw on non-ok responses.
 */

import { baseUrl } from "@/lib/api-client";

// ── Domain types ──────────────────────────────────────────────────────────────

export interface WeeklyPlanEntry {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string | null;
  date: string; // "YYYY-MM-DD"
  work_location: WorkLocationType;
  project: string | null;
}

// Runtime object — use for Object.values() and Select options
export const WorkLocationType = {
  HOME: "home",
  OFFICE: "office",
  HYBRID: "hybrid",
  LEAVE: "leave",
  HOLIDAY: "holiday",
} as const;

export type WorkLocationType =
  (typeof WorkLocationType)[keyof typeof WorkLocationType];

export const WORK_LOCATION_LABELS: Record<WorkLocationType, string> = {
  home: "Home",
  office: "Office",
  hybrid: "Hybrid",
  leave: "Leave",
  holiday: "Holiday",
};

/** Pastel background colors for each work location — used in day column headers */
export const WORK_LOCATION_COLORS: Record<WorkLocationType, string> = {
  home:    "bg-[#e8f4fd] text-[#1a6fa8]",
  office:  "bg-[#fce8f3] text-[#a8195a]",
  hybrid:  "bg-[#e8fdf0] text-[#1a8a4a]",
  leave:   "bg-[#fdf5e8] text-[#a86a1a]",
  holiday: "bg-[#f0e8fd] text-[#6a1aa8]",
};

export interface SetDayInput {
  work_location: WorkLocationType;
  project?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(token: string, orgId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "x-organization-id": orgId,
    Accept: "application/json",
  };
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // body was not JSON — keep statusText
    }
    throw new Error(message);
  }
}

// ── GET /weekly-plans?year=&week= ─────────────────────────────────────────────

export async function fetchMyWeeklyPlan(
  token: string,
  orgId: string,
  year: number,
  week: number,
): Promise<WeeklyPlanEntry[]> {
  const qs = new URLSearchParams({ year: String(year), week: String(week) });
  const res = await fetch(`${baseUrl}/weekly-plans?${qs}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<WeeklyPlanEntry[]>;
}

// ── GET /weekly-plans/team?year=&week= ────────────────────────────────────────

export async function fetchTeamWeeklyPlan(
  token: string,
  orgId: string,
  year: number,
  week: number,
): Promise<WeeklyPlanEntry[]> {
  const qs = new URLSearchParams({ year: String(year), week: String(week) });
  const res = await fetch(`${baseUrl}/weekly-plans/team?${qs}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(token, orgId),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<WeeklyPlanEntry[]>;
}

// ── PUT /weekly-plans/{date} ──────────────────────────────────────────────────

export async function setWeeklyPlanDay(
  token: string,
  orgId: string,
  date: string,
  body: SetDayInput,
): Promise<WeeklyPlanEntry> {
  const res = await fetch(`${baseUrl}/weekly-plans/${date}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      ...authHeaders(token, orgId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(res);
  return res.json() as Promise<WeeklyPlanEntry>;
}
