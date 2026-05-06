import { baseUrl } from "@/lib/api-client";
import type {
  PlanLocationOption,
  PlanLocationValue,
} from "@/modules/weekly-plan/locations";

export interface WeeklyPlanEntry {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string | null;
  date: string;
  work_location: PlanLocationValue;
  project: string | null;
}

export interface PlanApiAuth {
  token: string;
  orgSlug: string;
  memberId: string;
}

export interface WeeklyPlanDayInput {
  date: string;
  work_location: PlanLocationValue | null;
  project?: string | null;
}

function buildHeaders(auth: PlanApiAuth): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.token}`,
    "x-organization-slug": auth.orgSlug,
    "x-membership-id": auth.memberId,
    Accept: "application/json",
  };
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;

  let message = response.statusText;
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) message = body.detail;
  } catch {
    // Keep the status text when the body is not JSON.
  }

  throw new Error(message);
}

export async function fetchPlanLocations(auth: PlanApiAuth): Promise<PlanLocationOption[]> {
  const response = await fetch(`${baseUrl}/weekly-plans/locations`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<PlanLocationOption[]>;
}

export async function fetchMyWeeklyPlan(
  auth: PlanApiAuth,
  year: number,
  week: number,
): Promise<WeeklyPlanEntry[]> {
  const query = new URLSearchParams({ year: String(year), week: String(week) });
  const response = await fetch(`${baseUrl}/weekly-plans?${query}`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<WeeklyPlanEntry[]>;
}

export async function fetchTeamWeeklyPlan(
  auth: PlanApiAuth,
  year: number,
  week: number,
): Promise<WeeklyPlanEntry[]> {
  const query = new URLSearchParams({ year: String(year), week: String(week) });
  const response = await fetch(`${baseUrl}/weekly-plans/team?${query}`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<WeeklyPlanEntry[]>;
}

export async function fetchMyMonthlyPlan(
  auth: PlanApiAuth,
  year: number,
  month: number,
): Promise<WeeklyPlanEntry[]> {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  const response = await fetch(`${baseUrl}/weekly-plans/month?${query}`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(auth),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<WeeklyPlanEntry[]>;
}

export async function saveWeeklyPlan(
  auth: PlanApiAuth,
  year: number,
  week: number,
  days: WeeklyPlanDayInput[],
): Promise<WeeklyPlanEntry[]> {
  const query = new URLSearchParams({ year: String(year), week: String(week) });
  const response = await fetch(`${baseUrl}/weekly-plans/week?${query}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...buildHeaders(auth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ days }),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<WeeklyPlanEntry[]>;
}

export async function saveMonthlyPlan(
  auth: PlanApiAuth,
  year: number,
  month: number,
  days: WeeklyPlanDayInput[],
): Promise<WeeklyPlanEntry[]> {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  const response = await fetch(`${baseUrl}/weekly-plans/month?${query}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...buildHeaders(auth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ days }),
  });
  await throwIfNotOk(response);
  return response.json() as Promise<WeeklyPlanEntry[]>;
}
