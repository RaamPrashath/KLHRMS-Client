'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { useDeleteRole } from '@/modules/roles/hooks/useDeleteRole';
import { type RoleResponse, type ApiError } from '@/modules/roles/types/role';

export interface DeleteRoleDialogProps {
  role: RoleResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
}

export function DeleteRoleDialog({
  role,
  open,
  onOpenChange,
  orgSlug,
  memberId,
}: DeleteRoleDialogProps) {
  const { mutate, isPending, error, isError } = useDeleteRole(orgSlug, memberId);

  function handleDelete() {
    if (!role) return;
    mutate(role.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  const apiError = isError && error ? (error as unknown as ApiError) : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {role?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The role will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {apiError && (
          <div className="rounded-lg border border-destructive-border bg-destructive-bg p-3 text-sm text-destructive-text">
            {apiError.message}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-destructive-bg border border-destructive-border text-destructive-text hover:bg-[#f5c6c5]"
          >
            {isPending && <Spinner className="mr-2 size-4" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
