import { NextResponse } from 'next/server';
import { requireOrgMembership } from '@/lib/organizations';
import { getRequestSession } from '@/lib/server-session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getRequestSession(request.headers);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;
    const { org, member } = await requireOrgMembership(session.user.id, slug);

    return NextResponse.json({
      organization: org,
      membership: {
        role: member.role?.name ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    let status = 500;

    if (message === 'Forbidden') {
      status = 403;
    } else if (message === 'Organization not found') {
      status = 404;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
