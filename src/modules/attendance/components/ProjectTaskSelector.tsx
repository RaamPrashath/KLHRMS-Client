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
        <label htmlFor="project-select" className="text-[14px] font-semibold text-ink-muted-48">
          Project <span className="font-bold text-destructive">*</span>
        </label>
        <Popover open={projectOpen} onOpenChange={setProjectOpen}>
          <PopoverTrigger asChild>
            <Button
              id="project-select"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={projectOpen}
              disabled={disabled}
              className={cn(
                'w-full justify-between border-hairline bg-canvas/30 hover:bg-canvas/50',
                projectError && 'border-destructive',
              )}
            >
              <span className="truncate">
                {selectedProject ? selectedProject.name : 'Search project...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search projects..." />
              <CommandList>
                <CommandEmpty>No project found.</CommandEmpty>
                <CommandGroup>
                  {projects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.name} ${project.tasks.map((task) => task.name).join(' ')}`}
                      onSelect={() => handleProjectSelect(project.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedProjectId === project.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {project.name}
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
        <label htmlFor="task-select" className="text-[14px] font-semibold text-ink-muted-48">
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
                'w-full justify-between border-hairline bg-canvas/30 hover:bg-canvas/50',
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
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tasks..." />
              <CommandList>
                <CommandEmpty>
                  {availableTasks.length === 0
                    ? 'This project has no tasks yet.'
                    : 'No task found.'}
                </CommandEmpty>
                <CommandGroup>
                  {availableTasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={task.name}
                      onSelect={() => handleTaskSelect(task.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedTaskId === task.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      {task.name}
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
