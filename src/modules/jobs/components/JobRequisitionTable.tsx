'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, FileCheck2, Send, XCircle, Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { RequisitionDecisionDialog } from '@/modules/jobs/components/RequisitionDecisionDialog';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';

interface JobRequisitionTableProps {
  orgSlug: string;
  ownedOnly: boolean;
  data: JobRequisitionRecord[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  showRaisedBy: boolean;
  canClose: boolean;
  submitLoading: boolean;
  approveLoading: boolean;
  rejectLoading: boolean;
  closeLoading: boolean;
  onSubmit: (requisitionId: string) => Promise<void>;
  onApprove: (requisitionId: string, comment: string) => Promise<void>;
  onReject: (requisitionId: string, comment: string) => Promise<void>;
  onClose: (requisitionId: string) => Promise<void>;
  onNewRequisition: () => void;
}

function getStatusClasses(status: JobRequisitionRecord['status']) {
  if (status === 'APPROVED') return 'bg-success-bg text-success-text border-success-border';
  if (status === 'REJECTED') return 'bg-destructive-bg text-destructive-text border-destructive-border';
  if (status === 'PENDING') return 'bg-warning-bg text-warning-text border-warning-border';
  if (status === 'CLOSED') return 'bg-neutral-100 text-neutral-500 border-neutral-200';
  return 'bg-info-bg text-info-text border-info-border';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return format(new Date(value), 'MMM d, yyyy');
}

function progressLabel(record: JobRequisitionRecord) {
  return `${record.approvalSummary.approvedCount}/${record.approvalSummary.totalCount} Approved`;
}

function getErrorMessage(error: unknown, fallback: string) {
  try {
    const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
    if (parsed.message) return parsed.message as string;
  } catch {
    // ignore parse failures
  }
  return fallback;
}

function parseError(error: Error | null) {
  if (!error) return 'Failed to load job requisitions.';
  try {
    const parsed = JSON.parse(error.message);
    if (parsed.message) return parsed.message as string;
  } catch {
    // ignore parse failures
  }
  return 'Failed to load job requisitions.';
}

const SKELETON_IDS = Array.from({ length: 10 }, (_, i) => `skeleton-row-${i}`);

export function JobRequisitionTable({
  orgSlug,
  ownedOnly,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  showRaisedBy,
  canClose,
  submitLoading,
  approveLoading,
  rejectLoading,
  closeLoading,
  onSubmit,
  onApprove,
  onReject,
  onClose,
  onNewRequisition,
}: Readonly<JobRequisitionTableProps>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<JobRequisitionRecord | null>(null);
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | null>(null);

  // Filter data based on search
  const filteredData = globalFilter
    ? data.filter((record) => {
        const value = globalFilter.toLowerCase();
        return (
          record.title.toLowerCase().includes(value) ||
          (record.departmentName ?? '').toLowerCase().includes(value) ||
          (record.raisedByName ?? '').toLowerCase().includes(value)
        );
      })
    : data;

  const columnCount = showRaisedBy ? 7 : 6;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-surface rounded-xl border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          {/* Table header with search and actions */}
          <div className="p-4 border-b border-neutral-100 bg-surface">
            <div className="flex items-center gap-3">
              {/* Search bar - extends to fill space */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                <Input
                  placeholder="Search requisitions..."
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="pl-9 pr-9"
                />
                {globalFilter && (
                  <button
                    type="button"
                    onClick={() => setGlobalFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {!ownedOnly ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${orgSlug}/jobs/requisitions`}>My Requisitions</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/${orgSlug}/jobs`}>All Jobs</Link>
                  </Button>
                )}
                <Button onClick={onNewRequisition} size="sm">
                  <Plus className="mr-1.5 size-4" />
                  New Requisition
                </Button>
              </div>
            </div>
          </div>

          {/* Body */}
          {(() => {
            if (isError) {
              return (
                <div className="p-12 flex flex-col items-center justify-center gap-3 bg-canvas/30">
                  <div className="size-10 rounded-full bg-destructive-bg flex items-center justify-center mb-2">
                    <span className="text-destructive-text font-medium">!</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900">
                    Failed to load job requisitions
                  </p>
                  <p className="text-xs text-neutral-500 max-w-[250px] text-center mb-2">
                    {parseError(error)}
                  </p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-sm font-normal bg-transparent border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-md transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto w-full bg-white">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <colgroup>
                    <col style={{ width: '25%', maxWidth: '300px' }} />
                    <col className="w-auto" />
                    <col className="w-auto" />
                    <col className="w-auto" />
                    <col className="w-auto" />
                    {showRaisedBy && <col className="w-auto" />}
                    <col style={{ width: '180px' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-neutral-100 bg-canvas">
                      <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">
                        Requisition
                      </th>
                      <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-center">
                        Positions
                      </th>
                      <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-center">
                        Created
                      </th>
                      <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-center">
                        Progress
                      </th>
                      <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-center">
                        Status
                      </th>
                      {showRaisedBy && (
                        <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">
                          Raised By
                        </th>
                      )}
                      <th className="px-4 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {isLoading ? (
                      SKELETON_IDS.map((id) => (
                        <tr key={id} className="border-b border-neutral-100">
                          <td colSpan={columnCount} className="p-3 lg:px-4">
                            <Skeleton className="h-12 w-full rounded-xl" />
                          </td>
                        </tr>
                      ))
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="p-12 flex flex-col items-center justify-center gap-3">
                            <div className="size-12 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                              <Search className="size-6 text-neutral-400" />
                            </div>
                            <p className="text-sm font-medium text-neutral-900">
                              No requisitions found
                            </p>
                            <p className="text-xs text-neutral-500 max-w-[250px] text-center">
                              {globalFilter
                                ? 'Try adjusting your search terms'
                                : 'Create your first job requisition to get started'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((record) => (
                        <tr key={record.id} className="hover:bg-canvas/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="overflow-hidden">
                              <p className="font-medium text-neutral-900 text-[13px] truncate">{record.title}</p>
                              <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                                {record.departmentName ?? 'No department'} • {record.employmentType.replaceAll('_', ' ')}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono text-[13px] text-neutral-900">{record.openings}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[13px] text-neutral-700 whitespace-nowrap">{formatDate(record.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[13px] text-neutral-700 whitespace-nowrap">{progressLabel(record)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={cn('border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', getStatusClasses(record.status))}>
                              {record.status}
                            </Badge>
                          </td>
                          {showRaisedBy && (
                            <td className="px-4 py-3">
                              <span className="text-[13px] text-neutral-700 truncate block">{record.raisedByName ?? 'Unknown'}</span>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setSelectedRecord(record)}
                                title="View details"
                                className="shrink-0"
                              >
                                <Eye className="size-3.5" />
                              </Button>

                              {record.canSubmit && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={submitLoading}
                                  onClick={async () => {
                                    try {
                                      await onSubmit(record.id);
                                      toast.success('Requisition submitted for approval');
                                    } catch (error) {
                                      toast.error(getErrorMessage(error, 'Failed to submit requisition'));
                                    }
                                  }}
                                  title="Submit for approval"
                                  className="shrink-0"
                                >
                                  <Send className="size-3.5" />
                                </Button>
                              )}

                              {record.currentUserCanApprove && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRecord(record);
                                      setDecisionMode('approve');
                                    }}
                                    className="h-7 px-2 text-[11px] shrink-0"
                                  >
                                    <FileCheck2 className="mr-1 size-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setSelectedRecord(record);
                                      setDecisionMode('reject');
                                    }}
                                    title="Reject"
                                    className="shrink-0"
                                  >
                                    <XCircle className="size-3.5" />
                                  </Button>
                                </>
                              )}

                              {canClose && record.status !== 'CLOSED' && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={closeLoading}
                                  onClick={async () => {
                                    try {
                                      await onClose(record.id);
                                      toast.success('Requisition closed');
                                    } catch (error) {
                                      toast.error(getErrorMessage(error, 'Failed to close requisition'));
                                    }
                                  }}
                                  title="Close requisition"
                                  className="shrink-0"
                                >
                                  <X className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      <Dialog open={!!selectedRecord && decisionMode === null} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl bg-surface">
          <DialogHeader>
            <DialogTitle>{selectedRecord?.title}</DialogTitle>
            <DialogDescription>
              Review the requisition details and current approval audit.
            </DialogDescription>
          </DialogHeader>

          {selectedRecord ? (
            <div className="grid gap-5">
              <div className="grid gap-4 rounded-xl border border-neutral-100 bg-canvas p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Department</p>
                  <p className="mt-1 text-sm text-neutral-900">{selectedRecord.departmentName ?? 'No department'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Requested Positions</p>
                  <p className="mt-1 font-mono text-sm text-neutral-900">{selectedRecord.openings}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Target Date</p>
                  <p className="mt-1 text-sm text-neutral-900">{formatDate(selectedRecord.targetDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Progress</p>
                  <p className="mt-1 text-sm text-neutral-900">{progressLabel(selectedRecord)}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">Description</h3>
                <p className="text-sm leading-6 text-neutral-700">{selectedRecord.description || 'No description added.'}</p>
              </div>

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">Requirements</h3>
                <p className="text-sm leading-6 text-neutral-700">{selectedRecord.requirements || 'No requirements added.'}</p>
              </div>

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">Approval Audit</h3>
                <div className="rounded-xl border border-neutral-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-canvas hover:bg-canvas">
                        <TableHead>Approver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecord.approvals.map((approval) => (
                        <TableRow key={approval.id}>
                          <TableCell className="text-sm text-neutral-900">{approval.approverName ?? approval.approverId}</TableCell>
                          <TableCell>
                            <Badge className={cn('border px-2 py-0.5 text-xs', getStatusClasses(
                              approval.decision === 'PENDING' ? 'PENDING' : approval.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                            ))}>
                              {approval.decision}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-neutral-700">{approval.comment || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <RequisitionDecisionDialog
        open={!!selectedRecord && decisionMode === 'approve'}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionMode(null);
            setSelectedRecord(null);
          }
        }}
        title={selectedRecord?.title ?? ''}
        actionLabel="Approve"
        loading={approveLoading}
        onConfirm={async (comment) => {
          if (!selectedRecord) return;
          await onApprove(selectedRecord.id, comment);
          toast.success('Requisition approved');
          setDecisionMode(null);
          setSelectedRecord(null);
        }}
      />

      <RequisitionDecisionDialog
        open={!!selectedRecord && decisionMode === 'reject'}
        onOpenChange={(open) => {
          if (!open) {
            setDecisionMode(null);
            setSelectedRecord(null);
          }
        }}
        title={selectedRecord?.title ?? ''}
        actionLabel="Reject"
        loading={rejectLoading}
        onConfirm={async (comment) => {
          if (!selectedRecord) return;
          await onReject(selectedRecord.id, comment);
          toast.success('Requisition rejected');
          setDecisionMode(null);
          setSelectedRecord(null);
        }}
      />
    </>
  );
}
