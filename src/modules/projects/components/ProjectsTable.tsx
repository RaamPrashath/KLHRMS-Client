'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { Users, ListTodo, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProjectSummary, ProjectStatus } from '@/modules/projects/types/projectTypes';
import {
  ExpandableScreen,
  ExpandableScreenTrigger,
  ExpandableScreenContent,
} from '@/components/ui/expandable-screen';
import { useProjectDetailQuery } from '@/modules/projects/hooks/useProjectsQuery';

interface ProjectsTableProps {
  data: ProjectSummary[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  statusFilter: ProjectStatus | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus | 'ALL') => void;
  onClearAll: () => void;
  onRowClick: (project: ProjectSummary) => void;
  orgSlug: string;
  memberId: string;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-[#eef9f1] text-[#156f3d]',
  ON_HOLD: 'bg-[#fff7e8] text-[#8a5a00]',
  COMPLETED: 'bg-[#eef5ff] text-[#2454a6]',
  CANCELLED: 'bg-[#fff0f0] text-[#a12323]',
};

function ProjectsSkeletonList({ pageSize }: { readonly pageSize: number }) {
  const count = pageSize || 8;
  const skeletonIds = Array.from({ length: count }, (_, i) => `skeleton-card-${i}`);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {skeletonIds.map((id) => (
        <div key={id} className="p-4 bg-white rounded-lg border border-black/5 h-36 flex flex-col justify-between animate-pulse">
          <div>
            <div className="h-5 w-2/3 bg-neutral-200 rounded" />
            <div className="h-3 w-1/2 bg-neutral-100 rounded mt-2" />
          </div>
          <div className="flex justify-between items-center mt-4 border-t pt-2 border-black/5">
            <div className="h-4 w-1/3 bg-neutral-200 rounded" />
            <div className="h-5 w-1/4 bg-neutral-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TabBarProps {
  readonly tabs: { value: string; label: string; count?: number }[];
  readonly value: string;
  readonly onValueChange: (v: 'tasks' | 'members') => void;
}

function TabBar({
  tabs,
  value,
  onValueChange,
}: TabBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const activeIdx = tabs.findIndex((t) => t.value === value);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(`[data-tab-index="${activeIdx}"]`);
    if (!activeBtn) return;
    const cr = container.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    setIndicatorStyle({ left: br.left - cr.left, width: br.width });
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 w-full rounded-xl bg-neutral-50 p-1 border border-black/5 relative"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {tabs.map((tab, idx) => (
        <button
          key={tab.value}
          data-tab-index={idx}
          type="button"
          onClick={() => onValueChange(tab.value as 'tasks' | 'members')}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 h-8 px-4 text-[13px] font-medium rounded-lg relative z-10 transition-colors duration-200 cursor-pointer',
            value === tab.value ? 'text-primary' : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs',
              value === tab.value ? 'text-primary/70' : 'text-neutral-400',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface ExpandedProjectContentProps {
  readonly projectId: string;
  readonly orgSlug: string;
  readonly memberId: string;
}

function ExpandedProjectContent({
  projectId,
  orgSlug,
  memberId,
}: ExpandedProjectContentProps) {
  const { data: project, isLoading, isError } = useProjectDetailQuery(orgSlug, memberId, projectId);
  const [activeTab, setActiveTab] = useState<'tasks' | 'members'>('tasks');

  if (isLoading) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center p-8 text-sm text-destructive-text">
        Failed to load project details.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-neutral-900 select-text p-6">
      {/* Header */}
      <div className="pb-4 border-b border-black/5">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{project.name}</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Client: <span className="font-semibold text-neutral-800">{project.clientName || 'Internal'}</span>
        </p>
      </div>

      {/* Tab Switcher (using the elegant TabBar component design) */}
      <div className="mt-4 w-full sm:w-[320px]">
        <TabBar
          tabs={[
            { value: 'tasks', label: 'Tasks', count: project.tasks?.length ?? 0 },
            { value: 'members', label: 'Members', count: project.members?.length ?? 0 },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="py-6 overflow-y-auto flex-1 min-h-0">
        {activeTab === 'tasks' ? (
          <div className="flex flex-col min-h-0 animate-in fade-in-50 duration-150">
            <div className="border border-black/5 rounded-lg bg-neutral-50/50 p-4">
              {!project.tasks || project.tasks.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-8">No tasks yet.</p>
              ) : (
                <ul className="space-y-2">
                  {project.tasks.map((task) => (
                    <li key={task.id} className="p-3 bg-white rounded-md border border-black/5 shadow-sm text-sm text-neutral-700 font-medium">
                      {task.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 animate-in fade-in-50 duration-150">
            <div className="border border-black/5 rounded-lg bg-neutral-50/50 p-4">
              {!project.members || project.members.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-8">No members assigned.</p>
              ) : (
                <ul className="space-y-2">
                  {project.members.map((member) => (
                    <li key={member.id} className="p-3 bg-white rounded-md border border-black/5 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">{member.name || 'Unknown'}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{member.email || ''}</p>
                      </div>
                      {member.role && (
                        <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md">
                          {member.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsTable({
  data,
  isLoading,
  pageSize,
  search,
  onSearchChange,
  orgSlug,
  memberId,
}: Readonly<ProjectsTableProps>) {
  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      {/* Search bar of half width (w-1/2) */}
      <div className="relative w-full md:w-1/2">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        <Input
          placeholder="Search projects by name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white border border-black/10 focus:border-primary text-sm h-10 w-full rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
        />
      </div>

      <div className="w-full flex-1">
        {isLoading ? (
          <ProjectsSkeletonList pageSize={pageSize} />
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400 mt-6 bg-white border border-black/5 rounded-lg">
            No projects found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {data.map((project) => (
              <ExpandableScreen key={project.id} layoutId={`project-${project.id}`} contentRadius="8px">
                <ExpandableScreenTrigger className="w-full">
                  <div className="p-4 bg-white rounded-lg border border-black/5 hover:border-indigo-500 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between h-36">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-neutral-900 truncate text-left" title={project.name}>
                        {project.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1 truncate text-left">
                        Client: <span className="font-medium text-neutral-700">{project.clientName || 'Internal'}</span>
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-4 border-t pt-2 border-black/5">
                      <span className="text-xs text-neutral-600 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-neutral-400" />
                        {project.memberCount} {project.memberCount === 1 ? 'person' : 'people'}
                      </span>
                      <Badge className={cn('rounded-lg px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', STATUS_STYLES[project.status])}>
                        {project.status.replaceAll('_', ' ').toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </ExpandableScreenTrigger>
                <ExpandableScreenContent
                  className="bg-white border border-[#e5e5ea] shadow-2xl rounded-lg max-w-4xl mx-auto my-auto h-[80vh] flex flex-col"
                  closeButtonClassName="text-neutral-500 hover:text-neutral-800 bg-transparent hover:bg-transparent shadow-none cursor-pointer"
                >
                  <ExpandedProjectContent
                    projectId={project.id}
                    orgSlug={orgSlug}
                    memberId={memberId}
                  />
                </ExpandableScreenContent>
              </ExpandableScreen>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
