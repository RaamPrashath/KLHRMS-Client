'use client';

import {
  HRMS_MODULES,
  HRMS_ACTIONS,
  getActionsForModule,
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
  none: { label: '—', classes: 'text-neutral-300 bg-transparent border border-dashed border-neutral-200 hover:border-neutral-300 hover:text-neutral-400' },
  self: { label: 'Self', classes: 'bg-info-bg text-info-text border border-info-border' },
  team: { label: 'Team', classes: 'bg-warning-bg text-warning-text border border-warning-border' },
  department: { label: 'Dept', classes: 'bg-primary-subtle text-primary border border-primary-subtle' },
  organization: { label: 'Org', classes: 'bg-success-bg text-success-text border border-success-border' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface RolePermissionsGridProps {
  value: RolePermissions;
  onChange: (permissions: RolePermissions) => void;
  disabled?: boolean;
}

export function RolePermissionsGrid({
  value,
  onChange,
  disabled = false,
}: Readonly<RolePermissionsGridProps>) {
  function getCurrentScope(module: string, action: string): ScopeValue {
    const scope = value[module]?.[action];
    if (!scope || scope === 'none') return 'none';
    return scope as ScopeValue;
  }

  function handleCellActivate(module: string, action: string) {
    if (disabled) return;
    const current = getCurrentScope(module, action);
    const next = nextScope(current);
    onChange({
      ...value,
      [module]: {
        ...(value[module] ?? {}),
        [action]: next,
      },
    });
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    module: string,
    action: string,
  ) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCellActivate(module, action);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="min-w-[520px] w-full border-collapse">
        <thead>
          <tr className="bg-canvas">
            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider w-32 border-b border-neutral-200">
              Module
            </th>
            {HRMS_ACTIONS.map((action) => (
              <th
                key={action}
                className="text-center px-3 py-2.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-200"
              >
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HRMS_MODULES.map((module, rowIdx) => {
            const moduleActions = getActionsForModule(module);
            const hasExtraActions = moduleActions.length > HRMS_ACTIONS.length;
            
            return (
              <tr
                key={module}
                className={`
                  group/row border-b border-neutral-100 last:border-0
                  hover:bg-canvas transition-colors duration-75
                  ${rowIdx % 2 === 1 ? 'bg-neutral-50/40' : 'bg-surface'}
                `}
              >
                <td className="px-4 py-2.5 text-[13px] font-medium text-neutral-700">
                  <div className="flex flex-col gap-0.5">
                    <span className="capitalize">{module}</span>
                    {hasExtraActions && (
                      <span className="text-[10px] text-neutral-400 font-normal">
                        + {moduleActions.slice(HRMS_ACTIONS.length).join(', ')}
                      </span>
                    )}
                  </div>
                </td>
                {HRMS_ACTIONS.map((action) => {
                  const scope = getCurrentScope(module, action);
                  const config = SCOPE_CONFIG[scope];
                  return (
                    <td key={action} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleCellActivate(module, action)}
                        onKeyDown={(e) => handleKeyDown(e, module, action)}
                        aria-label={`${module} ${action}: ${scope}. Click to change.`}
                        title={`${scope === 'none' ? 'No access' : scope} — click to cycle`}
                        className={`
                          inline-flex items-center justify-center
                          w-[72px] px-2 py-1
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
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Extra actions section for modules with domain-specific actions */}
      {HRMS_MODULES.some(m => getActionsForModule(m).length > HRMS_ACTIONS.length) && (
        <div className="mt-4 p-4 bg-canvas rounded-lg border border-neutral-200">
          <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3">
            Domain-Specific Actions
          </h4>
          <div className="space-y-3">
            {HRMS_MODULES.map((module) => {
              const allActions = getActionsForModule(module);
              const extraActions = allActions.slice(HRMS_ACTIONS.length);
              
              if (extraActions.length === 0) return null;
              
              return (
                <div key={`${module}-extra`} className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-neutral-700 capitalize w-32">
                    {module}
                  </span>
                  <div className="flex gap-2">
                    {extraActions.map((action) => {
                      const scope = getCurrentScope(module, action);
                      const config = SCOPE_CONFIG[scope];
                      return (
                        <div key={action} className="flex items-center gap-2">
                          <span className="text-[12px] text-neutral-500 capitalize">
                            {action}:
                          </span>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleCellActivate(module, action)}
                            onKeyDown={(e) => handleKeyDown(e, module, action)}
                            aria-label={`${module} ${action}: ${scope}. Click to change.`}
                            title={`${scope === 'none' ? 'No access' : scope} — click to cycle`}
                            className={`
                              inline-flex items-center justify-center
                              w-[72px] px-2 py-1
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
