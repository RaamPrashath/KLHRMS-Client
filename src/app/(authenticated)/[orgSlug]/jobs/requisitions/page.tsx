import { redirect } from 'next/navigation';

export default async function JobRequisitionsPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/jobs`);
}
