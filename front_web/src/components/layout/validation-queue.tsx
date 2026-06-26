'use client';

import { useState } from 'react';
import { TabBar } from './tab-bar';
import { QueueItem } from './queue-item';
import { EmptyState } from './empty-state';
import { LoadMore } from './load-more';
import { QueueItem as QueueItemType, TabType } from '@/types/centre_ia_type';

// Données mockées des items
const ITEMS: QueueItemType[] = [
  {
    id: 'QI-001',
    stripe: 'stripe-vocal',
    avBg: '#bf9938',
    icon: '♪',
    agent: 'Agent CR Vocal',
    model: 'Claude Sonnet 4.5',
    modelCls: 'mc-gold',
    time: 'Généré il y a 3min',
    title: 'CR Visite — Diallo BTP SARL',
    preview: 'Visite effectuée le 3 juin 2026 à 14h30. Client intéressé par un contrat annuel de transport de matériaux. Budget estimé: 45 000 000 FCFA/an. Prochaine étape: envoi offre commerciale personnalisée avant le 10 juin 2026.',
    chips: [
      { l: 'Extraction IA', c: 'b-amber' },
      { l: 'Offre suggérée', c: 'b-green' }
    ],
    conf: null
  },
  {
    id: 'QI-002',
    stripe: 'stripe-extract',
    avBg: '#007649',
    icon: '◎',
    agent: 'Agent Extraction',
    model: 'Claude Haiku 4.5',
    modelCls: 'mc-green',
    time: 'Généré il y a 8min',
    title: 'Contact extrait — Amadou Traoré · Fatoumata Négoce',
    preview: 'Directeur Transport · Fatoumata Négoce SARL · +225 07 12 34 56 · amadou@fatnegoce.ci · Abidjan, Plateau · Source: email entrant 03/06/2026 — à valider avant import CRM.',
    chips: [
      { l: 'Nouveau contact', c: 'b-ok' },
      { l: 'Confiance 84%', c: 'b-amber' }
    ],
    conf: { pct: 84, msg: 'Confiance IA: 84% — Vérifier le numéro de téléphone' }
  },
  {
    id: 'QI-003',
    stripe: 'stripe-offres',
    avBg: '#005033',
    icon: '≡',
    agent: 'Agent Offres',
    model: 'Claude Haiku 4.5',
    modelCls: 'mc-green',
    time: 'Généré il y a 15min',
    title: 'Offre #OFF-2026-0041 · Trans-Bamako SARL',
    preview: 'Proposition commerciale générée: 12 500 000 FCFA · Validité 30 jours · 3 lignes transport Bamako–Dakar · Conditions: paiement 60 jours fin de mois · Assurance marchandises incluse.',
    chips: [
      { l: 'Offre générée', c: 'b-green' },
      { l: 'À valider R-05', c: 'b-amber' }
    ],
    conf: null
  }
];

interface ValidationQueueProps {
  pendingCount: number;
  onValidate: (id: string, title: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function ValidationQueue({ 
  pendingCount, 
  onValidate, 
  onReject, 
  onEdit,
  showToast 
}: ValidationQueueProps) {
  const [currentTab, setCurrentTab] = useState<TabType>('pending');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleItems = ITEMS.filter(it => !dismissed.has(it.id));

  const handleValidate = (id: string, title: string) => {
    setDismissed(prev => new Set([...prev, id]));
    onValidate(id, title);
  };

  const handleReject = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    onReject(id);
  };

  const handleEdit = (id: string) => {
    onEdit(id);
  };

  const renderContent = () => {
    if (currentTab !== 'pending') {
      if (currentTab === 'done') {
        return (
          <EmptyState 
            icon="✓" 
            iconColor="#10B981"
            title="23 items traités aujourd'hui"
            subtitle="Dernière activité il y a 4 minutes"
          />
        );
      }
      return (
        <EmptyState 
          icon="✕" 
          iconColor="#EF4444"
          title="2 items rejetés"
          subtitle="CR Vocal · Agent Extraction"
        />
      );
    }

    if (visibleItems.length === 0) {
      return (
        <EmptyState 
          icon="✓" 
          iconColor="#10B981"
          title="File d'attente vide"
          subtitle="Tous les items affichés ont été traités"
        />
      );
    }

    return (
      <>
        {visibleItems.map((item) => (
          <QueueItem
            key={item.id}
            item={item}
            onValidate={handleValidate}
            onReject={handleReject}
            onEdit={handleEdit}
          />
        ))}
        <LoadMore onLoad={() => showToast('Chargement de 4 items supplémentaires…', 'info')} />
      </>
    );
  };

  return (
    <div>
      <TabBar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        pendingCount={pendingCount}
      />
      <div className="flex flex-col gap-3 mt-3">
        {renderContent()}
      </div>
    </div>
  );
}