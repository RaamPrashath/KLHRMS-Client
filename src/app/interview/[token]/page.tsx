'use client';

import { use, useCallback, useState } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

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

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_HRMS_API_URL || process.env.HRMS_API_URL || 'http://localhost:8000';
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
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Fetch slots on mount
  useState(() => {
    fetch(`${getApiUrl()}/public/interviews/${token}/slots`)
      .then((res) => {
        if (!res.ok) throw new Error('Interview not found or link expired');
        return res.json();
      })
      .then((json: SlotListResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  });

  const handleSelect = useCallback(async () => {
    if (!selectedSlotId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/public/interviews/${token}/slots/${selectedSlotId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to select slot');
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSlotId, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="flex items-center gap-3 text-neutral-500">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading your interview slots...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive-bg text-destructive-text">
            <Clock className="size-6" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">Link Expired or Invalid</h1>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success-bg text-success-text">
            <Check className="size-6" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">Interview Confirmed!</h1>
          <p className="text-sm text-neutral-500">
            Your interview time has been booked. Check your email for the confirmation details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Choose Your Interview Time</h1>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
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

          <p className="mb-3 text-sm font-medium text-neutral-700">Available slots</p>

          {data?.slots.length === 0 && (
            <p className="text-sm text-neutral-400">No available slots at this time.</p>
          )}

          <div className="grid gap-2">
            {data?.slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedSlotId === slot.id
                    ? 'border-primary bg-primary-ghost ring-1 ring-primary'
                    : 'border-neutral-100 bg-neutral-50 hover:border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-900">
                    {formatSlotTime(slot.startTime, slot.endTime)}
                  </span>
                  {selectedSlotId === slot.id && (
                    <span className="flex size-5 items-center justify-center rounded-lg bg-primary text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Button
            type="button"
            size="lg"
            disabled={!selectedSlotId || isSubmitting}
            onClick={handleSelect}
            className="w-full max-w-xs"
          >
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
