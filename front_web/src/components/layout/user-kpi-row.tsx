import { UsersIcon, CrownIcon, BriefcaseIcon, ShieldCheckIcon, HourglassIcon } from '@phosphor-icons/react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import type { User } from '../../types/user_type';

interface UserKpiRowProps {
  users: User[];
}

export function UserKpiRow({ users }: UserKpiRowProps) {
  const active = users.filter(u => u.status === 'active');
  const pending = users.filter(u => u.status === 'pending');
  const admins = active.filter(u => u.role === 'DG' || u.role === 'DAF');
  const commercials = active.filter(u => u.role === 'Commercial');
  const lastActive = active[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
      <KpiCard
        label="Membres actifs"
        value={active.length}
        accent="primary"
        icon={<UsersIcon size={17} weight="fill" />}
        sparkline={
          <Badge color="success" variant="subtle" className="text-[10px] sm:text-xs border border-success-600" dot>
            <span className="hidden sm:inline">Tous connectés</span>
            <span className="sm:hidden">Connectés</span>
          </Badge>
        }
        layout="horizontal"
      />
      <KpiCard
        label="Administrateurs"
        value={admins.length}
        accent="secondary"
        showTopBar={false}
        icon={<CrownIcon size={17} weight="fill" />}
        sparkline={
          <p className="text-[10px] sm:text-xs text-foreground-3">
            <span className="hidden sm:inline">DG · DAF</span>
            <span className="sm:hidden">Dirigeants</span>
          </p>
        }
        layout="horizontal"
      />
      <KpiCard
        label="Commerciaux terrain"
        value={commercials.length}
        accent="primary"
        icon={<BriefcaseIcon size={17} weight="fill" />}
        sparkline={
          pending.length > 0 ? (
            <Badge color="warning" variant="subtle" className="text-[10px] sm:text-xs border border-warning-600">
              <HourglassIcon size={12} className="sm:hidden" />
              <HourglassIcon size={14} className="hidden sm:block" />
              <span className="ml-0.5">
                {pending.length} invitation{pending.length > 1 ? 's' : ''}
              </span>
            </Badge>
          ) : (
            <p className="text-[10px] sm:text-xs text-foreground-3">
              <span className="hidden sm:inline">Aucune invitation</span>
              <span className="sm:hidden">0 invitation</span>
            </p>
          )
        }
        layout="horizontal"
      />
      <KpiCard
        label="Dernière connexion"
        value="Aujourd'hui"
        styleValue="!text-lg sm:!text-xl font-mono text-primary-500"
        accent="primary"
        icon={<ShieldCheckIcon size={17} />}
        sparkline={
          lastActive?.lastLogin ? (
            <p className="text-[10px] sm:text-xs text-foreground-3 truncate">
              <span className="hidden sm:inline">{lastActive.prenom} · {lastActive.lastLogin.split(' · ')[1]}</span>
              <span className="sm:hidden">{lastActive.prenom}</span>
            </p>
          ) : (
            <p className="text-[10px] sm:text-xs text-foreground-3">—</p>
          )
        }
        layout="horizontal"
      />
    </div>
  );
}