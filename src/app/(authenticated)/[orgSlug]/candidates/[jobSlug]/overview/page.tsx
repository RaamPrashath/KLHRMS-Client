import { redirect } from 'next/navigation';

export default async function CandidatesOverviewPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}>) {
  const { orgSlug, jobSlug } = await params;
  redirect(`/${orgSlug}/candidates/${jobSlug}`);
}
