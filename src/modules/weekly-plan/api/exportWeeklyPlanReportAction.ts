"use server";

import { getHrmsApiUrl } from "@/lib/deployment-env";
import type { PlanExportPayload } from "@/modules/weekly-plan/types";

function getApiUrl(): string {
  return getHrmsApiUrl().replace(/\/$/, "");
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-organization-slug": orgSlug,
    "x-membership-id": memberId,
  };
}

export async function exportWeeklyPlanReportAction(params: {
  orgSlug: string;
  memberId: string;
  payload: PlanExportPayload;
}): Promise<Blob> {
  const res = await fetch(`${getApiUrl()}/weekly-plans/export`, {
    method: "POST",
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.payload),
  });

  if (!res.ok) {
    let message = `Export failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") message = body.detail;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return res.blob();
}
