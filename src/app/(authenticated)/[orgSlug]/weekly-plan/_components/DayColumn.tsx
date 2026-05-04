"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  WorkLocationType,
  WORK_LOCATION_LABELS,
  WORK_LOCATION_COLORS,
} from "@/types/weekly_plan";

export interface DayDraft {
  work_location: WorkLocationType | "";
  project: string;
}

export interface DayColumnProps {
  /** ISO date string "YYYY-MM-DD" */
  date: string;
  /** Display label e.g. "Mon 4" */
  dayLabel: string;
  draft: DayDraft;
  readOnly?: boolean;
  onChange?: (date: string, draft: DayDraft) => void;
}

const LOCATION_OPTIONS = Object.values(WorkLocationType) as WorkLocationType[];

export function DayColumn({
  date,
  dayLabel,
  draft,
  readOnly = false,
  onChange,
}: DayColumnProps) {
  const hasLocation = draft.work_location !== "";
  const colorClass = hasLocation
    ? WORK_LOCATION_COLORS[draft.work_location as WorkLocationType]
    : "bg-muted/40 text-muted-foreground";

  function handleLocationChange(value: string) {
    onChange?.(date, {
      ...draft,
      work_location: value as WorkLocationType,
    });
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(date, {
      ...draft,
      project: e.target.value,
    });
  }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* Date header */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-0.5">
        {dayLabel}
      </div>

      {/* Location selector */}
      {readOnly ? (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold min-h-[40px] flex items-center",
            colorClass,
          )}
        >
          {hasLocation
            ? WORK_LOCATION_LABELS[draft.work_location as WorkLocationType]
            : <span className="font-normal opacity-60">—</span>}
        </div>
      ) : (
        <Select
          value={draft.work_location}
          onValueChange={handleLocationChange}
        >
          <SelectTrigger
            className={cn(
              "h-10 w-full text-sm font-semibold border-0 rounded-lg shadow-none focus:ring-0 focus-visible:ring-0",
              hasLocation ? colorClass : "bg-muted/40 text-muted-foreground",
            )}
          >
            <SelectValue placeholder="Select location…" />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_OPTIONS.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {WORK_LOCATION_LABELS[loc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Project / task card */}
      <div className="rounded-lg border bg-card shadow-xs min-h-[64px] flex flex-col">
        {readOnly ? (
          <div className="px-3 py-2.5 text-sm text-foreground">
            {draft.project ? (
              <span>{draft.project}</span>
            ) : (
              <span className="text-muted-foreground text-xs">No task</span>
            )}
          </div>
        ) : (
          <>
            {draft.project && (
              <div className="px-3 pt-2.5 pb-1 text-sm text-foreground">
                {draft.project}
              </div>
            )}
            <div className="px-2 py-1.5">
              <Input
                className="h-7 text-xs border-0 shadow-none bg-transparent px-1 placeholder:text-muted-foreground/60 focus-visible:ring-0"
                placeholder="+ Add task"
                value={draft.project}
                onChange={handleProjectChange}
                disabled={!hasLocation}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
