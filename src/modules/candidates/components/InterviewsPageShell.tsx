'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateReassignmentRequest, useFetchMyInterviews, useReshuffleInterviewAssignment } from '@/modules/candidates/hooks/useAtsPipeline';
import type { MyInterview } from '@/modules/candidates/types/atsTypes';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function candidateName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function ReassignmentDialog({
  interview,
  onClose,
  memberId,
  orgSlug,
}: {
  readonly interview: MyInterview;
  readonly onClose: () => void;
  readonly memberId: string;
  readonly orgSlug: string;
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createRequest = useCreateReassignmentRequest(orgSlug, memberId);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for reassignment');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRequest.mutateAsync({
        eventId: interview.eventId,
        data: { reason: reason.trim() },
      });
      toast.success('Reassignment request sent to HR');
      onClose();
    } catch {
      toast.error('Failed to send reassignment request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">
          Request Reassignment
        </h3>
        <p className="mb-4 text-sm text-neutral-600">
          Candidate: {candidateName(interview.candidate.firstName, interview.candidate.lastName)}
        </p>
        <textarea
          placeholder="Please provide a reason for requesting reassignment..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          rows={4}
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Request'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function InterviewsPageShell({
  orgSlug,
  memberId,
}: {
  readonly orgSlug: string;
  readonly memberId: string;
}) {
  const [reassignmentInterview, setReassignmentInterview] = useState<MyInterview | null>(null);
  const [acceptedEventIds, setAcceptedEventIds] = useState<string[]>([]);
  const interviewsQuery = useFetchMyInterviews(orgSlug, memberId);
  const reshuffleInterview = useReshuffleInterviewAssignment(orgSlug, memberId);

  if (interviewsQuery.isLoading) {
    return (
      <div className="min-h-full bg-canvas p-6">
        <div className="rounded-xl border border-neutral-100 bg-surface p-8 text-sm text-neutral-500">
          Loading your interviews...
        </div>
      </div>
    );
  }

  const interviews = interviewsQuery.data?.items ?? [];

  return (
    <div className="min-h-full bg-canvas px-6 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          My Interviews
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          View assigned interviews, confirm ownership, or reject to pass the slot to a backup interviewer.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-100 bg-surface shadow-[--shadow-1]">
        {interviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12">
            <Clock className="mb-4 size-12 text-neutral-200" />
            <p className="font-medium text-neutral-600">No interviews assigned</p>
            <p className="mt-1 text-sm text-neutral-500">
              You do not have any interviews scheduled at this time
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-canvas hover:bg-canvas">
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Candidate
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Position
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Stage
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Scheduled
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Role
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Status
                </TableHead>
                <TableHead className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviews.map((interview) => (
                <TableRow key={interview.eventId} className="border-neutral-100 hover:bg-canvas">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary-ghost text-xs font-semibold text-primary">
                        {interview.candidate.firstName[0]}
                        {interview.candidate.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {candidateName(interview.candidate.firstName, interview.candidate.lastName)}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{interview.candidate.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="text-sm text-neutral-700">{interview.jobTitle}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
                      <div className="size-1.5 rounded-full bg-neutral-400" />
                      <span className="text-xs font-medium text-neutral-700">{interview.stageName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="size-3.5 text-neutral-400" />
                      {formatDateTime(interview.scheduledStartAt)}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="inline-flex items-center gap-1.5">
                      <div
                        className={`size-2 rounded-full ${
                          interview.isBackup ? 'bg-warning-text' : 'bg-success-text'
                        }`}
                      />
                      <span className="text-xs font-medium text-neutral-700">
                        {interview.isBackup ? 'Backup' : 'Primary'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {interview.isBackup ? (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                        Standby backup
                      </span>
                    ) : acceptedEventIds.includes(interview.eventId) ? (
                      <span className="inline-flex items-center rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success-text">
                        Accepted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-warning-bg px-2.5 py-1 text-xs font-medium text-warning-text">
                        Awaiting response
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {interview.isBackup ? null : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={acceptedEventIds.includes(interview.eventId) ? 'outline' : 'default'}
                          onClick={() => {
                            setAcceptedEventIds((current) => (
                              current.includes(interview.eventId) ? current : [...current, interview.eventId]
                            ));
                            toast.success('Interview accepted');
                          }}
                        >
                          {acceptedEventIds.includes(interview.eventId) ? 'Accepted' : 'Accept'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reshuffleInterview.isPending}
                          onClick={() => {
                            reshuffleInterview.mutate(
                              {
                                applicationId: interview.applicationId,
                                eventId: interview.eventId,
                                data: {},
                              },
                              {
                                onSuccess: () => {
                                  setAcceptedEventIds((current) => current.filter((id) => id !== interview.eventId));
                                  toast.success('Interview rejected. A backup interviewer has been notified.');
                                },
                                onError: () => {
                                  toast.error('Could not reassign this interview automatically. Add a backup first.');
                                },
                              },
                            );
                          }}
                        >
                          {reshuffleInterview.isPending ? 'Reassigning...' : 'Reject'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReassignmentInterview(interview)}
                        >
                          Request Reassignment
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {reassignmentInterview && (
        <ReassignmentDialog
          interview={reassignmentInterview}
          onClose={() => setReassignmentInterview(null)}
          memberId={memberId}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}
