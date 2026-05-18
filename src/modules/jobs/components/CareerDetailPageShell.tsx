'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, CalendarDays, MapPin, MonitorDot, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CareerApplicationDialog } from '@/modules/jobs/components/CareerApplicationDialog';
import { usePublicCareerPostingQuery } from '@/modules/jobs/hooks/usePublicCareerQueries';

interface CareerDetailPageShellProps {
  jobId: string;
}

function getErrorMessage(error: Error | null) {
  if (!error) return 'Failed to load job details.';
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // ignore parse failures
  }
  return 'Failed to load job details.';
}

function formatEmploymentType(value: string | null) {
  if (!value) return null;
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSalaryRange(data: {
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
}) {
  if (data.salaryMin == null && data.salaryMax == null) return null;
  const currency = data.currency ?? '';
  if (data.salaryMin != null && data.salaryMax != null) {
    return `${currency} ${data.salaryMin} - ${data.salaryMax}`;
  }
  if (data.salaryMin != null) {
    return `${currency} ${data.salaryMin}+`;
  }
  return `${currency} up to ${data.salaryMax}`;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function RichSection({
  title,
  html,
  fallback,
}: Readonly<{
  title: string;
  html: string | null;
  fallback?: string;
}>) {
  const content = html ?? fallback;
  if (!content) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="max-w-none whitespace-pre-wrap text-sm leading-6 text-foreground [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
}

export function CareerDetailPageShell({
  jobId,
}: Readonly<CareerDetailPageShellProps>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError, error } = usePublicCareerPostingQuery(jobId);

  return (
    <main className="min-h-screen bg-background px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href="/careers">
              <ArrowLeft className="size-4" />
              Back to careers
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardHeader className="gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-72" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ) : null}

        {isError ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              {getErrorMessage(error)}
            </CardContent>
          </Card>
        ) : null}

        {data ? (
          <>
            {(() => {
              const salaryRange = formatSalaryRange(data);
              const targetDate = formatDate(data.targetDate);
              const employmentType = formatEmploymentType(data.employmentType);

              return (
                <>
            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{data.organizationName}</Badge>
                  {data.location ? <Badge variant="outline">{data.location}</Badge> : null}
                  {employmentType ? (
                    <Badge variant="outline">{employmentType}</Badge>
                  ) : null}
                  {data.isRemote ? <Badge variant="outline">Remote</Badge> : null}
                </div>
                <div className="space-y-3">
                  <CardTitle className="text-3xl">{data.title}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4" />
                      <span>{data.organizationName}</span>
                    </div>
                    {data.location ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4" />
                        <span>{data.location}</span>
                      </div>
                    ) : null}
                    {salaryRange ? (
                      <div className="flex items-center gap-2">
                        <Wallet className="size-4" />
                        <span>{salaryRange}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  Published role for organization slug `/{data.organizationSlug}`.
                </p>
                <Button onClick={() => setDialogOpen(true)}>Apply</Button>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Role Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Wallet className="size-4" />
                      Salary range
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {salaryRange ?? 'Not specified'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarDays className="size-4" />
                      Target hire date
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {targetDate ?? 'Not specified'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MonitorDot className="size-4" />
                      Work setup
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.isRemote ? 'Remote-friendly role' : 'On-site / location-based role'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium text-foreground">Openings</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.openings ?? 'Not specified'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <RichSection title="Role Summary" html={data.roleSummary} fallback={data.description} />
              <RichSection title="Responsibilities" html={data.responsibilities} />
              <RichSection
                title="Requirements"
                html={data.requirementsRich}
                fallback={data.requirements || 'No additional requirements were provided for this posting.'}
              />
              <RichSection title="Benefits" html={data.benefits} />
              <RichSection title="About Team" html={data.aboutTeam} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Skills Required</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.skills.map((skill) => (
                        <Badge key={`${data.id}-${skill}`} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No specific skills were listed for this role.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <CareerApplicationDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              jobId={data.id}
              organizationId={data.organizationId}
              jobTitle={data.title}
            />
                </>
              );
            })()}
          </>
        ) : null}
      </div>
    </main>
  );
}
