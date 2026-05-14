'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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

const SKELETON_IDS = Array.from({ length: 8 }, (_, i) => `skeleton-row-${i}`);

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
      <div className="min-h-full bg-canvas flex flex-col gap-6 flex-1">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight ml-7 mt-7">
          My Interviews
        </h1>
        <div className="flex flex-col mx-7 mb-7">
          <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
            <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
              {SKELETON_IDS.map((id) => (
                <div key={id} className="border-b border-black/4 p-6">
                  <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const interviews = interviewsQuery.data?.items ?? [];

  return (
    <div className="min-h-full bg-canvas flex flex-col gap-6 flex-1">
      <div className="ml-7 mt-7 mr-7 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
            My Interviews
          </h1>
        </div>
      </div>

      <div className="flex flex-col mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          {interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface">
              <Clock className="mb-2 size-8 text-neutral-300" />
              <p className="text-sm text-neutral-400">No interviews assigned</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
                <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Candidate</div>
                <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Position</div>
                <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Stage</div>
                <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Scheduled</div>
                <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Role</div>
                <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</div>
                <div className="w-[280px] shrink-0 text-right text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Action</div>
              </div>

              {/* Rows */}
              <div className="flex flex-col bg-surface px-4">
                {interviews.map((interview) => (
                  <div
                    key={interview.eventId}
                    className="flex justify-around items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3 px-4"
                  >
                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-primary-ghost text-xs font-semibold text-primary">
                            {interview.candidate.firstName[0]}{interview.candidate.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-medium text-neutral-900">
                            {candidateName(interview.candidate.firstName, interview.candidate.lastName)}
                          </p>
                          <p className="truncate text-[11px] text-neutral-500">{interview.candidate.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex justify-center">
                      <span className="text-sm text-neutral-700">{interview.jobTitle}</span>
                    </div>

                    <div className="flex-1 flex justify-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1">
                        <div className="size-1.5 rounded-full bg-neutral-400" />
                        <span className="text-xs font-medium text-neutral-700">{interview.stageName}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Clock className="size-3.5 text-neutral-400" />
                        {formatDateTime(interview.scheduledStartAt)}
                      </div>
                    </div>

                    <div className="flex-1 flex justify-center">
                      <div className="inline-flex items-center gap-1.5">
                        <div className={`size-2 rounded-full ${interview.isBackup ? 'bg-warning-text' : 'bg-success-text'}`} />
                        <span className="text-xs font-medium text-neutral-700">
                          {interview.isBackup ? 'Backup' : 'Primary'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex justify-center">
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
                    </div>

                    <div className="w-[280px] shrink-0 flex justify-end gap-2">
                      {interview.isBackup ? null : (
                        <>
                          {interview.meetingUrl ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer">
                                Start Meeting
                              </a>
                            </Button>
                          ) : null}
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
