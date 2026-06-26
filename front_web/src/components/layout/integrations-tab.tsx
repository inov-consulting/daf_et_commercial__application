"use client";

import { useState } from 'react';
import { IntegrationCard } from './integration-card';
import { WebhookBlock } from './webhook-block';
import { ApiKeysBlock } from './apiKeys-block';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: 'connected' | 'error' | 'pending' | 'disconnected';
  meta?: string;
  lastSync?: string;
}

// Données mockées des intégrations
const integrationsData: Integration[] = [
  { id: 'claude', name: 'Claude API (Anthropic)', description: 'Moteur IA des 4 agents — extraction, CR vocal, offres, synthèse DAF', category: 'IA', icon: '🤖', status: 'connected' as const, meta: 'sk-ant-••••••••••••A4K2', lastSync: 'il y a 2 minutes' },
  { id: 'twilio', name: 'Twilio SMS', description: 'Envoi de notifications SMS aux commerciaux et clients', category: 'Communication', icon: '📱', status: 'connected' as const, meta: 'AC••••••••••••7f3a', lastSync: 'il y a 14 minutes' },
  { id: 'gmail', name: 'Gmail / Google Workspace', description: 'Synchronisation des emails entrants pour extraction de contacts', category: 'Email', icon: '✉️', status: 'connected' as const, meta: 'portalis@portalis-group.sn', lastSync: 'il y a 5 minutes' },
  { id: 'wave', name: 'Wave (Orange Money)', description: 'Webhook expiré — token invalide', category: 'Paiement', icon: '💰', status: 'error' as const, meta: 'Dernière sync : il y a 3 jours', lastSync: 'il y a 3 jours' },
  { id: 'dropbox', name: 'Dropbox Business', description: 'Archivage automatique des CR vocaux et documents', category: 'Stockage', icon: '📦', status: 'connected' as const, meta: '/PortaLis/CRM/Archives', lastSync: 'il y a 1 heure' },
  { id: 'zapier', name: 'Zapier', description: 'Connexion à +5 000 apps via des workflows personnalisés', category: 'Automatisation', icon: '⚡', status: 'disconnected' },
  { id: 'sage', name: 'Sage Comptabilité', description: 'Synchronisation des factures et créances avec le plan comptable', category: 'Comptabilité', icon: '📊', status: 'pending' as const, meta: 'Configuration en cours' },
  { id: 'whatsapp', name: 'WhatsApp Business API', description: 'Réception de cartes de visite et messages clients via WhatsApp', category: 'Communication', icon: '💬', status: 'disconnected' as const },
];

interface IntegrationsTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function IntegrationsTab({ showToast }: IntegrationsTabProps) {
  const [integrations, setIntegrations] = useState<Integration[]>(integrationsData);
  const [filter, setFilter] = useState('all');

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'connected').length,
    error: integrations.filter(i => i.status === 'error').length,
  };

  const filteredIntegrations = integrations.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'connected') return item.status === 'connected';
    if (filter === 'error') return item.status === 'error';
    if (filter === 'available') return item.status === 'disconnected' || item.status === 'pending';
    return true;
  });

  const handleStatusChange = (id: string, status: 'connected' | 'error' | 'pending' | 'disconnected') => {
    setIntegrations(prev => prev.map(item => 
      item.id === id ? { ...item, status } : item
    ));
  };

  return (
    <div>
      {/* Stats + Bouton */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-5">
        <div className="font-inter text-[11px] sm:text-[13px] text-[#435869] flex-1">
          <strong className="text-[#1B2633]">{stats.total}</strong> intégrations disponibles · 
          <strong className="text-[#1B2633]"> {stats.connected}</strong> connectées · 
          <strong className="text-[#1B2633]"> {stats.error}</strong> en erreur
        </div>
        <button 
          onClick={() => showToast('Ajouter une intégration', 'info')}
          className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-primary border-none text-white font-inter text-[12px] sm:text-[13px] font-medium hover:bg-[#003d23] transition-colors w-full sm:w-auto"
        >
          <span>+</span> Nouvelle intégration
        </button>
      </div>

      {/* Error Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-3 sm:px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-4 sm:mb-5">
        <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">⚠</span>
          <div className="min-w-0">
            <div className="font-inter text-[12px] sm:text-[13px] font-medium text-[#EF4444]">
              Intégration Wave en erreur
            </div>
            <div className="font-inter text-[10px] sm:text-xs font-normal text-[#b91c1c] mt-px">
              Le webhook Orange Money a expiré. Les paiements ne sont plus synchronisés.
            </div>
          </div>
        </div>
        <button 
          onClick={() => showToast('Réparation Wave…', 'warning')}
          className="h-[30px] px-[14px] rounded-md bg-[#EF4444] border-none text-white font-inter text-[11px] sm:text-xs font-medium hover:bg-[#DC2626] transition-colors w-full sm:w-auto flex-shrink-0"
        >
          Réparer
        </button>
      </div>

      {/* Filters avec scroll horizontal */}
      <div className="overflow-x-auto -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 mb-4">
        <div className="flex gap-1 min-w-max">
          {[
            { id: 'all', label: `Toutes (${stats.total})` },
            { id: 'connected', label: 'Connectées' },
            { id: 'error', label: 'En erreur' },
            { id: 'available', label: 'Disponibles' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                h-[30px] px-3 sm:px-[14px] rounded-md border font-inter text-[11px] sm:text-xs font-medium
                transition-all duration-150 whitespace-nowrap
                ${filter === tab.id 
                  ? 'bg-[#E8F7F0] border-primary text-[#003d23]' 
                  : 'bg-white border-[#DDE5EF] text-[#435869] hover:bg-[#F7F9FC]'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 sm:gap-2.5 mb-4 sm:mb-5">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            {...integration}
            onStatusChange={(status) => handleStatusChange(integration.id, status)}
            showToast={showToast}
          />
        ))}
      </div>

      {/* Webhook & API Keys */}
      <div className="space-y-4 sm:space-y-5">
        <WebhookBlock showToast={showToast} />
        <ApiKeysBlock showToast={showToast} />
      </div>
    </div>
  );
}