'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateOrganizationAction } from '@/app/actions/organizationActions';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface OrganizationDetailsFormProps {
  orgSlug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export function OrganizationDetailsForm({
  orgSlug,
  name,
  latitude,
  longitude,
}: Readonly<OrganizationDetailsFormProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      action={(formData) => {
        startTransition(async () => {
          const result = await updateOrganizationAction(orgSlug, formData);

          if (!result.success) {
            toast.error(result.error ?? 'Failed to save organization settings');
            return;
          }

          toast.success('Organization settings saved');
          router.refresh();
        });
      }}
    >
      <Field>
        <FieldLabel htmlFor="name">Organization name</FieldLabel>
        <Input id="name" name="name" type="text" defaultValue={name} required />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="latitude">Office latitude</FieldLabel>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            inputMode="decimal"
            step="any"
            min={-90}
            max={90}
            defaultValue={latitude ?? ''}
            placeholder="e.g. 13.0827"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="longitude">Office longitude</FieldLabel>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            inputMode="decimal"
            step="any"
            min={-180}
            max={180}
            defaultValue={longitude ?? ''}
            placeholder="e.g. 80.2707"
          />
        </Field>
      </div>

      <p className="text-xs text-muted-foreground">
        Leave either coordinate empty to clear the saved office location.
      </p>

      <Button type="submit" className="w-full sm:w-fit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}
