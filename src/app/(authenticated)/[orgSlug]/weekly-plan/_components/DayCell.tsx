"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkLocationType,
  WORK_LOCATION_LABELS,
  type WeeklyPlanEntry,
  type SetDayInput,
} from "@/types/weekly_plan";

export interface DayCellProps {
  date:       string; // ISO "YYYY-MM-DD"
  entry:      WeeklyPlanEntry | undefined;
  readOnly?:  boolean;
  onDayChange?: (date: string, input: SetDayInput) => void;
}

const LOCATION_OPTIONS = Object.values(WorkLocationType);

export function DayCell({ date, entry, readOnly = false, onDayChange }: DayCellProps) {
  function handleLocationChange(value: string) {
    onDayChange?.(date, {
      work_location: value as WorkLocationType,
      project:       entry?.project ?? null,
    });
  }

  function handleProjectBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!entry?.workLocation) return;
    onDayChange?.(date, {
      work_location: entry.workLocation,
      project:       e.target.value.trim() || null,
    });
  }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {readOnly ? (
        <div className="text-sm font-medium text-foreground">
          {entry?.workLocation
            ? WORK_LOCATION_LABELS[entry.workLocation]
            : <span className="text-muted-foreground">—</span>}
        </div>
      ) : (
        <Select
          value={entry?.workLocation ?? ""}
          onValueChange={handleLocationChange}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_OPTIONS.map((loc) => (
              <SelectItem key={loc} value={loc} className="text-xs">
                {WORK_LOCATION_LABELS[loc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {readOnly ? (
        <div className="text-xs text-muted-foreground truncate">
          {entry?.project ?? ""}
        </div>
      ) : (
        <Input
          className="h-7 text-xs"
          placeholder="Project (optional)"
          defaultValue={entry?.project ?? ""}
          onBlur={handleProjectBlur}
          disabled={!entry?.workLocation}
        />
      )}
    </div>
  );
}
