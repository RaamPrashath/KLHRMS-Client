import { redirect } from 'next/navigation';

export default async function LegacyLeaveCalendarPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/leaves/requests`);
}
