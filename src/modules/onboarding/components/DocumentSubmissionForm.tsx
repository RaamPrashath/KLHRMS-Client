'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, CloudUpload, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingPublic } from '@/modules/onboarding/hooks/useOnboarding';
import { submitOnboardingDocumentsAction } from '@/modules/onboarding/api/onboardingServerActions';

interface DocumentSubmissionFormProps {
  readonly token: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function DocumentSubmissionForm({ token }: DocumentSubmissionFormProps) {
  const onboardingQuery = useOnboardingPublic(token);
  const onboarding = onboardingQuery.data;

  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const aadharRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);

  if (onboardingQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center  p-4">
        <div className="inline-flex items-center gap-2 rounded-xl border border-neutral-100 bg-white px-4 py-3 text-sm text-neutral-500 shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading...
        </div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div className="max-w-md rounded-xl border border-neutral-100 bg-white p-8 text-center shadow-sm">
          <FileText className="mx-auto mb-4 size-12 text-neutral-300" />
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">Invalid Request</h1>
          <p className="text-sm text-neutral-500">This document submission link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (onboarding.status !== 'PENDING') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pb-4">
        <div className="max-w-md rounded-xl border border-neutral-100 p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-success-text" />
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">Documents Already Submitted</h1>
          <p className="text-sm text-neutral-500">
            Your documents have already been submitted successfully.
            {onboarding.submittedAt
              ? ` Submitted on ${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(onboarding.submittedAt))}.`
              : ''}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-neutral-100  p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-success-text" />
          <h1 className="mb-2 text-xl font-semibold text-neutral-900">Documents Submitted!</h1>
          <p className="text-sm text-neutral-500">
            Thank you, {onboarding.candidateName}. Your Aadhar and PAN documents have been submitted successfully. We will get back to you with your HRMS credentials shortly.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!aadharFile || !panFile) {
      toast.error('Please upload both Aadhar and PAN card documents');
      return;
    }

    setSubmitting(true);
    try {
      const [aadharBase64, panBase64] = await Promise.all([
        readFileAsBase64(aadharFile),
        readFileAsBase64(panFile),
      ]);

      const result = await submitOnboardingDocumentsAction({
        token,
        data: {
          aadharBase64,
          aadharFileName: aadharFile.name,
          panBase64,
          panFileName: panFile.name,
        },
      });

      if (result.status === 'DOCUMENTS_SUBMITTED' || result.status === 'SUBMITTED') {
        setSubmitted(true);
        toast.success('Documents submitted successfully');
      } else {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit documents');
    } finally {
      setSubmitting(false);
    }
  }

  const isComplete = aadharFile !== null && panFile !== null;

  return (
    <div className="min-h-screen pt-20">
      <header>
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <span className="text-sm font-semibold text-neutral-900">{onboarding.organizationName}</span>
          <span className="mx-2 text-neutral-300">&middot;</span>
          <span className="text-sm text-neutral-500">{onboarding.jobTitle}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-12 pt-8">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-neutral-900">Upload your documents</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Hello {onboarding.candidateName}, please upload your Aadhar and PAN card to complete onboarding.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Aadhar Card</label>
            <div
              onClick={() => aadharRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') aadharRef.current?.click(); }}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
                aadharFile ? 'border-success-text bg-success-bg/10' : 'border-neutral-200 bg-white hover:border-primary',
              )}
            >
              {aadharFile ? (
                <>
                  <CheckCircle2 className="size-8 text-success-text" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-neutral-900">{aadharFile.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(aadharFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAadharFile(null);
                    }}
                  >
                    <X className="size-3.5" />
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <CloudUpload className="size-8 text-neutral-300" />
                  <p className="mt-1 text-sm font-medium text-neutral-700">Upload Aadhar</p>
                  <p className="text-xs text-neutral-400">PDF or image</p>
                </>
              )}
            </div>
            <input
              ref={aadharRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAadharFile(file);
              }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">PAN Card</label>
            <div
              onClick={() => panRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') panRef.current?.click(); }}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
                panFile ? 'border-success-text bg-success-bg/10' : 'border-neutral-200 bg-white hover:border-primary',
              )}
            >
              {panFile ? (
                <>
                  <CheckCircle2 className="size-8 text-success-text" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-neutral-900">{panFile.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(panFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPanFile(null);
                    }}
                  >
                    <X className="size-3.5" />
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <CloudUpload className="size-8 text-neutral-300" />
                  <p className="mt-1 text-sm font-medium text-neutral-700">Upload PAN</p>
                  <p className="text-xs text-neutral-400">PDF or image</p>
                </>
              )}
            </div>
            <input
              ref={panRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPanFile(file);
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-lg  border-neutral-100 bg-white">
          <div className="text-sm text-neutral-500">
            {isComplete ? (
              <span className="flex items-center gap-1.5 text-success-text">
                <CheckCircle2 className="size-4" />
                Both documents selected
              </span>
            ) : (
              ''
            )}
          </div>
          <Button
            type="button"
            disabled={!isComplete || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Documents'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
