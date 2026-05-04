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
} from "@/types/weekly_plan";
import { Home, Building2, Blend, Palmtree, Sun, Plus } from "lucide-react";

export interface DayDraft {
  work_location: WorkLocationType | "";
  project: string;
}

export interface DayColumnProps {
  date: string;
  dayLabel: string;
  draft: DayDraft;
  readOnly?: boolean;
  onChange?: (date: string, draft: DayDraft) => void;
  isToday?: boolean;
}

const LOCATION_OPTIONS = Object.values(WorkLocationType) as WorkLocationType[];

// Planner-style bucket colors — each location gets a distinct hue
const LOCATION_BUCKET: Record<WorkLocationType, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: React.ElementType;
}> = {
  home:    { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200",    dot: "bg-sky-500",    icon: Home },
  office:  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500", icon: Building2 },
  hybrid:  { bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-200",dot: "bg-emerald-500",icon: Blend },
  leave:   { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500",  icon: Palmtree },
  holiday: { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-200",   dot: "bg-rose-500",   icon: Sun },
};

export function DayColumn({
  date,
  dayLabel,
  draft,
  readOnly = false,
  onChange,
  isToday = false,
}: DayColumnProps) {
  const hasLocation = draft.work_location !== "";
  const bucket = hasLocation ? LOCATION_BUCKET[draft.work_location as WorkLocationType] : null;
  const LocationIcon = bucket?.icon;

  function handleLocationChange(value: string) {
    onChange?.(date, { ...draft, work_location: value as WorkLocationType });
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange?.(date, { ...draft, project: e.target.value });
  }

  return (
    <div className="flex flex-col gap-0 min-w-0">
      {/* ── Day header — Planner bucket style ── */}
      <div
        className={cn(
          "rounded-t-lg px-3 py-2.5 flex items-center justify-between",
          hasLocation && bucket
            ? `${bucket.bg} ${bucket.border} border-b-0 border`
            : "bg-muted/50 border border-border border-b-0",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">

          <div className="flex flex-col min-w-0">
            <span
              className={cn(
                "text-[11px] font-bold uppercase tracking-widest leading-none",
                isToday ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {dayLabel.split(" ")[0]}
            </span>
            <span
              className={cn(
                "text-lg font-black leading-tight tabular-nums",
                isToday ? "text-foreground" : "text-muted-foreground/70",
              )}
            >
              {dayLabel.split(" ")[1]}
            </span>
          </div>
        </div>

        {/* Today indicator */}
        {isToday && (
          <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
        )}
      </div>

      {/* ── Location selector / badge ── */}
      <div
        className={cn(
          "border-x",
          hasLocation && bucket ? bucket.border : "border-border",
        )}
      >
        {readOnly ? (
          <div
            className={cn(
              "px-3 py-2 text-xs font-semibold flex items-center gap-1.5",
              hasLocation && bucket
                ? `${bucket.bg} ${bucket.text}`
                : "bg-muted/30 text-muted-foreground",
            )}
          >
            
            {hasLocation
              ? WORK_LOCATION_LABELS[draft.work_location as WorkLocationType]
              : <span className="opacity-50">Not set</span>}
          </div>
        ) : (
          <Select value={draft.work_location} onValueChange={handleLocationChange}>
            <SelectTrigger
              className={cn(
                "h-8 w-full text-xs font-semibold border-0 rounded-none shadow-none",
                "focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                hasLocation && bucket
                  ? `${bucket.bg} ${bucket.text}`
                  : "bg-muted/30 text-muted-foreground",
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <SelectValue placeholder="Set location…" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {LOCATION_OPTIONS.map((loc) => {
                const b = LOCATION_BUCKET[loc];
                const Icon = b.icon;
                return (
                  <SelectItem key={loc} value={loc}>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", b.dot)} />
                      {/* <Icon className={cn("h-3.5 w-3.5", b.text)} /> */}
                      <span>{WORK_LOCATION_LABELS[loc]}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Task card body — Planner card style ── */}
      <div
        className={cn(
          "rounded-b-lg border flex-1 flex flex-col min-h-[120px]",
          hasLocation && bucket ? bucket.border : "border-border",
          "bg-card",
        )}
      >
        {readOnly ? (
          <div className="p-3 flex-1">
            {draft.project ? (
              <div
                className={cn(
                  "rounded-md px-2.5 py-2 text-xs font-medium",
                  hasLocation && bucket
                    ? `${bucket.bg} ${bucket.text}`
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                {draft.project}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40 italic">No task</p>
            )}
          </div>
        ) : (
          <div className="p-2.5 flex-1 flex flex-col gap-2">
            {/* Existing task chip */}
            {draft.project && (
              <div
                className={cn(
                  "rounded-md px-2.5 py-2 text-xs font-medium",
                  hasLocation && bucket
                    ? `${bucket.bg} ${bucket.text}`
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                {draft.project}
              </div>
            )}

            {/* Add task input */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors",
                hasLocation
                  ? "hover:bg-muted/60 cursor-text"
                  : "opacity-40 cursor-not-allowed",
              )}
            >
              <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                className={cn(
                  "h-5 text-xs border-0 shadow-none bg-transparent p-0",
                  "placeholder:text-muted-foreground/50 focus-visible:ring-0",
                )}
                placeholder="Add a task"
                value={draft.project}
                onChange={handleProjectChange}
                disabled={!hasLocation}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
