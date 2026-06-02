import { NextResponse } from 'next/server';

import { getFlowByShareToken } from '@/lib/db/flows';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  try {
    const flow = await getFlowByShareToken(token);
    if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ name: flow.name, data: flow.data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shared flow' }, { status: 500 });
  }
}
