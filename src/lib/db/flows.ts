import type { FlowData, FlowMeta } from '@/lib/adapters';

import { createSupabaseAdminClient } from '../supabase';

type FlowRow = {
  id: string;
  user_id: string;
  name: string;
  data: FlowData;
  share_token: string | null;
  created_at: string;
  updated_at: string;
};

export async function listFlows(userId: string): Promise<FlowMeta[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('flows')
    .select('id, name, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as Pick<FlowRow, 'id' | 'name' | 'updated_at'>[]).map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updated_at,
  }));
}

export async function getFlow(id: string, userId: string): Promise<FlowRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data as FlowRow;
}

export async function saveFlow(userId: string, name: string, flowData: FlowData): Promise<FlowRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('flows')
    .insert({ user_id: userId, name, data: flowData })
    .select()
    .single();
  if (error) throw error;
  return data as FlowRow;
}

export async function updateFlow(
  id: string,
  userId: string,
  patch: Partial<{ name: string; data: FlowData }>,
): Promise<FlowRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('flows')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data as FlowRow;
}

export async function deleteFlow(id: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase
    .from('flows')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createShareToken(id: string, userId: string): Promise<string | null> {
  const token = crypto.randomUUID();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('flows')
    .update({ share_token: token })
    .eq('id', id)
    .eq('user_id', userId)
    .select('share_token')
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return (data as Pick<FlowRow, 'share_token'>).share_token;
}

export async function getFlowByShareToken(token: string): Promise<FlowRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('share_token', token)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw error;
  return data as FlowRow;
}
