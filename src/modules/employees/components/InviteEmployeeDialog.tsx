'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { inviteEmployeeAction } from '@/app/actions/employeeInviteActions';
import { useEmployeeRolesQuery } from '@/modules/employees/hooks/useEmployeesQuery';

interface InviteEmployeeDialogProps {
  orgSlug: string;
  memberId: string;
}

export function InviteEmployeeDialog({ orgSlug, memberId }: Readonly<InviteEmployeeDialogProps>) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { data: roles = [] } = useEmployeeRolesQuery(orgSlug, memberId);
  const defaultRoleId = useMemo(
    () => roles.find((r) => r.name === 'Employee')?.id ?? '',
    [roles],
  );

  const handleSubmit = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const result = await inviteEmployeeAction(orgSlug, formData);
        if (result.success) {
          toast.success(
            result.wasCreated
              ? 'Employee added. They can sign in with their email and password: org123'
              : 'Employee added to organization',
          );
          setOpen(false);
          formRef.current?.reset();
        } else {
          toast.error(result.error ?? 'Failed to add employee');
        }
      });
    },
    [orgSlug],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite Employee</Button>
      </DialogTrigger>
      <DialogContent>
        <form ref={formRef} action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite Employee</DialogTitle>
            <DialogDescription>
              Add a new employee to the organization. They&apos;ll receive access with the default
              password.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="roleId">Role</FieldLabel>
              <select
                id="roleId"
                name="roleId"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
                defaultValue={defaultRoleId}
              >
                {!defaultRoleId && (
                  <option value="" disabled>
                    Select a role
                  </option>
                )}
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding…' : 'Add Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
