'use client';

import {
  BadgeCheck,
  PackageOpen,
} from 'lucide-react';
import Image from 'next/image';
import {
  FloatingPanelBody,
  FloatingPanelCloseButton,
  FloatingPanelContent,
  FloatingPanelRoot,
  FloatingPanelTrigger,
} from '@/components/ui/floating-panel';
import { cn } from '@/lib/utils';
import { humanize } from '@/modules/assets/lib/assetUtils';
import type { AssetSummary, CustomFieldValueResponse } from '@/modules/assets/types/assetTypes';

const TILE_RHYTHM = [
  'aspect-[1/1]',
  'aspect-[4/5]',
  'aspect-[1/1]',
  'aspect-[3/4]',
  'aspect-[5/6]',
  'aspect-[1/1]',
];

const VISUAL_TONES = [
  'bg-[#f3f4f2] text-[#1d1d1f]',
  'bg-[#eef3f6] text-[#243244]',
  'bg-[#f7f2eb] text-[#3b332a]',
  'bg-[#eff4ef] text-[#1f3a2b]',
  'bg-[#f4f1f6] text-[#31273b]',
  'bg-[#eef1f5] text-[#28313f]',
];

const IMAGE_FIELD_HINTS = ['image', 'photo', 'picture', 'thumbnail', 'visual'];
const FALLBACK_ASSET_IMAGE = '/laptop.png';
const MOUSE_FALLBACK_IMAGE = '/mouse.jpg';
const KEYBOARD_FALLBACK_IMAGE = '/keyboard.jpg';
const HEADPHONES_FALLBACK_IMAGE = '/headphones.jpg';
const HEADPHONE_HINTS = ['headphone', 'headphones', 'headset', 'earphone', 'earphones', 'airpods', 'earbud', 'earbuds'];
const MOUSE_HINTS = ['mouse', 'mice', 'wireless mouse', 'gaming mouse'];
const KEYBOARD_HINTS = ['keyboard', 'keyboards', 'mechanical keyboard', 'wireless keyboard'];

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

function getVisibleCustomFields(asset: AssetSummary) {
  return asset.customFields.filter((field) => {
    const fieldName = field.fieldName.toLowerCase();
    return !IMAGE_FIELD_HINTS.some((hint) => fieldName.includes(hint));
  });
}

function getFallbackAssetImage(asset: AssetSummary) {
  const haystack = `${asset.name} ${asset.model ?? ''} ${asset.category}`.toLowerCase();

  if (MOUSE_HINTS.some((hint) => haystack.includes(hint))) {
    return MOUSE_FALLBACK_IMAGE;
  }

  if (KEYBOARD_HINTS.some((hint) => haystack.includes(hint))) {
    return KEYBOARD_FALLBACK_IMAGE;
  }

  if (HEADPHONE_HINTS.some((hint) => haystack.includes(hint))) {
    return HEADPHONES_FALLBACK_IMAGE;
  }

  return FALLBACK_ASSET_IMAGE;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-[#f0f0f2] py-2.5 last:border-b-0">
      <span className="text-[12px] font-medium text-[#86868b]">{label}</span>
      <span className="min-w-0 text-[13px] leading-5 text-[#1d1d1f]">{value || 'Not recorded'}</span>
    </div>
  );
}

function CustomFields({ fields }: { fields: CustomFieldValueResponse[] }) {
  if (!fields.length) return null;

  return (
    <div className="mt-4 border-t border-[#f0f0f2] pt-2">
      {fields.map((field) => (
        <DetailRow key={field.fieldDefinitionId} label={field.fieldName} value={field.value} />
      ))}
    </div>
  );
}

function AssetTileVisual({ asset, index }: { asset: AssetSummary; index: number }) {
  const fallbackImage = getFallbackAssetImage(asset);
  const imageUrl = getAssetImageUrl(asset) ?? fallbackImage;
  const tone = VISUAL_TONES[index % VISUAL_TONES.length];

  return (
    <div className={cn('relative size-full overflow-hidden', tone)}>
      <Image
        src={imageUrl}
        alt={asset.name}
        fill
        sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        unoptimized
        className={cn(
          'transition-transform duration-300 ease-out group-hover:scale-[1.025]',
          imageUrl === fallbackImage ? 'object-contain p-8 sm:p-10' : 'object-cover',
        )}
      />
    </div>
  );
}

function AssetDetailPanel({ asset }: { asset: AssetSummary }) {
  const visibleCustomFields = getVisibleCustomFields(asset);

  return (
    <FloatingPanelContent className="w-[min(calc(100vw-2rem),22rem)] max-h-[min(34rem,calc(100vh-2rem))] overflow-hidden rounded-[18px] border-[#e5e5ea] shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
      <FloatingPanelBody className="max-h-[calc(min(34rem,100vh-2rem)-2.75rem)] overflow-y-auto px-4 pb-4 pt-1">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">{asset.name}</p>
            <p className="mt-0.5 text-[12px] font-medium text-[#86868b]">{humanize(asset.category)}</p>
          </div>
          <FloatingPanelCloseButton className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7]" />
        </div>

        <div className="rounded-[14px] bg-[#f5f5f7] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1d1d1f]">
            <BadgeCheck className="size-4 text-[#00874a]" />
            {humanize(asset.status)}
          </div>
        </div>

        <div className="mt-3">
          <DetailRow label="Asset Name" value={asset.name} />
          <DetailRow label="Asset ID" value={asset.assetCode} />
          <DetailRow label="Serial No." value={asset.serialNumber} />
          <DetailRow label="Status" value={humanize(asset.status)} />
        </div>

        <CustomFields fields={visibleCustomFields} />
      </FloatingPanelBody>
    </FloatingPanelContent>
  );
}

export function EmployeeAssetGallery({
  assets,
  isLoading,
}: {
  assets: AssetSummary[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'mb-5 inline-block w-full animate-pulse rounded-[18px] bg-[#f0f0f2]',
              TILE_RHYTHM[index % TILE_RHYTHM.length],
            )}
          />
        ))}
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-[18px] bg-[#f5f5f7] px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#e8e8eb]">
          <PackageOpen className="size-6 text-[#86868b]" />
        </div>
        <p className="mt-4 text-[16px] font-semibold text-[#1d1d1f]">No assigned assets found</p>
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-[#6e6e73]">
          Any equipment issued to you will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5">
      {assets.map((asset, index) => (
        <FloatingPanelRoot key={asset.id} className="mb-5 inline-block w-full break-inside-avoid">
          <FloatingPanelTrigger
            title={asset.name}
            className={cn(
              'group block h-auto w-full overflow-hidden rounded-[18px] border-0 bg-transparent p-0 text-left text-[#1d1d1f] shadow-none outline-none ring-offset-2 transition-transform duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#00874a]',
              TILE_RHYTHM[index % TILE_RHYTHM.length],
            )}
          >
            <div className="relative size-full overflow-hidden rounded-[18px] bg-[#f5f5f7]">
              <AssetTileVisual asset={asset} index={index} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(29,29,31,0.72),rgba(29,29,31,0))] px-4 pb-3 pt-12 text-white">
                <p className="truncate text-[15px] font-semibold leading-5">{asset.name}</p>
                <p className="mt-0.5 truncate text-[12px] font-normal text-white/78">
                  {asset.model || humanize(asset.category)}
                </p>
              </div>
            </div>
          </FloatingPanelTrigger>
          <AssetDetailPanel asset={asset} />
        </FloatingPanelRoot>
      ))}
    </div>
  );
}
