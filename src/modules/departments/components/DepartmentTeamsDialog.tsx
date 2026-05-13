'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Building2, FolderKanban, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type {
  DepartmentSummary,
  LookupOption,
} from '@/modules/departments/types/departmentTypes';
import type { TeamMemberInput } from '@/modules/departments/schema/departmentSchemas';

interface DepartmentTeamsDialogProps {
  department: DepartmentSummary | null;
  isOpen: boolean;
  canManage: boolean;
  members: LookupOption[];
  memberForms: Record<string, TeamMemberInput>;
  setMemberForms: Dispatch<SetStateAction<Record<string, TeamMemberInput>>>;
  onAssignMember: (teamId: string) => Promise<void>;
  onClose: () => void;
  onRemoveMember: (teamId: string, memberId: string) => Promise<void>;
}

export function DepartmentTeamsDialog({
  department,
  isOpen,
  canManage,
  members,
  memberForms,
  setMemberForms,
  onAssignMember,
  onClose,
  onRemoveMember,
}: DepartmentTeamsDialogProps) {
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const activeTeam = department?.teams.find((team) => team.id === activeTeamId) ?? department?.teams[0] ?? null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[min(60vw,1100px)]! max-w-none! border border-[#e5e5ea] bg-white p-0 shadow-2xl rounded-[18px] overflow-hidden"
      >
        {!department ? (
          <div className="px-8 py-10">
            <p className="text-[15px] text-[#6e6e73]">Unable to load teams for this department.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-[#e5e5ea] px-8 py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Teams and staffing</p>
              <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">{department.name}</h2>
            </div>

            {department.teams.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-[#e5e5ea] px-8 py-3">
                {department.teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setActiveTeamId(team.id)}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors',
                      activeTeam?.id === team.id
                        ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white'
                        : 'border-[#e5e5ea] bg-white text-[#1d1d1f] hover:bg-[#f5f5f7]',
                    )}
                  >
                    {team.name}
                    <span className={cn('ml-1.5', activeTeam?.id === team.id ? 'text-white/60' : 'text-[#86868b]')}>
                      {team.memberCount}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto">
              {department.teams.length === 0 ? (
                <div className="px-8 py-12 text-center">
                  <Building2 className="mx-auto size-8 text-[#86868b]" />
                  <p className="mt-3 text-[15px] font-medium text-[#1d1d1f]">No teams yet</p>
                  <p className="mt-1 text-[14px] text-[#6e6e73]">Create a team to start adding members.</p>
                </div>
              ) : !activeTeam ? (
                <div className="px-8 py-12 text-center text-[14px] text-[#6e6e73]">
                  Select a team above.
                </div>
              ) : (
                <div className="px-8 py-6 space-y-8">
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{activeTeam.name}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-[#6e6e73]">
                      {activeTeam.description || 'No team description.'} Led by {activeTeam.leadMemberName || 'no assigned lead'}.
                    </p>
                  </div>

                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                      Members ({activeTeam.memberCount})
                    </p>
                    <div className="overflow-hidden rounded-lg border border-[#e5e5ea]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Person
                            </TableHead>
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Role
                            </TableHead>
                            {canManage && (
                              <TableHead className="h-10 w-[60px] px-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]" />
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeTeam.members.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={canManage ? 3 : 2}
                                className="px-4 py-8 text-center text-[13px] text-[#6e6e73]"
                              >
                                No members assigned to this team yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeTeam.members.map((member) => (
                              <TableRow key={member.id} className="border-[#e5e5ea]">
                                <TableCell className="px-4 py-3 text-[14px] font-medium text-[#1d1d1f]">
                                  {member.name || member.email || member.memberId}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-[14px] text-[#6e6e73]">
                                  {member.role || 'Contributor'}
                                </TableCell>
                                {canManage && (
                                  <TableCell className="px-4 py-3 text-right">
                                    <Button variant="ghost" size="icon" className="size-8 text-[#86868b] hover:text-[#1d1d1f]" onClick={() => void onRemoveMember(activeTeam.id, member.memberId)}>
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {canManage && (
                    <div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                        Assign member
                      </p>
                      <div className="flex items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <Select
                            value={memberForms[activeTeam.id]?.memberId || 'none'}
                            onValueChange={(value) =>
                              setMemberForms((current) => ({
                                ...current,
                                [activeTeam.id]: {
                                  ...(current[activeTeam.id] || { role: '' }),
                                  memberId: value === 'none' ? '' : value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-11 rounded-lg border-[#e5e5ea] shadow-none">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select employee</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-40">
                          <Input
                            value={memberForms[activeTeam.id]?.role || ''}
                            onChange={(event) =>
                              setMemberForms((current) => ({
                                ...current,
                                [activeTeam.id]: {
                                  ...(current[activeTeam.id] || { memberId: '' }),
                                  role: event.target.value,
                                },
                              }))
                            }
                            placeholder="Role"
                            className="h-11 rounded-lg border-[#e5e5ea] shadow-none focus-visible:ring-1 focus-visible:ring-[#0066cc]"
                          />
                        </div>
                        <Button
                          onClick={() => void onAssignMember(activeTeam.id)}
                          className="h-11 shrink-0 rounded-full px-5 text-[14px] font-medium text-white"
                          style={{ backgroundColor: '#00874a' }}
                        >
                          <UserPlus className="mr-2 size-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                      Linked projects ({activeTeam.projectCount})
                    </p>
                    <div className="overflow-hidden rounded-lg border border-[#e5e5ea]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-[#e5e5ea] bg-[#f5f5f7] hover:bg-[#f5f5f7]">
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Project
                            </TableHead>
                            <TableHead className="h-10 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeTeam.projects.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="px-4 py-8 text-center text-[13px] text-[#6e6e73]">
                                No projects linked to this team.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeTeam.projects.map((project) => (
                              <TableRow key={project.id} className="border-[#e5e5ea]">
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-2 text-[14px] font-medium text-[#1d1d1f]">
                                    <FolderKanban className="size-4 text-[#6e6e73]" />
                                    {project.name}
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <Badge className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-medium text-[#1d1d1f]">
                                    {project.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
