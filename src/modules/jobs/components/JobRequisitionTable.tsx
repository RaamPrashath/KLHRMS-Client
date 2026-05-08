'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Eye, FileCheck2, Send, XCircle } from 'lucide-react';
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

export function JobRequisitionTable({
  data,
  isLoading,
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
}: Readonly<JobRequisitionTableProps>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<JobRequisitionRecord | null>(null);
  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | null>(null);

  const columns: ColumnDef<JobRequisitionRecord>[] = [
    {
      accessorKey: 'title',
      header: 'Requisition',
      cell: ({ row }) => (
        <div className="min-w-[220px]">
          <p className="font-medium text-neutral-900">{row.original.title}</p>
          <p className="text-xs text-neutral-500">
            {row.original.departmentName ?? 'No department'} • {row.original.employmentType.replaceAll('_', ' ')}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'openings',
      header: 'Positions',
      cell: ({ row }) => <span className="font-mono text-[13px]">{row.original.openings}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => <span className="text-sm text-neutral-700">{formatDate(row.original.createdAt)}</span>,
    },
    {
      accessorKey: 'approvalSummary',
      header: 'Progress',
      cell: ({ row }) => <span className="text-sm text-neutral-700">{progressLabel(row.original)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={cn('border px-2.5 py-1 text-xs font-medium', getStatusClasses(row.original.status))}>
          {row.original.status}
        </Badge>
      ),
    },
    ...(showRaisedBy
      ? [
          {
            id: 'raisedBy',
            header: 'Raised By',
            cell: ({ row }: { row: { original: JobRequisitionRecord } }) => (
              <span className="text-sm text-neutral-700">{row.original.raisedByName ?? 'Unknown'}</span>
            ),
          } satisfies ColumnDef<JobRequisitionRecord>,
        ]
      : []),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRecord(record)}
            >
              <Eye className="mr-1 size-3.5" />
              View
            </Button>

            {record.canSubmit ? (
              <Button
                size="sm"
                disabled={submitLoading}
                onClick={async () => {
                  try {
                    await onSubmit(record.id);
                    toast.success('Requisition submitted for approval');
                  } catch (error) {
                    toast.error(getErrorMessage(error, 'Failed to submit requisition'));
                  }
                }}
              >
                <Send className="mr-1 size-3.5" />
                Submit
              </Button>
            ) : null}

            {record.currentUserCanApprove ? (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedRecord(record);
                    setDecisionMode('approve');
                  }}
                >
                  <FileCheck2 className="mr-1 size-3.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRecord(record);
                    setDecisionMode('reject');
                  }}
                >
                  <XCircle className="mr-1 size-3.5" />
                  Reject
                </Button>
              </>
            ) : null}

            {canClose && record.status !== 'CLOSED' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={closeLoading}
                onClick={async () => {
                  try {
                    await onClose(record.id);
                    toast.success('Requisition closed');
                  } catch (error) {
                    toast.error(getErrorMessage(error, 'Failed to close requisition'));
                  }
                }}
              >
                Close
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = String(filterValue).toLowerCase();
      return (
        row.original.title.toLowerCase().includes(value) ||
        (row.original.departmentName ?? '').toLowerCase().includes(value) ||
        (row.original.raisedByName ?? '').toLowerCase().includes(value)
      );
    },
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            placeholder="Search requisitions..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <p className="text-sm text-neutral-500">{table.getFilteredRowModel().rows.length} requisition(s)</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-canvas hover:bg-canvas">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-neutral-500">
                    Loading requisitions...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-canvas">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-neutral-500">
                    No requisitions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
