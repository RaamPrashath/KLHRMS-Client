'use client';

import { useState } from 'react';
import { Copy, Check, IdCard, Mail, UserRound, ShieldCheck } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyEmployeeProfileQuery } from '@/modules/employees/hooks/useEmployeeDetailQuery';
import { cn } from '@/lib/utils';

interface UserPersonalDetailsTabProps {
  orgSlug: string;
  memberId: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function CopyButton({ value }: Readonly<{ value: string }>) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="ml-2 inline-flex shrink-0 items-center justify-center rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
      title={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Field({
  icon,
  label,
  value,
  copyable,
  href,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
  href?: string;
}>) {
  const display = value && value.trim().length > 0 ? value : '—';
  const isEmpty = display === '—';
  const content = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <div className="flex min-w-0 items-center">
        <span
          className={cn(
            'truncate text-sm',
            isEmpty ? 'text-neutral-400' : 'text-neutral-900',
          )}
          title={isEmpty ? undefined : display}
        >
          {display}
        </span>
        {!isEmpty && copyable ? <CopyButton value={display} /> : null}
      </div>
    </div>
  );
  if (href && !isEmpty) {
    return (
      <a
        href={href}
        className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="mt-0.5 text-neutral-400 [&_svg]:size-4">{icon}</span>
        {content}
      </a>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-lg p-2">
      <span className="mt-0.5 text-neutral-400 [&_svg]:size-4">{icon}</span>
      {content}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function UserPersonalDetailsTab({
  orgSlug,
  memberId,
}: Readonly<UserPersonalDetailsTabProps>) {
  const { data, isLoading, isError, error } = useMyEmployeeProfileQuery(
    orgSlug,
    memberId,
  );

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (isError || !data) {
    let message = 'Failed to load your profile.';
    try {
      const parsed = JSON.parse(error?.message ?? '{}');
      if (parsed.message) message = parsed.message;
    } catch {
      // ignore parse errors
    }
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-neutral-100 bg-surface p-6">
        <p className="text-sm text-destructive-text">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header / identity card */}
      <div className="flex items-center gap-4 rounded-2xl border border-black/[0.04] bg-canvas/30 p-4">
        <Avatar className="size-16 ring-1 ring-black/[0.06]">
          <AvatarImage src={data.image ?? undefined} alt={data.name} />
          <AvatarFallback className="bg-primary-subtle text-lg font-semibold text-primary">
            {getInitials(data.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-base font-semibold text-neutral-900">
            {data.name}
          </span>
          {data.contact.email ? (
            <span className="truncate text-sm text-neutral-500">
              {data.contact.email}
            </span>
          ) : null}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field
          icon={<UserRound className="size-4" />}
          label="Full name"
          value={data.name}
        />
        <Field
          icon={<Mail className="size-4" />}
          label="Email"
          value={data.contact.email}
          copyable
          href={
            data.contact.email ? `mailto:${data.contact.email}` : undefined
          }
        />
        <Field
          icon={<IdCard className="size-4" />}
          label="Employee ID"
          value={data.employment.employee_id}
          copyable
        />
        <Field
          icon={<ShieldCheck className="size-4" />}
          label="Account status"
          value={data.sync.status}
        />
      </div>
    </div>
  );
}
