// Bulk Attendance Module Types

export interface BulkWorkLogItem {
  id: string;
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  projectId?: string | null;
  projectTaskId?: string | null;
  title?: string | null;
  notes?: string | null;
}

export interface BulkAttendanceDay {
  date: string; // YYYY-MM-DD
  attendanceRecordId: string;
  clockIn: string | null;     // ISO datetime
  clockOut: string | null;    // ISO datetime
  totalHours: number | null;
  overtimeHours: number | null;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
  logs: BulkWorkLogItem[];
}

export interface GetBulkAttendanceRangeResponse {
  days: BulkAttendanceDay[];
}

export interface GetBulkAttendanceDayResponse {
  day: BulkAttendanceDay | null;
}

export interface UpsertBulkWorkLogItemInput {
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  projectId?: string;
  projectTaskId?: string;
  title?: string;
  notes?: string;
}

export interface UpsertBulkAttendanceDayInput {
  date: string; // YYYY-MM-DD
  logs: UpsertBulkWorkLogItemInput[];
}

export interface UpsertBulkAttendanceRequest {
  days: UpsertBulkAttendanceDayInput[];
}

export interface UpsertBulkAttendanceResponse {
  days: BulkAttendanceDay[];
}

export interface DeleteBulkAttendanceDayResponse {
  success: boolean;
  date: string;
}

// ─── Calendar event shape ─────────────────────────────────────────────────────

export interface CalendarWorkLogEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'work-log';
    date: string;       // YYYY-MM-DD
    projectId: string | null;
    projectTaskId: string | null;
    title: string | null;
    notes: string | null;
    isOptimistic?: boolean;
  };
}

/** Clock marker (in/out) rendered as a custom overlay */
export interface ClockMarker {
  date: string;         // YYYY-MM-DD
  type: 'clock-in' | 'clock-out';
  time: Date;
  isOptimistic?: boolean;
}

// ─── Local state shape ────────────────────────────────────────────────────────

/** Normalized per-day state held in the frontend store */
export interface BulkDayState {
  date: string;
  attendanceRecordId: string | null;
  clockIn: Date | null;
  clockOut: Date | null;
  totalHours: number | null;
  overtimeHours: number | null;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | null;
  logs: LocalWorkLog[];
}

export interface LocalWorkLog {
  /** Stable local ID — may be a real backend ID or a temp UUID */
  id: string;
  startTime: Date;
  endTime: Date;
  projectId: string | null;
  projectTaskId: string | null;
  title: string | null;
  notes: string | null;
  /** True while the backend hasn't confirmed this log yet */
  isOptimistic?: boolean;
}

// ─── Work log dialog state ────────────────────────────────────────────────────

export interface WorkLogDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  date: string | null;
  log: LocalWorkLog | null;
}

// ─── Save state ───────────────────────────────────────────────────────────────

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
