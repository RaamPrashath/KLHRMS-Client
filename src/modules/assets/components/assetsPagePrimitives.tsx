import { type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectTrigger } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ACTION_GREEN } from '@/modules/assets/components/assetsPageConfig';
import type { AssetStatus, AssetSummary } from '@/modules/assets/types/assetTypes';

export function AssetRowSkeleton({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="p-0">
        <Skeleton className="h-16 w-full rounded-none" />
      </TableCell>
    </TableRow>
  );
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="flex flex-col gap-4 border-b border-[#eef0f3] px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
            Asset Management
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#111827]">
            {title}
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[#6b7280]">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'default' | 'green' | 'blue' | 'amber' | 'red';
  icon: ReactNode;
}) {
  const toneClass = {
    default: 'bg-[#fbfcfb] text-[#111827]',
    green: 'bg-[#f3fbf5] text-[#156f3d]',
    blue: 'bg-[#f4f8ff] text-[#2454a6]',
    amber: 'bg-[#fff9ee] text-[#8a5a00]',
    red: 'bg-[#fff3f2] text-[#b3261e]',
  }[tone];

  return (
    <div className="rounded-[22px] border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className={cn('flex size-10 items-center justify-center rounded-2xl', toneClass)}>
        {icon}
      </div>
      <p className="mt-4 text-[13px] text-[#6b7280]">{label}</p>
      <p className="mt-1 text-[30px] font-semibold tracking-[-0.02em] text-[#111827]">{value}</p>
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function FieldSelect({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <SelectTrigger className="h-11 rounded-2xl border-[#e5e7eb] shadow-none">
        {children}
      </SelectTrigger>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border-[#e5e7eb] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
      />
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="h-11 rounded-2xl border-[#e5e7eb] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 md:col-span-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 rounded-2xl border-[#e5e7eb] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
      />
    </div>
  );
}

export function SidePanel({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[16px] font-medium text-[#111827]">{title}</p>
          <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">{description}</p>
        </div>
        <Badge className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#111827] shadow-[inset_0_0_0_1px_#e5e7eb]">
          {count}
        </Badge>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

export function MiniAssetCard({
  asset,
  onChoose,
}: {
  asset: AssetSummary;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="w-full rounded-[16px] border border-[#e5e7eb] bg-white px-4 py-3 text-left transition-colors hover:border-[#cdd5df]"
    >
      <p className="text-[14px] font-medium text-[#111827]">{asset.name}</p>
      <p className="mt-1 text-[12px] text-[#6b7280]">
        {asset.assetCode}
        {asset.currentHolderName ? ` · ${asset.currentHolderName}` : ''}
      </p>
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#d5dbe3] bg-[#fbfcfb] px-5 py-10 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-white text-[#6b7280] shadow-[inset_0_0_0_1px_#e5e7eb]">
        {icon}
      </div>
      <p className="mt-3 text-[15px] font-medium text-[#111827]">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#6b7280]">{description}</p>
    </div>
  );
}

export function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={label === 'Complete Maintenance' ? 'default' : 'outline'}
      onClick={onClick}
      className={cn(
        'h-8 rounded-full px-3 text-[12px]',
        label === 'Complete Maintenance' && 'border-0 text-white',
      )}
      style={label === 'Complete Maintenance' ? { backgroundColor: ACTION_GREEN } : undefined}
    >
      {label}
    </Button>
  );
}

export function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border-[#e5e7eb] shadow-none focus-visible:ring-1 focus-visible:ring-[#00874a]"
      />
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf0f2] pb-3 last:border-b-0 last:pb-0">
      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#6b7280]">{label}</p>
      <p className="text-right text-[14px] text-[#111827]">{value}</p>
    </div>
  );
}

export function HistorySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-[#fbfcfb] p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-2xl bg-white text-[#111827] shadow-[inset_0_0_0_1px_#e5e7eb]">
          {icon}
        </div>
        <p className="text-[16px] font-medium text-[#111827]">{title}</p>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

export function TimelineCard({
  title,
  subtitle,
  body,
  footer,
}: {
  title: string;
  subtitle: string;
  body: string;
  footer: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white p-4">
      <div className="flex flex-col gap-1">
        <p className="text-[14px] font-medium text-[#111827]">{title}</p>
        <p className="text-[12px] text-[#6b7280]">{subtitle}</p>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-[#374151]">{body}</p>
      <p className="mt-3 text-[12px] font-medium text-[#6b7280]">{footer}</p>
    </div>
  );
}
