'use client';

import { useCallback, useRef, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { updateEmployeeRoleAction } from '@/app/actions/organizationActions';
import type { EmployeeFilterOption } from '@/modules/employees/types/employeeTypes';

interface ChangeEmployeeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  currentRoleName: string | null;
  roles: EmployeeFilterOption[];
}

export function ChangeEmployeeRoleDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  currentRoleName,
  roles,
}: Readonly<ChangeEmployeeRoleDialogProps>) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  const handleSubmit = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const result = await updateEmployeeRoleAction(orgSlug, formData);
        if (result.success) {
          toast.success('Employee role updated');
          await queryClient.invalidateQueries({ queryKey: ['employees', orgSlug] });
          onOpenChange(false);
          formRef.current?.reset();
        } else {
          toast.error(result.error ?? 'Failed to update role');
        }
      });
    },
    [orgSlug, onOpenChange, queryClient],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form ref={formRef} action={handleSubmit}>
          <input type="hidden" name="memberId" value={memberId} />

          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Current role: <span className="font-medium text-foreground">{currentRoleName ?? 'None'}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-roleId">New Role</FieldLabel>
              <select
                id="edit-roleId"
                name="roleId"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Select a role
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Updating…' : 'Update Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
