import { NextResponse } from 'next/server';

import { auth } from '@/auth';

import { createShareToken } from '@/lib/db/flows';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const token = await createShareToken(id, session.user.id);
    if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Failed to create share token' }, { status: 500 });
  }
}
