'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, MapPin, Save, User, UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useUpdateEmployeeDetailsMutation } from '@/modules/employees/hooks/useEmployeeDetailQuery';
import type { EmployeeDetail } from '@/modules/employees/types/employeeDetailTypes';

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
  employee: EmployeeDetail;
}

interface FormState {
  display_name: string;
  given_name: string;
  surname: string;
  job_title: string;
  department_name: string;
  mobile_phone: string;
  office_location: string;
  company_name: string;
  employee_type: string;
  usage_location: string;
  employee_id: string;
  employee_hire_date: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

type EditTab = 'personal' | 'work' | 'location';

const EDIT_TABS: { value: EditTab; label: string; icon: React.ReactNode }[] = [
  { value: 'personal', label: 'Personal', icon: <User className="size-3.5" /> },
  { value: 'work', label: 'Work', icon: <UserCog className="size-3.5" /> },
  { value: 'location', label: 'Location', icon: <MapPin className="size-3.5" /> },
];

function AttendanceStyleTabs({
  activeTab,
  onChange,
}: Readonly<{
  activeTab: EditTab;
  onChange: (value: EditTab) => void;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const activeIdx = EDIT_TABS.findIndex((tab) => tab.value === activeTab);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeButton = container.querySelector<HTMLButtonElement>(
      `[data-tab-index="${activeIdx}"]`,
    );
    if (!activeButton) return;
    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    setIndicatorStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });
  }, [activeIdx]);

  return (
    <div
      ref={containerRef}
      className="flex items-center self-start rounded-xl border border-black/4 bg-neutral-50 p-1 relative"
    >
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {EDIT_TABS.map(({ value, label, icon }, index) => (
        <button
          key={value}
          data-tab-index={index}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={activeTab === value}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium relative z-10 transition-colors duration-200',
            activeTab === value
              ? 'text-primary'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

function toFormState(e: EmployeeDetail): FormState {
  return {
    display_name: e.name ?? '',
    given_name: e.given_name ?? '',
    surname: e.surname ?? '',
    job_title: e.employment.job_title ?? '',
    department_name: e.employment.department ?? '',
    mobile_phone: e.contact.mobile_phone ?? '',
    office_location: e.contact.office_location ?? '',
    company_name: e.employment.company_name ?? '',
    employee_type: e.employment.employee_type ?? '',
    usage_location: e.employment.usage_location ?? '',
    employee_id: e.employment.employee_id ?? '',
    employee_hire_date: e.employment.hire_date ?? '',
    street_address: e.address?.street ?? '',
    city: e.address?.city ?? '',
    state: e.address?.state ?? '',
    postal_code: e.address?.postal_code ?? '',
    country: e.address?.country ?? '',
  };
}

export function EditEmployeeDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
  employee,
}: Readonly<EditEmployeeDialogProps>) {
  const [form, setForm] = useState<FormState>(() => toFormState(employee));
  const [activeTab, setActiveTab] = useState<EditTab>('personal');

  const mutation = useUpdateEmployeeDetailsMutation(orgSlug, memberId, employee.member_id);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setForm(toFormState(employee));
        setActiveTab('personal');
      }
      onOpenChange(nextOpen);
    },
    [employee, onOpenChange],
  );

  const handleChange = useCallback(
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const payload: Record<string, string | null> = {};
      (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
        const value = form[key].trim();
        payload[key] = value === '' ? null : value;
      });
      const promise = mutation.mutateAsync(
        payload as Parameters<typeof mutation.mutateAsync>[0],
      );
      toast.promise(promise, {
        loading: 'Saving changes...',
        success: 'Employee details updated',
        error: (err) => {
          try {
            const parsed = JSON.parse(err.message) as { message?: string };
            return parsed.message ?? 'Failed to save changes';
          } catch {
            return err.message ?? 'Failed to save changes';
          }
        },
      });
      promise
        .then(() => onOpenChange(false))
        .catch(() => {
          // error already shown by toast
        });
    },
    [form, mutation, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl h-[540px] max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
        <DialogHeader className="shrink-0 gap-1 px-6 pt-6 pb-3">
          <DialogTitle>Edit employee details</DialogTitle>
          <DialogDescription>
            Update <span className="font-medium text-foreground">{employee.name}</span>&apos;s
            profile details. Leave a field blank to clear it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EditTab)} className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="shrink-0 border-b border-black/[0.04] px-6 pb-3 pt-1">
              <AttendanceStyleTabs activeTab={activeTab} onChange={setActiveTab} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="personal" className="mt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="display_name">Display name</FieldLabel>
                  <Input
                    id="display_name"
                    value={form.display_name}
                    onChange={handleChange('display_name')}
                    placeholder="Jane Doe"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="given_name">First name</FieldLabel>
                  <Input
                    id="given_name"
                    value={form.given_name}
                    onChange={handleChange('given_name')}
                    placeholder="Jane"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="surname">Last name</FieldLabel>
                  <Input
                    id="surname"
                    value={form.surname}
                    onChange={handleChange('surname')}
                    placeholder="Doe"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="mobile_phone">Mobile phone</FieldLabel>
                  <Input
                    id="mobile_phone"
                    value={form.mobile_phone}
                    onChange={handleChange('mobile_phone')}
                    placeholder="+91 98765 43210"
                    maxLength={50}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="office_location">Office location</FieldLabel>
                  <Input
                    id="office_location"
                    value={form.office_location}
                    onChange={handleChange('office_location')}
                    placeholder="Bengaluru HQ"
                    maxLength={255}
                  />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="work" className="mt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="job_title">Job title</FieldLabel>
                  <Input
                    id="job_title"
                    value={form.job_title}
                    onChange={handleChange('job_title')}
                    placeholder="Senior Engineer"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="department_name">Department</FieldLabel>
                  <Input
                    id="department_name"
                    value={form.department_name}
                    onChange={handleChange('department_name')}
                    placeholder="Engineering"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="employee_id">Employee ID</FieldLabel>
                  <Input
                    id="employee_id"
                    value={form.employee_id}
                    onChange={handleChange('employee_id')}
                    placeholder="EMP-0001"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="employee_type">Employee type</FieldLabel>
                  <Input
                    id="employee_type"
                    value={form.employee_type}
                    onChange={handleChange('employee_type')}
                    placeholder="Full-time"
                    maxLength={100}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company_name">Company</FieldLabel>
                  <Input
                    id="company_name"
                    value={form.company_name}
                    onChange={handleChange('company_name')}
                    placeholder="KL HRMS"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="usage_location">Usage location</FieldLabel>
                  <Input
                    id="usage_location"
                    value={form.usage_location}
                    onChange={handleChange('usage_location')}
                    placeholder="IN"
                    maxLength={10}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="employee_hire_date">Hire date</FieldLabel>
                  <Input
                    id="employee_hire_date"
                    type="date"
                    value={form.employee_hire_date}
                    onChange={handleChange('employee_hire_date')}
                  />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="location" className="mt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="street_address">Street address</FieldLabel>
                  <Input
                    id="street_address"
                    value={form.street_address}
                    onChange={handleChange('street_address')}
                    placeholder="123 Residency Road"
                    maxLength={255}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="city">City</FieldLabel>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={handleChange('city')}
                    placeholder="Bengaluru"
                    maxLength={100}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="state">State</FieldLabel>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={handleChange('state')}
                    placeholder="Karnataka"
                    maxLength={100}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="postal_code">Postal code</FieldLabel>
                  <Input
                    id="postal_code"
                    value={form.postal_code}
                    onChange={handleChange('postal_code')}
                    placeholder="560001"
                    maxLength={20}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={handleChange('country')}
                    placeholder="India"
                    maxLength={100}
                  />
                </Field>
              </div>
            </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="shrink-0 border-t border-black/[0.04] px-6 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="size-4" />
                  Save changes
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
