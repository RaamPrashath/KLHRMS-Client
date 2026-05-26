'use client';

import { FileText, Monitor } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

interface StageCapabilitySectionProps {
  meetingEnabled: boolean;
  offerLetterEnabled: boolean;
  onMeetingChange: (value: boolean) => void;
  onOfferLetterChange: (value: boolean) => void;
}

export function StageCapabilitySection({
  meetingEnabled,
  offerLetterEnabled,
  onMeetingChange,
  onOfferLetterChange,
}: StageCapabilitySectionProps) {
  const capabilities = [
    {
      id: 'stage-capability-meeting',
      label: 'Online meeting',
      icon: Monitor,
      checked: meetingEnabled,
      onChange: onMeetingChange,
    },
    {
      id: 'stage-capability-offer',
      label: 'Offer letter generation',
      icon: FileText,
      checked: offerLetterEnabled,
      onChange: onOfferLetterChange,
    },
  ];

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-900">Capabilities</h3>
      <div className="space-y-2">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <div
              key={capability.label}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-neutral-100 bg-surface p-3"
              onClick={() => capability.onChange(!capability.checked)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  capability.onChange(!capability.checked);
                }
              }}
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-neutral-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{capability.label}</p>
                </div>
              </div>
              <Switch
                id={capability.id}
                checked={capability.checked}
                onCheckedChange={capability.onChange}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
