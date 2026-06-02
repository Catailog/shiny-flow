import { NextResponse } from 'next/server';

import { auth } from '@/auth';

import { listFlows, saveFlow } from '@/lib/db/flows';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const flows = await listFlows(session.user.id);
    return NextResponse.json(flows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch flows' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, data } = await req.json();
    if (!name || !data)
      return NextResponse.json({ error: 'name and data are required' }, { status: 400 });

    const flow = await saveFlow(session.user.id, name, data);
    return NextResponse.json(flow, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save flow' }, { status: 500 });
  }
}
