'use client';

import { use, useState } from 'react';
import { Check, Loader2, MessageSquareText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/modules/jobs/components/RichTextEditor';

interface FeedbackInfo {
  candidateName: string;
  jobTitle: string;
  interviewerName: string | null;
  stageName: string;
  interviewDate: string;
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_HRMS_API_URL || process.env.HRMS_API_URL || 'http://localhost:8000';
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export default function FeedbackPage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [info, setInfo] = useState<FeedbackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useState(() => {
    fetch(`${getApiUrl()}/public/interviews/${token}/feedback`)
      .then((res) => {
        if (!res.ok) throw new Error('Feedback link expired or invalid');
        return res.json();
      })
      .then((json: FeedbackInfo) => {
        setInfo(json);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  });

  async function handleSubmit() {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/public/interviews/${token}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: feedback }),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="flex items-center gap-3 text-neutral-500">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive-bg text-destructive-text">
            <MessageSquareText className="size-6" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">Link Expired or Invalid</h1>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-success-bg text-success-text">
            <Check className="size-6" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">Thank You!</h1>
          <p className="text-sm text-neutral-500">
            Your feedback has been submitted successfully. We appreciate your time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Share Your Feedback</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Help us improve the interview experience
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Candidate</p>
              <p className="mt-0.5 font-medium text-neutral-900">{info?.candidateName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Position</p>
              <p className="mt-0.5 font-medium text-neutral-900">{info?.jobTitle}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Interviewer</p>
              <p className="mt-0.5 font-medium text-neutral-900">{info?.interviewerName ?? 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Stage</p>
              <p className="mt-0.5 font-medium text-neutral-900">{info?.stageName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Interview Date</p>
              <p className="mt-0.5 font-medium text-neutral-900">
                {info?.interviewDate ? formatDate(info.interviewDate) : 'N/A'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-700">Your comments</p>
            <RichTextEditor
              content={feedback}
              onChange={setFeedback}
              placeholder="Tell us about your interview experience..."
              minHeight={200}
            />
          </div>
        </div>

        <div className="text-center">
          <Button
            type="button"
            size="lg"
            disabled={!feedback.trim() || isSubmitting}
            onClick={() => { void handleSubmit(); }}
            className="w-full max-w-xs"
          >
            {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Submit Feedback
          </Button>
        </div>
      </div>
    </div>
  );
}
