import type { Edge, Node } from '@xyflow/react';

import type { FlowGraph } from '@/lib/analyzer';

import { isCloudMode } from './mode';

export type FlowData = {
  graph: FlowGraph;
  rfNodes: Node[];
  rfEdges: Edge[];
  analyzeConfig?: Record<string, unknown>;
};

export type FlowMeta = {
  id: string;
  name: string;
  updatedAt: string;
};

export interface FlowAdapter {
  create(name: string, data: FlowData): Promise<string>;
  save(id: string, data: FlowData, name?: string): Promise<void>;
  rename(id: string, name: string): Promise<{ updatedAt: string }>;
  load(id: string): Promise<FlowData | null>;
  list(): Promise<FlowMeta[]>;
  share(id: string): Promise<string>;
  delete(id: string): Promise<void>;
}

export const cloudFlowAdapter: FlowAdapter = {
  async create(name, data) {
    const res = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data }),
    });
    if (!res.ok) throw new Error('Failed to save flow');
    const json = await res.json();
    return json.id as string;
  },

  async save(id, data, name?) {
    const res = await fetch(`/api/flows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, ...(name !== undefined ? { name } : {}) }),
    });
    if (!res.ok) throw new Error('Failed to update flow');
  },

  async rename(id, name) {
    const res = await fetch(`/api/flows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error('Failed to rename flow');
    const json = await res.json();
    return { updatedAt: json.updated_at as string };
  },

  async load(id) {
    const res = await fetch(`/api/flows/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to load flow');
    const json = await res.json();
    return json.data as FlowData;
  },

  async list() {
    const res = await fetch('/api/flows');
    if (!res.ok) throw new Error('Failed to list flows');
    return res.json() as Promise<FlowMeta[]>;
  },

  async share(id) {
    const res = await fetch(`/api/flows/${id}/share`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create share link');
    const json = await res.json();
    return `${window.location.origin}/share/${json.token}`;
  },

  async delete(id) {
    const res = await fetch(`/api/flows/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('Failed to delete flow');
  },
};

export const flowAdapter: FlowAdapter | null = isCloudMode ? cloudFlowAdapter : null;
