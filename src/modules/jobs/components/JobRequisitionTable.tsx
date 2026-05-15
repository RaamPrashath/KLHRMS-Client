'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye, FileCheck2, Send, XCircle, Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  return (
    <>
      <div className="flex flex-col flex-1 mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          {/* ── Filter bar ──────────────────────────────────────────────── */}
          <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">
                  Requisitions
                </h2>
              </div>
              <div className="shrink-0">
                <Button onClick={onNewRequisition} size="sm">
                  <Plus className="mr-1.5 size-4" />
                  New Requisition
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <Input
                placeholder="Search requisitions..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
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
          </div>

          {/* ── Body ────────────────────────────────────────────────────── */}
          <div className="w-full">
            {(() => {
              if (isError) {
                return (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 bg-surface">
                    <p className="text-sm font-medium text-neutral-900">
                      Failed to load job requisitions
                    </p>
                    <p className="text-xs text-neutral-500 max-w-[250px] text-center">
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
                <>
                  {/* Header */}
                  <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Requisition</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Positions</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Created</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Progress</div>
                    <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</div>
                    {showRaisedBy && (
                      <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Raised By</div>
                    )}
                    <div className="w-[200px] shrink-0 text-right text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Actions</div>
                  </div>

                  {/* Body */}
                  <div className="px-4">
                    {isLoading ? (
                      <div className="flex flex-col divide-y divide-black/4 bg-surface">
                        {SKELETON_IDS.map((id) => (
                          <div key={id} className="border-b border-black/4 p-6">
                            <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                          </div>
                        ))}
                      </div>
                    ) : filteredData.length === 0 ? (
                      <div className="bg-surface py-16 text-center text-sm text-neutral-400">
                        {globalFilter
                          ? 'No requisitions match your search.'
                          : 'No requisitions found.'}
                      </div>
                    ) : (
                      <div className="flex flex-col bg-surface">
                        {filteredData.map((record) => (
                          <div
                            key={record.id}
                            className="flex justify-around items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3 px-4"
                          >
                            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-1">
                              <p className="truncate text-sm font-medium text-neutral-900 w-full text-center">{record.title}</p>
                              <p className="truncate text-[11px] text-neutral-500 w-full text-center">
                                {record.departmentName ?? 'No department'} &bull; {record.employmentType.replaceAll('_', ' ')}
                              </p>
                            </div>

                            <div className="flex-1 flex justify-center">
                              <span className="text-sm font-medium text-neutral-900">{record.openings}</span>
                            </div>

                            <div className="flex-1 flex justify-center">
                              <span className="text-sm text-neutral-700 whitespace-nowrap">{formatDate(record.createdAt)}</span>
                            </div>

                            <div className="flex-1 flex justify-center">
                              <span className="text-sm text-neutral-700">{progressLabel(record)}</span>
                            </div>

                            <div className="flex-1 flex justify-center">
                              <Badge className={cn('border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', getStatusClasses(record.status))}>
                                {record.status}
                              </Badge>
                            </div>

                            {showRaisedBy && (
                              <div className="flex-1 flex justify-center">
                                <span className="block truncate text-sm text-neutral-700">{record.raisedByName ?? 'Unknown'}</span>
                              </div>
                            )}

                            <div className="w-[200px] shrink-0 flex justify-end gap-1">
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Detail dialog */}
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
