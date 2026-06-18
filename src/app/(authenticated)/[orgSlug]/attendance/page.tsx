import { redirect } from 'next/navigation';

export default async function AttendancePage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/attendance/list?page=0&pageSize=25`);
}
