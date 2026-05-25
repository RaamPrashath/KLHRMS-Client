"use client";

import { useMemo, useState } from "react";
import { Briefcase, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const { data: allReqs = [], isLoading } = useJobRequisitionsQuery(
    orgSlug,
    memberId,
    "organization",
  );
  const [selectedReq, setSelectedReq] = useState<JobRequisitionRecord | null>(null);

  const openings = useMemo(() => allReqs.filter((r) => r.status === "APPROVED"), [allReqs]);

  return (
    <>
      <section className="bg-transparent border-none p-0 flex flex-col h-full w-full">
        <div className="flex items-start justify-between gap-4 border-b border-black/4 px-6 py-5 dark:border-white/4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">Open Internal Positions</h2>
          </div>
          {!isLoading && <span className="shrink-0 text-xs text-neutral-500">{openings.length} Active</span>}
        </div>

        {isLoading ? (
          <div className="flex flex-col divide-y divide-black/4 px-6 py-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-black/4 py-4">
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-neutral-100" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded-lg bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : openings.length === 0 ? (
          <div className="px-6 py-6">
            <div className="flex min-h-60 flex-col items-center justify-center rounded-[20px] border border-dashed border-[#dbe4ef] text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#f4f6fb]">
                <Briefcase className="size-6 text-neutral-400" />
              </div>
              <p className="text-sm font-medium text-neutral-900">No open positions right now</p>
              <p className="mt-1 text-xs text-neutral-500">Check back later for internal career updates and organizational postings.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col px-6">
            {openings.map((req) => (
              <button
                key={req.id}
                type="button"
                onClick={() => setSelectedReq(req)}
                className="flex items-center gap-4 border-b border-black/4 dark:border-white/4 py-3.5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] last:border-0 w-full"
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
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!selectedReq} onOpenChange={(open) => { if (!open) setSelectedReq(null); }}>
        <DialogContent className="max-w-lg border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden [&>button]:hidden">
          {selectedReq && (
            <div className="p-6">
              <DialogTitle className="text-xl font-semibold text-neutral-900 mb-4">{selectedReq.title}</DialogTitle>

              <Badge className="mb-4 inline-flex rounded-full bg-[#00874A]/[0.08] text-[#00874A] border border-[#00874A]/10 text-[11px] font-semibold uppercase">
                {selectedReq.employmentType.replaceAll("_", " ")}
              </Badge>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {selectedReq.location || "Remote"}{selectedReq.isRemote ? " (Remote)" : ""}</span>
                {selectedReq.salaryMin || selectedReq.salaryMax ? <span>{formatSalary(selectedReq)}</span> : null}
                <span>{selectedReq.openings} opening{selectedReq.openings > 1 ? "s" : ""}</span>
                <span>{selectedReq.departmentName ?? "General"}</span>
              </div>

              {selectedReq.description && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Description</p>
                  <p className="text-sm text-neutral-700 leading-relaxed">{selectedReq.description}</p>
                </div>
              )}

              {selectedReq.requirements && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Requirements</p>
                  <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">{selectedReq.requirements}</p>
                </div>
              )}

              {selectedReq.skills && selectedReq.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReq.skills.map((skill) => (
                      <span key={skill} className="inline-flex rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
