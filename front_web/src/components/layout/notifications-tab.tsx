'use client';

import { useState } from 'react';
import { NotificationHeader } from './notification-header';
import { NotificationTable } from './notification-table';

// Données mockées des notifications
const notificationsData = {
  agents: [
    { id: '1', event: 'Extraction terminée', description: 'Nouvelle carte de visite extraite et contact créé', channels: { email: true, push: true, sms: false, inApp: true } },
    { id: '2', event: 'Échec d\'extraction', description: 'L\'agent n\'a pas pu traiter la photo reçue', channels: { email: true, push: true, sms: true, inApp: true } },
    { id: '3', event: 'CR vocal prêt', description: 'Compte-rendu rédigé, en attente de validation 70/30', channels: { email: true, push: true, sms: false, inApp: true } },
    { id: '4', event: 'Alerte latence dépassée', description: 'Un agent dépasse le seuil configuré', channels: { email: true, push: false, sms: false, inApp: true } },
    { id: '5', event: 'Synthèse DAF envoyée', description: 'Rapport quotidien 07:00 transmis aux destinataires', channels: { email: true, push: false, sms: false, inApp: true } },
  ],
  pipeline: [
    { id: '6', event: 'Nouvelle opportunité', description: 'Un contact est qualifié et entre dans le pipeline', channels: { email: true, push: true, sms: false, inApp: true } },
    { id: '7', event: 'Affaire gagnée 🎉', description: 'Opportunité marquée comme conclue', channels: { email: true, push: true, sms: true, inApp: true } },
    { id: '8', event: 'Affaire perdue', description: 'Opportunité marquée comme perdue', channels: { email: true, push: false, sms: false, inApp: true } },
  ],
  billing: [
    { id: '9', event: 'Échéance proche', description: 'Facture à régler dans les 7 prochains jours', channels: { email: true, push: true, sms: true, inApp: true } },
    { id: '10', event: 'Paiement reçu', description: 'Règlement enregistré sur une facture', channels: { email: true, push: true, sms: false, inApp: true } },
  ],
};

interface NotificationsTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function NotificationsTab({ showToast }: NotificationsTabProps) {
  const [data, setData] = useState(notificationsData);

  const handleToggle = (category: string, id: string, channel: string) => {
    setData(prev => ({
      ...prev,
      [category]: prev[category as keyof typeof prev].map(item => 
        item.id === id 
          ? { ...item, channels: { ...item.channels, [channel]: !item.channels[channel as keyof typeof item.channels] } }
          : item
      )
    }));
  };

  return (
    <div>
      <NotificationHeader showToast={showToast} />
      
      <NotificationTable 
        title="Agents IA"
        items={data.agents}
        category="agents"
        onToggle={handleToggle}
      />
      
      <NotificationTable 
        title="Pipeline & Opportunités"
        items={data.pipeline}
        category="pipeline"
        onToggle={handleToggle}
      />
      
      <NotificationTable 
        title="Créances & Facturation"
        items={data.billing}
        category="billing"
        onToggle={handleToggle}
      />
    </div>
  );
}