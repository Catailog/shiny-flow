import { NextResponse } from 'next/server';

import { auth } from '@/auth';

import { deleteFlow, getFlow, updateFlow } from '@/lib/db/flows';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const flow = await getFlow(id, session.user.id);
    if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(flow);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch flow' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const patch = await req.json();
    const flow = await updateFlow(id, session.user.id, patch);
    if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(flow);
  } catch {
    return NextResponse.json({ error: 'Failed to update flow' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const deleted = await deleteFlow(id, session.user.id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete flow' }, { status: 500 });
  }
}
