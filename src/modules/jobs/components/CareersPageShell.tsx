'use client';

import Link from 'next/link';
import { BriefcaseBusiness, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCareerPostingsQuery } from '@/modules/jobs/hooks/usePublicCareerQueries';

function getErrorMessage(error: Error | null) {
  if (!error) return 'Failed to load careers.';
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // ignore parse failures
  }
  return 'Failed to load careers.';
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

export function CareersPageShell() {
  const { data = [], isLoading, isError, error } = usePublicCareerPostingsQuery();

  return (
    <main className="min-h-screen bg-background px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
          <Badge variant="outline" className="w-fit">Public Careers</Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Open roles</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Browse currently published roles across organizations and open any role for full details and application.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={`career-skeleton-${index}`}>
                <CardHeader className="gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-full max-w-3xl" />
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {isError ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              {getErrorMessage(error)}
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && data.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <Empty className="border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BriefcaseBusiness className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No published roles yet</EmptyTitle>
                  <EmptyDescription>
                    Careers will appear here once organizations publish job postings.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && data.length > 0 ? (
          <div className="grid gap-4">
            {data.map((posting) => {
              const metadata = [
                posting.location,
                formatEmploymentType(posting.employmentType),
                posting.isRemote ? 'Remote' : null,
                formatSalaryRange(posting),
              ].filter(Boolean);

              return (
                <Card key={posting.id}>
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{posting.organizationName}</Badge>
                      {metadata.map((item) => (
                        <Badge key={`${posting.id}-${item}`} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{posting.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {posting.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {posting.location ? <MapPin className="size-4" /> : null}
                      <span>{posting.location ?? `Organization: ${posting.organizationSlug}`}</span>
                    </div>
                    <Button asChild>
                      <Link href={`/careers/${posting.id}`}>View role</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
