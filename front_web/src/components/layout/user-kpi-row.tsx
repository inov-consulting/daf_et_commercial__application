import { Users, Crown, Briefcase, ShieldCheck } from '@phosphor-icons/react';
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
    <div className="grid grid-cols-4 gap-4 mb-5">
      <KpiCard
        label="Membres actifs"
        value={active.length}
        accent="primary"
        icon={<Users size={17} weight="fill" />}
        sparkline={<Badge color="success" variant="subtle" dot>Tous connectés</Badge>}
      />
      <KpiCard
        label="Administrateurs"
        value={admins.length}
        accent="secondary"
        icon={<Crown size={17} weight="fill" />}
        sparkline={<p className="text-xs text-foreground-3">DG · DAF</p>}
      />
      <KpiCard
        label="Commerciaux terrain"
        value={commercials.length}
        accent="primary"
        icon={<Briefcase size={17} weight="fill" />}
        sparkline={
          pending.length > 0
            ? <Badge color="warning" variant="subtle">{pending.length} invitation{pending.length > 1 ? 's' : ''}</Badge>
            : <p className="text-xs text-foreground-3">Aucune invitation</p>
        }
      />
      <KpiCard
        label="Dernière connexion"
        value="Aujourd'hui"
        styleValue="!text-xl font-mono text-primary-500"
        accent="primary"
        icon={<ShieldCheck size={17} />}
        sparkline={
          lastActive?.lastLogin
            ? <p className="text-xs text-foreground-3">{lastActive.prenom} · {lastActive.lastLogin.split(' · ')[1]}</p>
            : undefined
        }
      />
    </div>
  );
}
