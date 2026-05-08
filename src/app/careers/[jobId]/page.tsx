import { CareerDetailPageShell } from '@/modules/jobs/components/CareerDetailPageShell';

export default async function CareerDetailPage({
  params,
}: Readonly<{
  params: Promise<{ jobId: string }>;
}>) {
  const { jobId } = await params;

  return <CareerDetailPageShell jobId={jobId} />;
}
