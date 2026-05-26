'use client';

import {
  Laptop,
  Smartphone,
  Monitor,
  Keyboard,
  Mouse,
  Headphones,
  BadgeCheck,
  PackageOpen,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { humanize } from '@/modules/assets/lib/assetUtils';
import type { AssetSummary } from '@/modules/assets/types/assetTypes';

const IMAGE_FIELD_HINTS = ['image', 'photo', 'picture', 'thumbnail', 'visual'];
const FALLBACK_ASSET_IMAGE = '/laptop.png';
const MOUSE_FALLBACK_IMAGE = '/mouse.jpg';
const KEYBOARD_FALLBACK_IMAGE = '/keyboard.jpg';
const HEADPHONES_FALLBACK_IMAGE = '/headphones.jpg';

const HEADPHONE_HINTS = ['headphone', 'headphones', 'headset', 'earphone', 'earphones', 'airpods', 'earbud', 'earbuds'];
const MOUSE_HINTS = ['mouse', 'mice', 'wireless mouse', 'gaming mouse'];
const KEYBOARD_HINTS = ['keyboard', 'keyboards', 'mechanical keyboard', 'wireless keyboard'];

const STATUS_THEME: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  AVAILABLE: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-100/60' },
  ASSIGNED: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50/60', border: 'border-blue-100/60' },
  IN_MAINTENANCE: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/60', border: 'border-amber-100/60' },
  PENDING_RETURN: { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50/60', border: 'border-orange-100/60' },
  DAMAGED: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/60', border: 'border-rose-100/60' },
  LOST: { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50/60', border: 'border-orange-100/60' },
  RETIRED: { dot: 'bg-neutral-500', text: 'text-neutral-700', bg: 'bg-neutral-50/60', border: 'border-neutral-100/60' },
  DISPOSED: { dot: 'bg-neutral-500', text: 'text-neutral-700', bg: 'bg-neutral-50/60', border: 'border-neutral-100/60' },
};

function isImageUrl(value: string) {
  const normalized = value.trim();
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/') ||
    normalized.startsWith('data:image/')
  );
}

function getAssetImageUrl(asset: AssetSummary) {
  return asset.customFields.find((field) => {
    const fieldName = field.fieldName.toLowerCase();
    return field.value && IMAGE_FIELD_HINTS.some((hint) => fieldName.includes(hint)) && isImageUrl(field.value);
  })?.value ?? null;
}

function getFallbackAssetImage(asset: AssetSummary) {
  const haystack = `${asset.name} ${asset.model ?? ''} ${asset.category}`.toLowerCase();
  if (MOUSE_HINTS.some((hint) => haystack.includes(hint))) return MOUSE_FALLBACK_IMAGE;
  if (KEYBOARD_HINTS.some((hint) => haystack.includes(hint))) return KEYBOARD_FALLBACK_IMAGE;
  if (HEADPHONE_HINTS.some((hint) => haystack.includes(hint))) return HEADPHONES_FALLBACK_IMAGE;
  return FALLBACK_ASSET_IMAGE;
}

function getCategoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes('laptop') || c.includes('macbook') || c.includes('computer')) return Laptop;
  if (c.includes('phone') || c.includes('mobile') || c.includes('ios') || c.includes('android')) return Smartphone;
  if (c.includes('monitor') || c.includes('display') || c.includes('screen')) return Monitor;
  if (c.includes('keyboard')) return Keyboard;
  if (c.includes('mouse') || c.includes('trackpad')) return Mouse;
  if (c.includes('headphone') || c.includes('headset') || c.includes('audio')) return Headphones;
  return Monitor;
}

export function EmployeeAssetGallery({
  assets,
  isLoading,
  onOpenDetail,
}: {
  assets: AssetSummary[];
  isLoading: boolean;
  onOpenDetail: (assetId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[300px] w-full animate-pulse rounded-2xl border border-border bg-white p-3 flex flex-col justify-between"
          >
            <div className="h-[140px] w-full rounded-xl bg-muted/40" />
            <div className="space-y-2 mt-3 flex-1">
              <div className="h-4 w-2/3 rounded bg-muted/40" />
              <div className="h-3.5 w-1/2 rounded bg-muted/40" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-muted/20">
              <div className="h-6 rounded bg-muted/40" />
              <div className="h-6 rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-[18px] bg-white border border-border px-6 text-center shadow-xs">
        <div className="flex size-14 items-center justify-center rounded-full bg-neutral-50 border border-border">
          <PackageOpen className="size-6 text-neutral-400" />
        </div>
        <p className="mt-4 text-[16px] font-semibold text-foreground">No assigned assets found</p>
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted-foreground">
          Any equipment issued to you will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset) => {
        const imageUrl = getAssetImageUrl(asset) ?? getFallbackAssetImage(asset);
        const Icon = getCategoryIcon(asset.category);
        const theme = STATUS_THEME[asset.status] ?? STATUS_THEME.AVAILABLE;

        return (
          <div
            key={asset.id}
            onClick={() => onOpenDetail(asset.id)}
            className="group relative flex h-[310px] w-full flex-col rounded-2xl border border-border bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md cursor-pointer overflow-hidden"
          >
            {/* Visual Header / Image area */}
            <div className="relative h-[150px] w-full bg-neutral-50/50 flex items-center justify-center overflow-hidden border-b border-border/40">
              {/* Product Image */}
              <img
                src={imageUrl}
                alt={asset.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  // If image fails to load, hide it and just let fallback background and icon show
                  e.currentTarget.style.display = 'none';
                }}
              />

              {/* Gradient tint overlay to ensure readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />

              {/* Floating status pill */}
              <div className={cn(
                "absolute top-3 right-3 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs",
                theme.bg,
                theme.border,
                theme.text
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", theme.dot)} />
                {humanize(asset.status)}
              </div>

              {/* Floating category label */}
              <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md shadow-xs">
                <Icon className="size-3 shrink-0" />
                {humanize(asset.category)}
              </div>
            </div>

            {/* Details area */}
            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <h3 className="text-[14px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight">
                  {asset.name}
                </h3>
                <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                  {asset.model || 'Standard Issue'}
                </p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-3 mt-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Asset ID</span>
                  <span className="text-[12px] font-medium text-foreground truncate">{asset.assetCode}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Serial No.</span>
                  <span className="text-[12px] font-mono text-foreground truncate">{asset.serialNumber || '—'}</span>
                </div>
              </div>

              {/* Hover indicator link */}
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors mt-3">
                <span>View Details</span>
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
