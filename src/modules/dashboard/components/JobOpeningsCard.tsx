"use client";

import { useMemo, useState } from "react";
import { Briefcase, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useJobRequisitionsQuery } from "@/modules/jobs/hooks/useJobRequisitionsQuery";
import type { JobRequisitionRecord } from "@/modules/jobs/types/jobRequisitionTypes";

interface JobOpeningsCardProps {
  orgSlug: string;
  memberId: string;
}

function formatSalary(record: JobRequisitionRecord): string {
  if (!record.salaryMin && !record.salaryMax) return "";
  const cur = record.currency || "INR";
  if (record.salaryMin && record.salaryMax) {
    return `${cur} ${formatNum(record.salaryMin)} – ${formatNum(record.salaryMax)}`;
  }
  if (record.salaryMin) return `From ${cur} ${formatNum(record.salaryMin)}`;
  return `Up to ${cur} ${formatNum(record.salaryMax!)}`;
}

function formatNum(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function JobOpeningsCard({ orgSlug, memberId }: Readonly<JobOpeningsCardProps>) {
  const { data: allReqs = [], isLoading } = useJobRequisitionsQuery(orgSlug, memberId, false);
  const [selectedReq, setSelectedReq] = useState<JobRequisitionRecord | null>(null);

  const openings = useMemo(() => allReqs.filter((r) => r.status === "APPROVED"), [allReqs]);

  return (
    <section className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-black/[0.04] flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">Open Positions</h2>
        {!isLoading && <span className="text-sm text-neutral-500">{openings.length} open</span>}
      </div>

      {isLoading ? (
        <div className="flex flex-col divide-y divide-black/4 px-4 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-black/4 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded-lg bg-neutral-100" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded-lg bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : openings.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-400">No open positions right now.</div>
      ) : (
        <div className="flex flex-col">
          {openings.map((req) => (
            <Popover key={req.id}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-4 border-b border-black/4 px-6 py-4 text-left transition-colors hover:bg-black/[0.02] last:border-0 w-full"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle">
                    <Briefcase className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">{req.title}</p>
                    <p className="truncate text-xs text-neutral-500 mt-0.5">
                      {req.departmentName ?? "No department"} · {req.openings} opening{req.openings > 1 ? "s" : ""} · {req.employmentType.replaceAll("_", " ")}
                    </p>
                  </div>
                  <Badge className="shrink-0 rounded-full bg-[#00874A]/[0.08] text-[#00874A] border border-[#00874A]/10 text-[11px] font-semibold uppercase px-2.5 py-0.5">
                    Open
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-[380px] p-0 border-0 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl overflow-hidden">
                <div className="bg-surface p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-semibold text-neutral-900">{req.title}</h3>
                    <Badge className="shrink-0 rounded-full bg-[#00874A]/[0.08] text-[#00874A] border border-[#00874A]/10 text-[11px] font-semibold uppercase">
                      {req.employmentType.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {req.location || "Remote"}{req.isRemote ? " (Remote)" : ""}</span>
                    {req.salaryMin || req.salaryMax ? <span>{formatSalary(req)}</span> : null}
                    <span>{req.openings} opening{req.openings > 1 ? "s" : ""}</span>
                    <span>{req.departmentName ?? "General"}</span>
                  </div>

                  {req.description && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Description</p>
                      <p className="text-sm text-neutral-700 leading-relaxed">{req.description}</p>
                    </div>
                  )}

                  {req.requirements && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">Requirements</p>
                      <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{req.requirements}</p>
                    </div>
                  )}

                  {req.skills && req.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {req.skills.map((skill) => (
                          <span key={skill} className="inline-flex rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}
    </section>
  );
}
