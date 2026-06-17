'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ProjectForAttendance } from '@/modules/projects/types/projectTypes';

interface ProjectTaskSelectorProps {
  projects: ProjectForAttendance[];
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  onProjectChange: (projectId: string | null) => void;
  onTaskChange: (taskId: string | null) => void;
  projectError?: string;
  taskError?: string;
  disabled?: boolean;
  onProjectOpen?: () => void;
}

export function ProjectTaskSelector({
  projects,
  selectedProjectId,
  selectedTaskId,
  onProjectChange,
  onTaskChange,
  projectError,
  taskError,
  disabled = false,
  onProjectOpen,
}: Readonly<ProjectTaskSelectorProps>) {
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const availableTasks = useMemo(
    () => selectedProject?.tasks ?? [],
    [selectedProject],
  );

  const selectedTask = useMemo(
    () => availableTasks.find((task) => task.id === selectedTaskId) ?? null,
    [availableTasks, selectedTaskId],
  );

  function handleProjectSelect(projectId: string) {
    if (projectId === selectedProjectId) {
      onProjectChange(null);
      onTaskChange(null);
    } else {
      onProjectChange(projectId);
      onTaskChange(null);
    }
    setProjectOpen(false);
  }

  function handleTaskSelect(taskId: string) {
    if (taskId === selectedTaskId) {
      onTaskChange(null);
    } else {
      onTaskChange(taskId);
    }
    setTaskOpen(false);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="project-select" className="text-[13px] font-medium text-neutral-700">
          Project <span className="font-bold text-destructive">*</span>
        </label>
        <Popover
          open={projectOpen}
          onOpenChange={(open) => {
            setProjectOpen(open);
            if (open) onProjectOpen?.();
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id="project-select"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={projectOpen}
              disabled={disabled}
              className={cn(
                'w-full justify-between border-neutral-200 bg-surface text-sm text-neutral-900 hover:bg-neutral-50',
                projectError && 'border-destructive',
              )}
            >
              <span className="truncate">
                {selectedProject ? selectedProject.name : 'Search project...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] border border-neutral-100 bg-surface p-0 shadow-[var(--shadow-3)]" align="start">
            <Command className="bg-surface text-neutral-900 [&_[data-slot=command-input-wrapper]]:p-2 [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-neutral-100 [&_[data-slot=input-group]]:bg-surface [&_[data-slot=input-group]]:text-neutral-900">
              <CommandInput placeholder="Search projects..." className="placeholder:text-neutral-400" />
              <CommandList>
                <CommandEmpty className="text-neutral-500">No project found.</CommandEmpty>
                <CommandGroup className="bg-surface">
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.name} ${project.tasks.map((task) => task.name).join(' ')}`}
                      onSelect={() => handleProjectSelect(project.id)}
                      className="justify-between bg-surface px-3 py-2 text-neutral-900 aria-selected:bg-neutral-50 aria-selected:text-neutral-900"
                    >
                      <span className="truncate">{project.name}</span>
                      {selectedProjectId === project.id ? (
                        <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {projectError ? (
          <p className="text-xs font-medium text-destructive">{projectError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-select" className="text-[13px] font-medium text-neutral-700">
          Task <span className="font-bold text-destructive">*</span>
        </label>
        <Popover open={taskOpen} onOpenChange={setTaskOpen}>
          <PopoverTrigger asChild>
            <Button
              id="task-select"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={taskOpen}
              disabled={disabled || !selectedProjectId}
              className={cn(
                'w-full justify-between border-neutral-200 bg-surface text-sm text-neutral-900 hover:bg-neutral-50 disabled:bg-neutral-50 disabled:text-neutral-400',
                taskError && 'border-destructive',
              )}
            >
              <span className="truncate">
                {selectedTask
                  ? selectedTask.name
                  : !selectedProjectId
                    ? 'Select project first...'
                    : availableTasks.length === 0
                      ? 'No tasks available'
                      : 'Search task...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] border border-neutral-100 bg-surface p-0 shadow-[var(--shadow-3)]" align="start">
            <Command className="bg-surface text-neutral-900 [&_[data-slot=command-input-wrapper]]:p-2 [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-neutral-100 [&_[data-slot=input-group]]:bg-surface [&_[data-slot=input-group]]:text-neutral-900">
              <CommandInput placeholder="Search tasks..." className="placeholder:text-neutral-400" />
              <CommandList>
                <CommandEmpty className="text-neutral-500">
                  {availableTasks.length === 0
                    ? 'This project has no tasks yet.'
                    : 'No task found.'}
                </CommandEmpty>
                <CommandGroup className="bg-surface">
                  {availableTasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={task.name}
                      onSelect={() => handleTaskSelect(task.id)}
                      className="justify-between bg-surface px-3 py-2 text-neutral-900 aria-selected:bg-neutral-50 aria-selected:text-neutral-900"
                    >
                      <span className="truncate">{task.name}</span>
                      {selectedTaskId === task.id ? (
                        <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {taskError ? (
          <p className="text-xs font-medium text-destructive">{taskError}</p>
        ) : null}
      </div>
    </div>
  );
}
