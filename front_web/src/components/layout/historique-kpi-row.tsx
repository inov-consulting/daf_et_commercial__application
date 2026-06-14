'use client';

import { KpiCard } from '@/components/ui/kpi-card';
import {
  ActivityIcon,
  WarningCircleIcon,
  CubeIcon,
  UsersIcon,
} from '@phosphor-icons/react';

export function HistoriqueKpiRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Actions aujourd'hui"
        value="147"
        icon={<ActivityIcon size={18} weight="fill" />}
        accent="primary"
        trend="up"
        trendValue="+23 vs hier"
        showTopBar
      />
      <KpiCard
        label="Erreurs — 2 en attente"
        value="3"
        icon={<WarningCircleIcon size={18} weight="fill" />}
        accent="warning"
        trend="warning"
        trendValue="2 en attente"
        showTopBar
      />
      <KpiCard
        label="Modules actifs"
        value="8/8"
        icon={<CubeIcon size={18} weight="fill" />}
        accent="success"
        trend="up"
        trendValue="tous opérationnels"
        showTopBar
      />
      <KpiCard
        label="Utilisateurs actifs"
        value="12"
        icon={<UsersIcon size={18} weight="fill" />}
        accent="secondary"
        trend="neutral"
        trendValue="< 30 min"
        showTopBar
      />
    </div>
  );
}
