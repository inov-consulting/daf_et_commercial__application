'use client';

import { AgentCard } from './agent-card-ia';
import { PanelFooter } from './panel-footer';
import { AgentStatus as AgentStatusType } from '@/types/centre_ia_type';

const agents: AgentStatusType[] = [
  {
    id: 'extraction',
    name: 'Agent Extraction',
    icon: '◎',
    color: '#007649',
    model: 'Claude Haiku 4.5',
    status: 'active',
    processed: 14,
    latency: 3.2,
    queue: 2,
  },
  {
    id: 'vocal',
    name: 'Agent CR Vocal',
    icon: '♪',
    color: '#BF9938',
    model: 'Claude Sonnet 4.5',
    status: 'active',
    processed: 8,
    latency: 6.1,
    queue: 3,
  },
  {
    id: 'offres',
    name: 'Agent Offres',
    icon: '≡',
    color: '#005033',
    model: 'Claude Haiku 4.5',
    status: 'processing',
    processed: 5,
    latency: 8.7,
    queue: 2,
  },
  {
    id: 'daf',
    name: 'Agent Synthèse DAF',
    icon: '▦',
    color: '#5A738A',
    model: 'Claude Sonnet 4.5',
    status: 'idle',
    processed: 1,
    latency: 12.4,
    queue: 0,
    note: 'Synthèse programmée 18h00',
  },
];

interface AgentsStatusProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function AgentsStatus({ showToast }: AgentsStatusProps) {
  return (
    <div className="bg-white rounded-xl border border-neutral-400 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="h-11 border-b border-[#EEF2F7] px-4 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-sm text-white">◉</span>
        </div>
        <span className="font-space-grotesk text-sm font-semibold text-[#1B2633]">Statut Agents IA</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 h-5 px-2 bg-primary-100 border border-primary-300 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          <span className="font-inter text-[10px] font-semibold text-primary">Live</span>
        </div>
      </div>

      {/* Agent Cards */}
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}

      <PanelFooter onConfig={() => showToast('Navigation vers W-13 Paramètres IA', 'info')} />
    </div>
  );
}