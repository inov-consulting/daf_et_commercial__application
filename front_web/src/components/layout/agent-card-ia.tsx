'use client';

import { AgentStatus } from '@/types/centre_ia_type';

interface AgentCardProps {
  agent: AgentStatus;
}

export function AgentCard({ agent }: AgentCardProps) {
  const statusConfig = {
    active: {
      label: 'Actif',
      pillClass: 'bg-primary-100 text-primary border-primary-300',
      dotClass: 'bg-primary-400',
      dot: <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
    },
    processing: {
      label: 'Traitement',
      pillClass: 'bg-secondary-100 text-secondary border-secondary-400',
      dotClass: '',
      dot: <span className="inline-block rotate-45 text-[10px] text-secondary">◌</span>
    },
    idle: {
      label: 'Inactif',
      pillClass: 'bg-neutral-100 text-neutral border-neutral-400',
      dotClass: 'bg-neutral',
      dot: <div className="w-1.5 h-1.5 rounded-full bg-neutral" />
    },
  };

  const config = statusConfig[agent.status];
  const latencyColor = agent.latency < 5 ? '#059669' : agent.latency < 10 ? '#D97706' : '#EF4444';

  return (
    <div className={`px-4 py-[14px] ${agent.id !== 'daf' ? 'border-b border-[#EEF2F7]' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: agent.color }}
        >
          <span className="text-sm text-white">{agent.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-inter text-[13px] font-semibold text-[#1B2633]">{agent.name}</div>
          <div className="font-jetbrains-mono text-[10px] text-[#7691A8] mt-px">{agent.model}</div>
        </div>
        <div className={`
          flex items-center gap-1 h-[22px] px-2 rounded-full border
          font-inter text-[10px] font-semibold whitespace-nowrap
          ${config.pillClass}
        `}>
          {config.dot}
          {config.label}
        </div>
      </div>

      <div className="flex gap-3.5 flex-wrap">
        <div className="flex items-baseline gap-0.5">
          <span className="font-inter text-[11px] text-neutral">Traités ·</span>
          <span className="font-inter text-[11px] font-semibold text-[#435869]">&nbsp;{agent.processed}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="font-inter text-[11px] text-neutral">Latence ·</span>
          <span className="font-jetbrains-mono text-[11px] font-medium" style={{ color: latencyColor }}>
            &nbsp;{agent.latency}s
          </span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="font-inter text-[11px] text-neutral">En file ·</span>
          <span className={`font-inter text-[11px] font-semibold ${agent.queue > 0 ? 'text-primary' : 'text-[#435869]'}`}>
            &nbsp;{agent.queue}
          </span>
        </div>
      </div>

      {agent.note && (
        <div className="font-inter text-[10px] text-neutral italic mt-1.5">{agent.note}</div>
      )}
    </div>
  );
}