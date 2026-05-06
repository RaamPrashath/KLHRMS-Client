'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  HRMS_MODULES,
  HRMS_ACTIONS,
  roleCreateSchema,
  type RoleFormValues,
} from '@/modules/roles/schema/roleSchemas';
import { type RoleResponse, type ApiError, type RolePermissions } from '@/modules/roles/types/role';
import { useCreateRole } from '@/modules/roles/hooks/useCreateRole';
import { useUpdateRole } from '@/modules/roles/hooks/useUpdateRole';
import { RolePermissionsGrid } from '@/modules/roles/components/RolePermissionsGrid';
import { Spinner } from '@/components/ui/spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoleFormMode = 'create' | 'edit';

export interface RoleFormProps {
  mode: RoleFormMode;
  orgSlug: string;
  memberId: string;
  initialRole?: RoleResponse;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a full permissions map with every module/action set to 'none'. */
function buildEmptyPermissions(): RolePermissions {
  const map: RolePermissions = {};
  for (const mod of HRMS_MODULES) {
    map[mod] = {};
    for (const action of HRMS_ACTIONS) {
      (map[mod] as Record<string, string>)[action] = 'none';
    }
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoleForm({
  mode,
  orgSlug,
  memberId,
  initialRole,
  onSuccess,
  onCancel,
}: Readonly<RoleFormProps>) {
  const router = useRouter();
  const createRole = useCreateRole(orgSlug, memberId);
  const updateRole = useUpdateRole(orgSlug, memberId);

  const isPending = mode === 'create' ? createRole.isPending : updateRole.isPending;

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: {
      name: initialRole?.name ?? '',
      permissions: initialRole?.permissions ?? buildEmptyPermissions(),
    },
  });

  function handleApiError(err: unknown) {
    const apiError = err as ApiError;
    if (apiError?.status === 409) {
      setError('name', { message: 'A role with this name already exists' });
    } else if (apiError?.status === 400) {
      setError('name', { message: apiError.message });
    } else {
      setError('root', {
        message:
          apiError?.message ?? 'Something went wrong. Please try again.',
      });
    }
  }

  function onSubmit(data: RoleFormValues) {
    if (mode === 'create') {
      createRole.mutate(data, {
        onSuccess: () => {
          onSuccess?.();
          router.push(`/${orgSlug}/permissions`);
        },
        onError: handleApiError,
      });
    } else if (initialRole) {
      updateRole.mutate(
        { roleId: initialRole.id, data },
        {
          onSuccess: () => {
            onSuccess?.();
            router.push(`/${orgSlug}/permissions`);
          },
          onError: handleApiError,
        },
      );
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/${orgSlug}/permissions`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Root-level error */}
      {errors.root && (
        <div className="rounded-lg border border-destructive-border bg-destructive-bg p-3 text-sm text-destructive-text">
          {errors.root.message}
        </div>
      )}

      {/* Role name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="role-name"
          className="text-[13px] font-medium text-neutral-700"
        >
          Role name <span className="text-destructive-text">*</span>
        </label>
        <input
          id="role-name"
          type="text"
          placeholder="e.g. HR Manager"
          {...register('name')}
          className="
            bg-surface border border-neutral-200 rounded-md
            px-3 py-2 text-sm font-sans text-neutral-900
            placeholder:text-neutral-400
            focus:border-primary focus:outline-none
            focus:ring-[3px] focus:ring-primary/10
            disabled:bg-neutral-50 disabled:border-neutral-100 disabled:text-neutral-400
            aria-invalid:border-destructive aria-invalid:ring-destructive/10
          "
          aria-invalid={errors.name ? 'true' : undefined}
          disabled={isPending}
        />
        {errors.name && (
          <p className="text-xs text-destructive-text">{errors.name.message}</p>
        )}
      </div>

      {/* Permissions matrix */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-neutral-700">
          Permissions
        </span>
        {errors.permissions?.root?.message && (
          <p className="text-xs text-destructive-text">
            {String(errors.permissions.root.message)}
          </p>
        )}
        <Controller
          name="permissions"
          control={control}
          render={({ field }) => (
            <RolePermissionsGrid
              value={field.value}
              onChange={field.onChange}
              disabled={isPending}
            />
          )}
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="
            bg-transparent border border-neutral-200 text-neutral-700
            hover:bg-neutral-50
            text-sm font-medium px-4 py-2 rounded-md
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-100 motion-reduce:transition-none
          "
        >
          {mode === 'create' ? 'Discard' : 'Cancel'}
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="
            bg-primary hover:bg-primary-hover active:bg-primary-press
            text-white text-sm font-medium
            px-4 py-2 rounded-md
            focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
            focus-visible:shadow-(--shadow-focus)
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
            transition-colors duration-100 motion-reduce:transition-none
            active:scale-[0.98]
          "
        >
          {isPending && <Spinner className="size-4" />}
          {mode === 'create' ? 'Create role' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
