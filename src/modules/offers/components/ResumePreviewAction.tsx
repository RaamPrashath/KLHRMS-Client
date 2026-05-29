'use client';

import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ResumePreviewActionProps {
  readonly resumeUrl: string | null;
  readonly candidateName: string;
}

export function ResumePreviewAction({ resumeUrl, candidateName }: ResumePreviewActionProps) {
  if (!resumeUrl) {
    return <span className="text-xs text-neutral-400">No resume</span>;
  }

  return (
    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-neutral-700">
      <a href={resumeUrl} target="_blank" rel="noopener noreferrer" aria-label={`View resume for ${candidateName}`}>
        <ExternalLink className="size-3.5" />
        View resume
      </a>
    </Button>
  );
}
