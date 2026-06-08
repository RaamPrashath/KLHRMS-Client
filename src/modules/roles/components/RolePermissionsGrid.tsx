'use client';

import React from 'react';
import {
  HRMS_MODULES,
  HRMS_ACTIONS,
  nextScope,
  type ScopeValue,
} from '@/modules/roles/schema/roleSchemas';
import { type RolePermissions } from '@/modules/roles/types/role';

// ─── Scope badge styles ───────────────────────────────────────────────────────

interface ScopeConfig {
  label: string;
  classes: string;
}

const SCOPE_CONFIG: Record<ScopeValue, ScopeConfig> = {
  none:         { label: '—',    classes: 'text-neutral-300 bg-transparent border border-dashed border-neutral-200 hover:border-neutral-300 hover:text-neutral-400' },
  self:         { label: 'Self', classes: 'bg-info-bg text-info-text border border-info-border' },
  department:   { label: 'Dept', classes: 'bg-primary-subtle text-primary border border-primary-subtle' },
  organization: { label: 'Org',  classes: 'bg-success-bg text-success-text border border-success-border' },
};

// All column headers are now just the standard actions
const ALL_COLUMNS = [...HRMS_ACTIONS] as string[];

// Human-readable module labels
const MODULE_LABELS: Record<string, string> = {
  employees:          'Employees',
  organization:       'Organization',
  departments:        'Departments',
  permission:         'Permissions',
  attendance:         'Attendance',
  attendanceReport:   'Attendance Report',
  leaves:             'Leaves',
  timesheet:          'Timesheet',
  projects:           'Projects',
  weeklyPlan:         'Weekly Plan',
  jobs:               'Jobs',
  candidates:         'Candidates',
  interviews:         'Interviews',
  offers:             'Offers',
  onboarding:         'Onboarding',
  documentCollection: 'Doc Collection',
  offboarding:        'Offboarding',
  knowledgeTransfer:  'Knowledge Transfer',
  salaryStructures:   'Salary Structures',
  payroll:            'Payroll',
  payslips:           'Payslips',
  tax:                'Tax',
  procurement:        'Procurement',
  assets:             'Assets',
  maintenance:        'Maintenance',
  helpdesk:           'Helpdesk',
  documents:          'Documents',
};

// Section groupings for visual separation
const SECTIONS: { label: string; modules: string[] }[] = [
  { label: 'People',            modules: ['employees', 'organization', 'departments', 'permission', 'projects'] },
  { label: 'Time & Attendance', modules: ['attendance', 'attendanceReport', 'leaves', 'timesheet', 'weeklyPlan'] },
  { label: 'Recruitment',       modules: ['jobs', 'candidates', 'interviews', 'offers'] },
  { label: 'Lifecycle',         modules: ['onboarding', 'documentCollection', 'offboarding', 'knowledgeTransfer'] },
  { label: 'Payroll & Finance', modules: ['salaryStructures', 'payroll', 'payslips', 'tax', 'procurement'] },
  { label: 'Operations',        modules: ['assets', 'maintenance', 'helpdesk', 'documents'] },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RolePermissionsGridProps {
  value: RolePermissions;
  onChange: (permissions: RolePermissions) => void;
  disabled?: boolean;
}

// ─── Scope badge button ───────────────────────────────────────────────────────

interface ScopeBadgeProps {
  module: string;
  action: string;
  scope: ScopeValue;
  disabled: boolean;
  onActivate: (module: string, action: string) => void;
}

function ScopeBadge({ module, action, scope, disabled, onActivate }: Readonly<ScopeBadgeProps>) {
  const config = SCOPE_CONFIG[scope];

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(module, action);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onActivate(module, action)}
      onKeyDown={handleKeyDown}
      aria-label={`${module} ${action}: ${scope}. Click to change.`}
      title={`${scope === 'none' ? 'No access' : scope} — click to cycle`}
      className={`
        inline-flex items-center justify-center
        w-[60px] px-2 py-1
        text-[11px] font-medium rounded-full
        cursor-pointer select-none
        transition-all duration-100 motion-reduce:transition-none
        active:scale-95
        disabled:cursor-not-allowed disabled:opacity-40
        focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
        ${config.classes}
      `}
    >
      {config.label}
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// All modules now support all standard actions (view, create, edit, delete, approve)
function moduleSupportsAction(module: string, action: string): boolean {
  void module;
  void action;
  return true;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RolePermissionsGrid({
  value,
  onChange,
  disabled = false,
}: Readonly<RolePermissionsGridProps>) {
  function getCurrentScope(module: string, action: string): ScopeValue {
    const scope = value[module]?.[action];
    if (!scope || scope === 'none') return 'none';
    if (scope === 'team') return 'department';
    return scope as ScopeValue;
  }

  function handleCellActivate(module: string, action: string) {
    if (disabled) return;
    const current = getCurrentScope(module, action);
    const next = nextScope(current);
    const existingModule = value[module] ?? {};
    onChange({
      ...value,
      [module]: {
        ...existingModule,
        [action]: next,
      },
    });
  }

  // Modules that support a given extra action — moved to outer scope above

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full border-collapse table-fixed" style={{ minWidth: `${180 + ALL_COLUMNS.length * 80}px` }}>
        <colgroup>
          <col style={{ width: '180px' }} />
          {ALL_COLUMNS.map((action) => (
            <col key={action} style={{ width: '80px' }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-canvas border-b border-neutral-200">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider sticky left-0 bg-canvas z-10 will-change-transform shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
              Module
            </th>
            {ALL_COLUMNS.map((action) => (
              <th
                key={action}
                className="text-center px-2 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider"
              >
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((section) => (
            <React.Fragment key={section.label}>
              {/* Section header row — first cell is sticky to keep section context pinned */}
              <tr className="bg-neutral-50/80 border-b border-neutral-100">
                <td className="px-4 py-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest sticky left-0 bg-neutral-50/90 z-10 will-change-transform shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                  {section.label}
                </td>
                {ALL_COLUMNS.map((action) => (
                  <td key={action} className="bg-neutral-50/80" />
                ))}
              </tr>

              {/* Module rows */}
              {section.modules
                .filter((m) => (HRMS_MODULES as readonly string[]).includes(m))
                .map((module) => (
                  <tr
                    key={module}
                    className="border-b border-neutral-100 last:border-0 hover:bg-canvas transition-colors duration-75 bg-surface"
                  >
                    <td className="px-4 py-2.5 text-[13px] font-medium text-neutral-700 sticky left-0 bg-inherit z-10 will-change-transform shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                      {MODULE_LABELS[module] ?? module}
                    </td>
                    {ALL_COLUMNS.map((action) => (
                      <td key={action} className="px-2 py-2 text-center">
                        {moduleSupportsAction(module, action) ? (
                          <ScopeBadge
                            module={module}
                            action={action}
                            scope={getCurrentScope(module, action)}
                            disabled={disabled}
                            onActivate={handleCellActivate}
                          />
                        ) : (
                          <span className="inline-flex items-center justify-center w-[60px] text-neutral-200 text-[11px]">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
