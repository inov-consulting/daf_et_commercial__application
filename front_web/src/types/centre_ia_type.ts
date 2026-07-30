export interface QueueItem {
  id: string;
  stripe: 'stripe-vocal' | 'stripe-extract' | 'stripe-offres';
  avBg: string;
  icon: string;
  agent: string;
  model: string;
  modelCls: 'mc-green' | 'mc-gold';
  time: string;
  title: string;
  preview: string;
  chips: Array<{ l: string; c: 'b-amber' | 'b-green' | 'b-ok' | 'b-green-mid' | 'b-slate' }>;
  conf: { pct: number; msg: string } | null;
}

export interface AgentStatus {
  id: string;
  name: string;
  icon: string;
  color: string;
  model: string;
  status: 'active' | 'processing' | 'idle';
  processed: number;
  latency: number;
  queue: number;
  note?: string;
}

export type TabType = 'pending' | 'done' | 'rejected';