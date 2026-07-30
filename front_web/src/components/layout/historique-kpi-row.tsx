'use client';

import { useMemo } from 'react';
import { KpiCard } from '@/components/ui/kpi-card';
import { ActivityIcon, WarningCircleIcon, TimerIcon, UsersIcon } from '@phosphor-icons/react';
import { useAppSelector } from '@/redux/store';

export function HistoriqueKpiRow() {
  const { items, total, loading } = useAppSelector(s => s.apiLogs);

  const stats = useMemo(() => {
    const errors   = items.filter(l => l.is_error || l.status_code >= 500).length;
    const avgMs    = items.length
      ? Math.round(items.reduce((s, l) => s + l.duration_ms, 0) / items.length)
      : 0;
    const users    = new Set(items.map(l => l.user_email).filter(Boolean)).size;
    return { errors, avgMs, users };
  }, [items]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Entrées chargées"
        value={loading ? '…' : String(total)}
        icon={<ActivityIcon size={18} weight="fill" />}
        accent="primary"
        trend="neutral"
        trendValue={`${items.length} sur la page`}
        showTopBar
      />
      <KpiCard
        label="Erreurs (page courante)"
        value={loading ? '…' : String(stats.errors)}
        icon={<WarningCircleIcon size={18} weight="fill" />}
        accent="warning"
        trend={stats.errors > 0 ? 'warning' : 'up'}
        trendValue={stats.errors > 0 ? `${stats.errors} à traiter` : 'Aucune erreur'}
        showTopBar
      />
      <KpiCard
        label="Durée moyenne"
        value={loading ? '…' : `${stats.avgMs} ms`}
        icon={<TimerIcon size={18} weight="fill" />}
        accent="success"
        trend="neutral"
        trendValue="sur la page courante"
        showTopBar
      />
      <KpiCard
        label="Utilisateurs distincts"
        value={loading ? '…' : String(stats.users)}
        icon={<UsersIcon size={18} weight="fill" />}
        accent="secondary"
        trend="neutral"
        trendValue="sur la page courante"
        showTopBar
      />
    </div>
  );
}
