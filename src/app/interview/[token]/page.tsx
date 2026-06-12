'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { WaveBackground } from '@/components/auth/shared/WaveBackground';
import { CandidateSlotProposalDialog } from './CandidateSlotProposalDialog';

interface ProposedSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface SlotListResponse {
  candidateName: string;
  jobTitle: string;
  interviewerName: string;
  candidateToken: string;
  stageDueDate: string | null;
  slots: ProposedSlot[];
}

function formatSlotTime(startTime: string, endTime: string): string {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  const start = new Date(startTime);
  const end = new Date(endTime);
  const timeFormatter = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${formatter.format(start)} – ${timeFormatter.format(end)} IST`;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // Keep the fallback message.
  }
  return fallback;
}

export default function InterviewSlotPickerPage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<SlotListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalSubmitted, setProposalSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/public/interviews/${token}/slots`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readApiError(res, 'Interview not found or link expired'));
        return res.json();
      })
      .then((json: SlotListResponse) => {
        if (!active) return;
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSelect = useCallback(async () => {
    if (!selectedSlotId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/public/interviews/${token}/slots/${selectedSlotId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to select slot'));
      setConfirmed(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSlotId, token]);

  const handleSubmitProposal = useCallback(async (payload: {
    proposedSlots: Array<{ startTime: string; endTime: string }>;
    durationMinutes: number;
    note: string | null;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/public/interviews/${token}/slots/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to propose slots'));
      setProposalSubmitted(true);
      setProposalDialogOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white font-sans text-neutral-900">
      <WaveBackground />

      <h1 className="sr-only">Choose your interview slot</h1>

      <main className="ui-overlay" id="interview-slot-overlay">
        <div className="flex w-full flex-col pt-14">
          <div className="brand-logo-container">
            <Image
              src="/kovan-logo.svg"
              alt="Kovan Labs Logo"
              width={156}
              height={34}
              className="login-logo"
              priority
            />
          </div>

          <div className="login-header">
            <h2>
              {confirmed
                ? 'Interview booked'
                : proposalSubmitted
                  ? 'Availability received'
                  : error
                    ? 'Interview link unavailable'
                    : 'Choose your slot'}
            </h2>
            <p>
              {confirmed
                ? 'Your interview time is confirmed.'
                : proposalSubmitted
                  ? 'Your proposed slots have been sent to the interviewer.'
                : error
                  ? 'We could not load this interview invitation.'
                  : 'Select a convenient time for your interview.'}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-4 text-sm text-neutral-500" role="status" aria-live="polite">
              <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
              <span>Loading your interview slots...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4 text-sm text-destructive">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Clock className="size-4" aria-hidden="true" />
                <span>Link expired or invalid</span>
              </div>
              <p className="leading-relaxed text-destructive-text">{error}</p>
            </div>
          ) : confirmed ? (
            <div className="rounded-xl border border-success-border bg-success-bg px-4 py-4 text-sm text-success-text">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Check className="size-4" aria-hidden="true" />
                <span>Interview confirmed</span>
              </div>
              <p className="leading-relaxed">
                Your interview time has been booked. Check your email for the confirmation details.
              </p>
            </div>
          ) : proposalSubmitted ? (
            <div className="rounded-xl border border-success-border bg-success-bg px-4 py-4 text-sm text-success-text">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <Check className="size-4" aria-hidden="true" />
                <span>Alternate slots sent</span>
              </div>
              <p className="leading-relaxed">
                We have emailed you an acknowledgement and notified the interviewer. You will receive a confirmation once a slot is booked.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 grid gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Candidate</p>
                  <p className="mt-0.5 font-medium text-neutral-900">{data?.candidateName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Position</p>
                  <p className="mt-0.5 font-medium text-neutral-900">{data?.jobTitle}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Interviewer</p>
                  <p className="mt-0.5 font-medium text-neutral-900">{data?.interviewerName}</p>
                </div>
              </div>

              <p className="mb-3 text-sm font-medium text-neutral-900">Available slots</p>

              {data?.slots.length === 0 ? (
                <p className="rounded-xl border border-neutral-100 bg-white px-4 py-3 text-sm text-neutral-400">
                  No available slots at this time.
                </p>
              ) : (
                <div className="grid gap-2">
                  {data?.slots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`w-full rounded-lg border bg-white px-4 py-3 text-left transition-all focus:outline-none focus:ring-[3px] focus:ring-primary/10 ${
                          isSelected
                            ? 'border-primary shadow-[0_0_0_1px_var(--primary)]'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium leading-relaxed text-neutral-900">
                            {formatSlotTime(slot.startTime, slot.endTime)}
                          </span>
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-primary bg-primary text-white'
                                : 'border-neutral-200 bg-white'
                            }`}
                            aria-hidden="true"
                          >
                            {isSelected ? <Check className="size-3" /> : null}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                className="btn-submit mt-4 inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                id="btn-book-interview"
                disabled={!selectedSlotId || isSubmitting}
                onClick={handleSelect}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {isSubmitting ? 'Booking...' : 'Book Interview'}
              </button>

              <div className="mt-4 rounded-xl border border-neutral-100 bg-white px-4 py-3">
                <p className="text-sm font-medium text-neutral-900">Not quite aligned with your plans?</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                  Propose your own slots and add a note for the interviewer.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSubmitError(null);
                    setProposalDialogOpen(true);
                  }}
                >
                  Propose my own slots
                </Button>
              </div>

              {submitError ? (
                <p className="mt-3 text-sm text-destructive-text">{submitError}</p>
              ) : null}
            </>
          )}
        </div>
      </main>
      <CandidateSlotProposalDialog
        open={proposalDialogOpen}
        isSubmitting={isSubmitting}
        serverError={proposalDialogOpen ? submitError : null}
        stageDueDate={data?.stageDueDate}
        candidateName={data?.candidateName}
        jobTitle={data?.jobTitle}
        interviewerName={data?.interviewerName}
        onOpenChange={setProposalDialogOpen}
        onSubmit={handleSubmitProposal}
      />
    </div>
  );
}
