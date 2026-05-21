'use client';

import {
  BadgeCheck,
  PackageOpen,
} from 'lucide-react';
import { useState } from 'react';
import CircularGallery from '@/components/CircularGallery';
import {
  FloatingPanelBody,
  FloatingPanelCloseButton,
  FloatingPanelContent,
  FloatingPanelRoot,
  useFloatingPanel,
} from '@/components/ui/floating-panel';
import { humanize } from '@/modules/assets/lib/assetUtils';
import type { AssetSummary, CustomFieldValueResponse } from '@/modules/assets/types/assetTypes';

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
  if (MOUSE_HINTS.some((hint) => haystack.includes(hint))) return MOUSE_FALLBACK_IMAGE;
  if (KEYBOARD_HINTS.some((hint) => haystack.includes(hint))) return KEYBOARD_FALLBACK_IMAGE;
  if (HEADPHONE_HINTS.some((hint) => haystack.includes(hint))) return HEADPHONES_FALLBACK_IMAGE;
  return FALLBACK_ASSET_IMAGE;
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-[#f0f0f2] py-2.5 last:border-b-0">
      <span className="text-[12px] font-medium text-neutral-400">{label}</span>
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

function AssetDetailPanel({ asset }: { asset: AssetSummary }) {
  const visibleCustomFields = getVisibleCustomFields(asset);

  return (
    <FloatingPanelContent className="w-[min(calc(100vw-2rem),22rem)] max-h-[min(34rem,calc(100vh-2rem))] overflow-hidden rounded-[18px] border-[#e5e5ea] shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
      <FloatingPanelBody className="max-h-[calc(min(34rem,100vh-2rem)-2.75rem)] overflow-y-auto px-4 pb-4 pt-1">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-neutral-400">{humanize(asset.category)}</p>
          </div>
          <FloatingPanelCloseButton className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7]" />
        </div>

        <div className="rounded-2xl bg-[#f5f5f7] px-3 py-2.5">
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

// Must be a child of FloatingPanelRoot to access context
function GalleryInner({ assets }: { assets: AssetSummary[] }) {
  const { openFloatingPanel, setTitle } = useFloatingPanel();
  const [selectedAsset, setSelectedAsset] = useState<AssetSummary | null>(null);

  const galleryItems = assets.map((asset) => ({
    image: getAssetImageUrl(asset) ?? getFallbackAssetImage(asset),
    text: asset.name,
  }));

  function openSelectedAsset(asset: AssetSummary, rect: DOMRect) {
    setSelectedAsset(asset);
    setTitle(asset.name);
    openFloatingPanel(rect);
  }

  function handleItemClick(index: number, rect: DOMRect) {
    const asset = assets[index];
    if (!asset) return;
    openSelectedAsset(asset, rect);
  }

  return (
    <>
      <div
        className="relative h-96 w-full cursor-pointer select-none overflow-hidden rounded-[18px]"
        title="Click to view asset details"
      >
        <CircularGallery
          items={galleryItems}
          bend={0}
          textColor="#1d1d1f"
          borderRadius={0.06}
          font="600 18px system-ui, -apple-system, sans-serif"
          scrollSpeed={2}
          scrollEase={0.06}
          onItemClick={handleItemClick}
        />

        {/* Hint pill */}
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm">
            Click to view details · Drag to browse
          </span>
        </div>
      </div>

      {selectedAsset && <AssetDetailPanel asset={selectedAsset} />}
    </>
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
      <div className="relative h-96 w-full overflow-hidden rounded-[18px] bg-[#f0f0f2]">
        <div className="flex h-full items-center justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-56 w-40 animate-pulse rounded-2xl bg-[#e0e0e2]"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-[18px] bg-[#f5f5f7] px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-surface-muted">
          <PackageOpen className="size-6 text-neutral-400" />
        </div>
        <p className="mt-4 text-[16px] font-semibold text-[#1d1d1f]">No assigned assets found</p>
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-[#6e6e73]">
          Any equipment issued to you will appear here.
        </p>
      </div>
    );
  }

  return (
    <FloatingPanelRoot>
      <GalleryInner assets={assets} />
    </FloatingPanelRoot>
  );
}
