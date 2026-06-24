import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;

  if (!/^[0-9a-f-]{36}$/.test(accountId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', accountId)
    .single();

  if (error || !data) {
    return NextResponse.json({ name: null }, { status: 200 });
  }

  const name =
    (data as { name: string | null; email: string | null }).name ??
    (data as { name: string | null; email: string | null }).email ??
    null;
  return NextResponse.json({ name });
}
