'use client';

import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { checkPasswordRules, type PasswordRuleState } from '@/lib/password';
import { cn } from '@/lib/utils';
import { setPasswordAction } from '@/modules/settings/api/settingsServerActions';

interface UserPasswordTabProps {
  orgSlug: string;
  memberId: string;
}

export function UserPasswordTab({ orgSlug, memberId }: Readonly<UserPasswordTabProps>) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rules, setRules] = useState<PasswordRuleState[]>([]);

  const handlePasswordChange = useCallback((value: string) => {
    setNewPassword(value);
    setRules(checkPasswordRules(value));
  }, []);

  const handleSave = useCallback(() => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const allPassed = rules.every((r) => r.passed);
    if (!allPassed || !newPassword) {
      toast.error('Password does not meet requirements');
      return;
    }

    startTransition(async () => {
      const result = await setPasswordAction({ orgSlug, memberId, newPassword });
      if (result.success) {
        toast.success('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
        setRules([]);
      } else {
        toast.error(result.error ?? 'Failed to set password');
      }
    });
  }, [newPassword, confirmPassword, rules, orgSlug, memberId]);

  const allPassed = rules.length > 0 && rules.every((r) => r.passed);
  const canSave = newPassword.length > 0 && confirmPassword.length > 0 && allPassed;

  return (
    <div>
      <div className="pb-5 border-b border-neutral-200/70">
        <h2 className="text-[17px] font-semibold text-neutral-900">Password</h2>
        <p className="mt-0.5 text-[14px] text-neutral-500 leading-relaxed">
          Set or change your password. You can also continue using &quot;Sign in with Microsoft&quot;.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <div className="max-w-sm">
          <Field>
            <FieldLabel htmlFor="new-password">New Password</FieldLabel>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
        </div>

        {rules.length > 0 && (
          <div className="flex flex-col gap-2 max-w-sm">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2.5 text-[13px]">
                <div className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full",
                  rule.passed ? "bg-green-100" : "bg-neutral-100",
                )}>
                  {rule.passed ? (
                    <Check className="size-2.5 text-green-700" />
                  ) : (
                    <X className="size-2.5 text-neutral-400" />
                  )}
                </div>
                <span className={rule.passed ? 'text-green-700' : 'text-neutral-500'}>
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-sm">
          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
        </div>

        <div className="pt-2 border-t border-neutral-200/70">
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !canSave}
            className="min-w-[140px]"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Password'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
