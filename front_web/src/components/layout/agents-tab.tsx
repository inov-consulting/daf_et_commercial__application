'use client';

import { useState } from 'react';
import { AgentCard } from './agent-card';
import { InfoBanner } from './info-banner';
import { AiModelsSection } from './ai-models-section';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  activeSince: string;
  isActive: boolean;
  model: string;
  modelOptions: string[];
  latencyThreshold: number;
  triggerMode: 'auto' | 'manual';
  retryCount?: number;
  showWarning?: boolean;
  warningTitle?: string;
  warningBadge?: string;
  warningSub?: string;
  template?: string;
  templateOptions?: string[];
  currency?: string;
  currencyOptions?: string[];
  vat?: string;
  vatOptions?: string[];
  time?: string;
  recipients?: { name: string; email: string; selected: boolean }[];
  dataSources?: string[];
}

// Données mockées des agents
const agentsData: Agent[] = [
  {
    id: 'extraction',
    name: 'Agent Extraction',
    description: 'Recommandé pour extraction rapide (≤5s)',
    icon: '◎',
    color: '#1B6B45',
    activeSince: '14 jours',
    isActive: true,
    model: 'Claude Haiku 4.5',
    modelOptions: ['Claude Haiku 4.5', 'Claude Sonnet 4.5', 'Claude Haiku 4.5 (legacy)'],
    latencyThreshold: 5,
    triggerMode: 'auto' as 'auto' | 'manual',
    retryCount: 3,
  },
  {
    id: 'vocal',
    name: 'Agent CR Vocal',
    description: 'Recommandé pour rédaction CR (≤8s)',
    icon: '♪',
    color: '#8B6914',
    activeSince: '14 jours',
    isActive: true,
    model: 'Claude Sonnet 4.5',
    modelOptions: ['Claude Haiku 4.5', 'Claude Sonnet 4.5'],
    latencyThreshold: 8,
    triggerMode: 'auto' as 'auto' | 'manual',
    showWarning: true,
    warningTitle: 'Envoi automatique sans validation',
    warningBadge: 'DÉSACTIVÉ',
    warningSub: 'Validation humaine requise — L\'envoi automatique contourne la règle 70/30.',
  },
  {
    id: 'offres',
    name: 'Agent Offres',
    description: 'Recommandé pour génération d\'offres (≤10s)',
    icon: '≡',
    color: '#1B6B45',
    activeSince: '14 jours',
    isActive: true,
    model: 'Claude Haiku 4.5',
    modelOptions: ['Claude Haiku 4.5', 'Claude Sonnet 4.5'],
    latencyThreshold: 10,
    triggerMode: 'auto' as 'auto' | 'manual',
    template: 'Standard BTP — Sénégal',
    templateOptions: ['Standard BTP — Sénégal', 'Transport longue distance', 'Négoce & Distribution'],
    currency: 'FCFA',
    currencyOptions: ['FCFA', 'EUR', 'USD'],
    vat: 'Sénégal 18%',
    vatOptions: ['Sénégal 18%', 'Côte d\'Ivoire 18%', 'Exonéré'],
  },
  {
    id: 'daf',
    name: 'Agent Synthèse DAF',
    description: 'Recommandé pour synthèse financière (≤15s)',
    icon: '▦',
    color: '#435869',
    activeSince: '14 jours',
    isActive: true,
    model: 'Claude Sonnet 4.5',
    modelOptions: ['Claude Haiku 4.5', 'Claude Sonnet 4.5'],
    latencyThreshold: 15,
    triggerMode: 'auto' as 'auto' | 'manual',
    time: '18:00',
    recipients: [
      { name: 'DG — Hawa Konaté', email: 'h.konate@portalis-group.sn', selected: true },
      { name: 'DAF — Fatou Camara', email: 'f.camara@portalis-group.sn', selected: true },
      { name: 'Commercial terrain', email: '', selected: false },
    ],
    dataSources: ['Pipeline', 'Créances', 'Factures', 'Missions'],
  },
];

interface AgentsTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function AgentsTab({ showToast }: AgentsTabProps) {
  const [agents, setAgents] = useState(agentsData);

  const handleToggle = (id: string, active: boolean) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, isActive: active } : agent
    ));
  };

  const handleModelChange = (id: string, model: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, model } : agent
    ));
  };

  const handleThresholdChange = (id: string, threshold: number) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, latencyThreshold: threshold } : agent
    ));
  };

  const handleTriggerChange = (id: string, mode: 'auto' | 'manual') => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, triggerMode: mode } : agent
    ));
  };

  const handleRetryChange = (id: string, count: number) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, retryCount: count } : agent
    ));
  };

  return (
    <div>
      <InfoBanner showToast={showToast} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            name={agent.name}
            description={agent.description}
            icon={agent.icon}
            color={agent.color}
            activeSince={agent.activeSince}
            isActive={agent.isActive}
            model={agent.model}
            modelOptions={agent.modelOptions}
            latencyThreshold={agent.latencyThreshold}
            triggerMode={agent.triggerMode}
            retryCount={agent.retryCount}
            template={agent.template}
            templateOptions={agent.templateOptions}
            currency={agent.currency}
            currencyOptions={agent.currencyOptions}
            vat={agent.vat}
            vatOptions={agent.vatOptions}
            time={agent.time}
            recipients={agent.recipients}
            dataSources={agent.dataSources}
            showWarning={agent.showWarning}
            warningTitle={agent.warningTitle}
            warningSub={agent.warningSub}
            warningBadge={agent.warningBadge}
            onToggle={(active) => handleToggle(agent.id, active)}
            onModelChange={(model) => handleModelChange(agent.id, model)}
            onThresholdChange={(threshold) => handleThresholdChange(agent.id, threshold)}
            onTriggerChange={(mode) => handleTriggerChange(agent.id, mode)}
            onRetryChange={(count) => handleRetryChange(agent.id, count)}
          />
        ))}
      </div>

      <AiModelsSection showToast={showToast} />
    </div>
  );
}