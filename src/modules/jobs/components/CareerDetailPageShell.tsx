'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  GraduationCap,
  MapPin,
  MonitorDot,
  Shield,
  Sparkles,
  Timer,
  Wallet,
} from 'lucide-react';

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

function formatExperienceLevel(value: string | null) {
  if (!value) return null;
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatHiringReason(value: string | null) {
  if (!value) return null;
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function RichSection({
  title,
  html,
  fallback,
  icon: Icon,
}: Readonly<{
  title: string;
  html: string | null;
  fallback?: string;
  icon?: React.ElementType;
}>) {
  const content = html ?? fallback;
  if (!content) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {Icon ? <Icon className="size-5 text-muted-foreground" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-muted-foreground prose-p:leading-6 prose-a:text-primary prose-a:underline prose-strong:text-foreground prose-code:text-sm prose-code:bg-neutral-100 prose-code:rounded prose-code:px-1 prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-pre:rounded-lg prose-pre:p-4 prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-muted-foreground [&_img]:rounded-lg [&_img]:border [&_img]:border-neutral-100"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </CardContent>
    </Card>
  );
}

function PlainSection({
  title,
  text,
  icon: Icon,
}: Readonly<{
  title: string;
  text: string | null;
  icon?: React.ElementType;
}>) {
  if (!text) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {Icon ? <Icon className="size-5 text-muted-foreground" /> : null}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {text}
        </div>
      </CardContent>
    </Card>
  );
}

export function CareerDetailPageShell({
  jobId,
}: Readonly<CareerDetailPageShellProps>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError, error } = usePublicCareerPostingQuery(jobId);

  const salaryRange = data ? formatSalaryRange(data) : null;
  const targetDate = data ? formatDate(data.targetDate) : null;
  const employmentType = data ? formatEmploymentType(data.employmentType) : null;
  const experienceLevel = data ? formatExperienceLevel(data.experienceLevel) : null;
  const hiringReason = data ? formatHiringReason(data.hiringReason) : null;
  const hasRichContent = data
    ? !!(data.roleSummary || data.responsibilities || data.requirementsRich || data.benefits || data.aboutTeam)
    : false;

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
          <div className="flex flex-col gap-6">
            {/* HERO HEADER */}
            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{data.organizationName}</Badge>
                  {data.departmentName ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Building2 className="size-3" />
                      {data.departmentName}
                    </Badge>
                  ) : null}
                  {data.location ? <Badge variant="outline">{data.location}</Badge> : null}
                  {employmentType ? (
                    <Badge variant="outline">{employmentType}</Badge>
                  ) : null}
                  {data.isRemote ? <Badge variant="outline">Remote</Badge> : null}
                  {experienceLevel ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Brain className="size-3" />
                      {experienceLevel}
                    </Badge>
                  ) : null}
                  {hiringReason ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Shield className="size-3" />
                      {hiringReason}
                    </Badge>
                  ) : null}
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
                    {data.openings ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{data.openings} {data.openings === 1 ? 'opening' : 'openings'}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {targetDate ? (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      Target: {targetDate}
                    </span>
                  ) : null}
                  <span>Published: {formatDate(data.publishedAt) ?? 'Recently'}</span>
                </div>
                <Button onClick={() => setDialogOpen(true)}>
                  <Sparkles className="size-4" />
                  Apply
                </Button>
              </CardContent>
            </Card>

            {/* ROLE SNAPSHOT */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="size-5 text-muted-foreground" />
                  Role Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <MonitorDot className="size-4" />
                    Work setup
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {data.isRemote ? 'Remote-friendly' : 'On-site / location-based'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-foreground">Employment type</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {employmentType ?? 'Not specified'}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-foreground">Openings</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {data.openings ?? 'Not specified'}
                  </p>
                </div>
                {experienceLevel ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Brain className="size-4" />
                      Experience level
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {experienceLevel}
                    </p>
                  </div>
                ) : null}
                {data.minExperience != null ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Timer className="size-4" />
                      Min experience
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.minExperience} {data.minExperience === 1 ? 'year' : 'years'}
                    </p>
                  </div>
                ) : null}
                {data.education ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <GraduationCap className="size-4" />
                      Education
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.education}
                    </p>
                  </div>
                ) : null}
                {targetDate ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarDays className="size-4" />
                      Target hire date
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {targetDate}
                    </p>
                  </div>
                ) : null}
                {hiringReason ? (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Shield className="size-4" />
                      Hiring reason
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {hiringReason}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* RICH CONTENT SECTIONS */}
            {hasRichContent ? (
              <>
                <RichSection title="Role Summary" html={data.roleSummary} icon={BookOpen} />
                <RichSection title="Responsibilities" html={data.responsibilities} icon={Award} />
                <RichSection title="Requirements" html={data.requirementsRich} icon={Brain} />
                <RichSection title="Benefits" html={data.benefits} icon={Wallet} />
                <RichSection title="About Team" html={data.aboutTeam} icon={Building2} />
              </>
            ) : (
              <>
                {/* FALLBACK: Show the combined description as a full job description */}
                <PlainSection
                  title="Job Description"
                  text={data.description !== data.title ? data.description : null}
                  icon={BookOpen}
                />
                <PlainSection
                  title="Requirements"
                  text={data.requirements}
                  icon={Brain}
                />
              </>
            )}

            {/* SKILLS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Brain className="size-5 text-muted-foreground" />
                  Skills Required
                </CardTitle>
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

            {/* CERTIFICATIONS */}
            {data.certifications.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Award className="size-5 text-muted-foreground" />
                    Preferred Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.certifications.map((cert) => (
                      <Badge key={`${data.id}-${cert}`} variant="secondary">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <CareerApplicationDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              jobId={data.id}
              organizationId={data.organizationId}
              jobTitle={data.title}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
