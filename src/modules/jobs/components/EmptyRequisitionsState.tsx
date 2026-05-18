'use client';

import { FileText, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EmptyRequisitionsStateProps {
  onCreate: () => void;
}

export function EmptyRequisitionsState({
  onCreate,
}: Readonly<EmptyRequisitionsStateProps>) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-24">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-neutral-100">
        <FileText className="size-7 text-neutral-400" />
      </div>
      <h2 className="mb-1 text-xl font-semibold text-neutral-900">
        Create your first requisition
      </h2>
      <p className="mb-6 max-w-sm text-center text-sm text-neutral-500">
        Hiring requests help teams request and approve new roles before publishing them publicly.
      </p>
      <Button type="button" onClick={onCreate}>
        <Plus className="size-4" />
        Create Requisition
      </Button>
    </div>
  );
}
