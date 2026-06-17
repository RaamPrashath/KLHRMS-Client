import { redirect } from 'next/navigation';
import { AttendancePageShell } from '@/modules/attendance/components/AttendancePageShell';

const SUPPORTED_PAGE_SIZES = new Set([10, 25, 50, 100]);

function parsePage(value: string | undefined) {
  const page = Number(value ?? '0');
  return Number.isInteger(page) && page >= 0 ? page : 0;
}

function parsePageSize(value: string | undefined) {
  const pageSize = Number(value ?? '25');
  return SUPPORTED_PAGE_SIZES.has(pageSize) ? pageSize : 25;
}

export default async function AttendanceWeekPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}>) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const page = parsePage(query.page);
  const pageSize = parsePageSize(query.pageSize);

  if (query.page !== String(page) || query.pageSize !== String(pageSize)) {
    redirect(`/${orgSlug}/attendance/week?page=${page}&pageSize=${pageSize}`);
  }

  return (
    <AttendancePageShell
      mode="weekly"
      pageIndex={page}
      pageSize={pageSize}
    />
  );
}
