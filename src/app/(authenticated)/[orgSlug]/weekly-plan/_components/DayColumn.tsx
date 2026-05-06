"use client";

import { memo, type ChangeEvent } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PlanLocationOption, PlanLocationValue } from "@/types/weekly_plan";
import { PLAN_LOCATION_THEMES } from "@/types/weekly_plan";

export interface DayDraft {
  work_location: PlanLocationValue | "";
  project: string;
}

interface DayColumnProps {
  date: string;
  dayLabel: string;
  draft: DayDraft;
  locations: PlanLocationOption[];
  readOnly?: boolean;
  isToday?: boolean;
  onChange?: (date: string, draft: DayDraft) => void;
}

export const DayColumn = memo(function DayColumn({
  date,
  dayLabel,
  draft,
  locations,
  readOnly = false,
  isToday = false,
  onChange,
}: DayColumnProps) {
  const location = draft.work_location || null;
  const theme = location ? PLAN_LOCATION_THEMES[location] : null;

  function handleLocationChange(value: string) {
    onChange?.(date, {
      ...draft,
      work_location: value as PlanLocationValue,
    });
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div
        className={cn(
          "rounded-t-[20px] border border-b-0 px-4 py-3 transition-colors duration-300",
          theme ? `${theme.bg} ${theme.border}` : "border-border bg-muted/40",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {dayLabel.split(" ")[0]}
            </span>
            <span className="text-xl font-semibold text-foreground">
              {dayLabel.split(" ")[1]}
            </span>
          </div>
          {isToday ? (
            <span className="rounded-full bg-foreground px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-background">
              Today
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "border-x px-3 py-3 transition-colors duration-300",
          theme ? theme.border : "border-border",
        )}
      >
        {readOnly ? (
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-xs font-semibold",
              theme ? `${theme.bg} ${theme.text}` : "bg-muted/50 text-muted-foreground",
            )}
          >
            {location
              ? locations.find((item) => item.value === location)?.label ?? location
              : "Unset"}
          </div>
        ) : (
          <Select value={location ?? undefined} onValueChange={handleLocationChange}>
            <SelectTrigger
              className={cn(
                "h-10 rounded-2xl border-0 px-3 text-left text-xs font-semibold shadow-none transition-all duration-300",
                theme ? `${theme.bg} ${theme.text}` : "bg-muted/50 text-muted-foreground",
              )}
            >
              <SelectValue placeholder="Set location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((item) => {
                const itemTheme = PLAN_LOCATION_THEMES[item.value];
                return (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", itemTheme.dot)} />
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <div
        className={cn(
          "flex min-h-[100px] flex-1 flex-col rounded-b-[20px] border bg-white p-3 transition-colors duration-300",
          theme ? theme.border : "border-border",
        )}
      >
        {readOnly ? (
          <div className="flex flex-col items-center justify-center flex-1">
             <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-bold">Planned</p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="text-[10px] text-muted-foreground/30 uppercase tracking-widest font-bold">
              {location ? "Active" : "Pending"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
