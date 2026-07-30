import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge, BadgeColor } from './badge';
import { AvatarStack } from './avatar';
import { Progress } from './progress';

export type ProjectStatus = 'active' | 'done' | 'blocked' | 'pending';

export interface ProjectCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  client?: string;
  status?: ProjectStatus;
  progress?: number;
  deadline?: string;
  avatars?: ReactNode;
  id?: string;
}

const statusConfig: Record<ProjectStatus, { color: BadgeColor; label: string; progressColor: 'primary' | 'success' | 'warning' | 'error' }> = {
  active: { color: 'primary', label: 'En cours', progressColor: 'primary' },
  done: { color: 'success', label: 'Terminé', progressColor: 'success' },
  blocked: { color: 'error', label: 'Bloqué', progressColor: 'error' },
  pending: { color: 'warning', label: 'En attente', progressColor: 'warning' },
};

export function ProjectCard({
  name,
  client,
  status = 'active',
  progress,
  deadline,
  avatars,
  id,
  className,
  ...props
}: ProjectCardProps) {
  const cfg = statusConfig[status];

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-2xl p-[1.25rem_1.5rem] shadow-xs',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-display text-base font-semibold text-foreground mb-[.2rem]">{name}</p>
          {client && <p className="text-xs text-foreground-3">{client}</p>}
        </div>
        <Badge color={cfg.color} variant="subtle" dot>
          {cfg.label}
        </Badge>
      </div>

      {progress !== undefined && (
        <Progress
          value={progress}
          color={cfg.progressColor}
          showValue
          label="Avancement global"
          shimmer={status === 'active'}
          className="mb-3"
        />
      )}

      {(avatars || deadline) && (
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
          {avatars && <AvatarStack>{avatars}</AvatarStack>}
          {deadline && (
            <div className="text-right ml-auto">
              <p className="text-xs text-foreground-3">Échéance</p>
              <p className="font-mono text-xs text-foreground font-medium">{deadline}</p>
            </div>
          )}
        </div>
      )}

      {id && (
        <p className="font-mono text-[.6875rem] text-foreground-3 mt-2">{id}</p>
      )}
    </div>
  );
}
