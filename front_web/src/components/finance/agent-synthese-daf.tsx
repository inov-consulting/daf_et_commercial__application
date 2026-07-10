'use client';

import { useState } from 'react';
import { CheckIcon, PencilSimpleIcon, XIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AgentSyntheseItem, AgentActif } from '@/types/finance_type';

function ModelBadge({ model }: { model: 'sonnet' | 'haiku' }) {
  return (
    <span className={cn(
      'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0',
      model === 'sonnet' ? 'bg-[var(--a100)] text-[var(--a600)]' : 'bg-[var(--p100)] text-[var(--p600)]',
    )}>
      {model === 'sonnet' ? 'Claude Sonnet' : 'Claude Haiku'}
    </span>
  );
}

interface Props {
  label:       string;
  rule?:       string;
  items:       AgentSyntheseItem[];
  agents:      AgentActif[];
  taskCount:   number;
  validCount:  number;
}

export function AgentSyntheseDaf({ label, rule, items: initItems, agents, taskCount, validCount }: Props) {
  const [items, setItems] = useState(initItems);

  function dismiss(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--bd-def)] shadow-[var(--sh-xs)] mb-4 sm:mb-6 overflow-hidden">
      <div className="h-[3px]" style={{ background: 'var(--grad)' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--bd-def)] bg-[rgba(27,107,69,.04)]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--grad)' }}>
            <span className="text-white text-lg leading-none">✦</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--tx-1)]">{label}</p>
            {rule && <p className="text-[11px] text-[var(--tx-3)] hidden sm:block">{rule}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white px-2.5 py-1 rounded-full" style={{ background: 'var(--grad)' }}>
            <span className="text-[10px] leading-none">✦</span> {items.length}
          </span>
          <button className="text-xs font-medium text-[var(--p500)] hover:underline hidden sm:flex items-center gap-1">
            Voir tout <ArrowRightIcon size={12} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-[var(--bd-def)]">

        {/* Validation items */}
        <div className="bg-[var(--bg-sink)]">
          <p className="px-4 sm:px-5 pt-3 pb-2 text-[9px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase">
            En attente de votre validation
          </p>
          <div className="divide-y divide-[var(--bd-def)] border-t border-[var(--bd-def)] bg-white">
            {items.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-3.5">
                <div className="flex items-center justify-between sm:block sm:flex-shrink-0 sm:w-[120px]">
                  <ModelBadge model={item.model} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold text-[var(--tx-3)] uppercase tracking-wide mb-0.5">{item.type}</p>
                  <p className="text-xs sm:text-sm font-semibold text-[var(--tx-1)] mb-0.5">{item.title}</p>
                  <p className="text-[11px] text-[var(--tx-2)] line-clamp-2 mb-1">{item.desc}</p>
                  <p className="text-[9px] text-[var(--tx-3)] truncate">{item.meta}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-auto sm:ml-0">
                  <Button variant="success" size="xs"><CheckIcon size={12} weight="bold" /><span className="hidden sm:inline ml-1">Valider</span></Button>
                  <Button variant="ghost"   size="xs"><PencilSimpleIcon size={12} /><span className="hidden sm:inline ml-1">Modifier</span></Button>
                  <Button variant="ghost"   size="xs" iconOnly onClick={() => dismiss(item.id)}><XIcon size={12} /></Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="px-5 py-4 text-[12px] text-[var(--tx-3)]">Aucun élément en attente.</p>
            )}
          </div>
        </div>

        {/* Agents actifs */}
        <div className="p-4 sm:p-5 bg-[var(--bg-sink)]">
          <p className="text-[9px] font-semibold tracking-[.08em] text-[var(--tx-3)] uppercase mb-2 sm:mb-3">Agents actifs</p>
          <div className="flex flex-col gap-2 mb-3">
            {agents.map(agent => (
              <div key={agent.id} className="p-2.5 rounded-xl bg-white border border-[var(--bd-def)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', agent.running ? 'bg-[var(--p500)] animate-pulse' : 'bg-[var(--ok500)]')} />
                  <p className="text-xs font-semibold text-[var(--tx-1)] flex-1 truncate">{agent.name}</p>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 flex-shrink-0">{agent.model}</span>
                </div>
                <p className={cn('text-[11px] mb-1.5', agent.running ? 'text-[var(--tx-3)]' : 'text-success')}>
                  {agent.desc}
                </p>
                {agent.progress !== null && (
                  <div className="flex items-center gap-2">
                    <Progress value={agent.progress} size="sm" className="flex-1" />
                    <span className="text-[9px] text-[var(--tx-3)] whitespace-nowrap">{agent.timeLeft}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl text-primary-700">{taskCount}</p>
              <p className="text-[9px] text-[var(--tx-3)]">Tâches IA aujourd&apos;hui</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-[var(--bd-def)]">
              <p className="font-display font-bold text-xl text-success">{validCount}</p>
              <p className="text-[9px] text-[var(--tx-3)]">Validées par équipe</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
