'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  ArrowsClockwiseIcon, CheckCircleIcon, ArrowUpIcon, ArrowDownIcon,
  WifiHighIcon, CpuIcon, HardDriveIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchMonitoringStats,
  fetchAiUsage,
  fetchAiBalance,
  type MonitoringStatus,
  type ProviderBalance,
} from '@/redux/features/monitoring/monitoringSlice';

// ── WebSocket types ────────────────────────────────────────────────────────

type WsConnStatus = 'connecting' | 'connected' | 'reconnecting';

interface WsSnapshot {
  timestamp: string;
  status: 'ok' | 'warning' | 'critical';
  cpu: { percent: number; count: number; status: 'ok' | 'warning' | 'critical' };
  memory: { total_mb: number; used_mb: number; available_mb: number; percent: number; status: 'ok' | 'warning' | 'critical' };
  network: { send_rate_kbps: number; recv_rate_kbps: number; bytes_sent_total: number; bytes_recv_total: number; status: 'ok' | 'warning' | 'critical' };
}

function normalizeStatus(s: string): MonitoringStatus {
  if (s === 'warning') return 'warn';
  if (s === 'critical') return 'crit';
  return 'ok';
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} Go`;
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} Mo`;
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(1)} Ko`;
  return `${bytes} o`;
}

function fmtUsd(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
}

function fmtNumber(v: number): string {
  return v.toLocaleString('fr-FR');
}

function fmtTimestamp(ts: string | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

function fmtDate(ts: string | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ level, label }: { level: MonitoringStatus; label: string }) {
  return (
    <span className={cn(
      'text-[10px] font-bold px-2 py-0.5 rounded-lg',
      level === 'ok'   && 'text-emerald-700 bg-emerald-50',
      level === 'warn' && 'text-amber-700 bg-amber-50',
      level === 'crit' && 'text-red-700 bg-red-50',
    )}>
      {label}
    </span>
  );
}

function MetricBar({ pct, level }: { pct: number; level: MonitoringStatus }) {
  return (
    <div className="h-1.5 rounded-full bg-[var(--bg-sink)] overflow-hidden my-3.5">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700',
          level === 'ok'   && 'bg-primary',
          level === 'warn' && 'bg-amber-500',
          level === 'crit' && 'bg-red-500',
        )}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[var(--bg-sink)]', className)} />;
}

const PROVIDER_META: Record<string, { abbr: string; color: string; label: string }> = {
  anthropic: { abbr: 'A', color: '#0F1117', label: 'Anthropic' },
  openai:    { abbr: 'O', color: '#10A37F', label: 'OpenAI'    },
  deepseek:  { abbr: 'D', color: '#6C4CE0', label: 'DeepSeek'  },
};

function ProviderBalanceBadge({ balance }: { balance: ProviderBalance | undefined }) {
  if (!balance) return <span className="text-[11px] text-[var(--tx-3)]">—</span>;
  if (!balance.available) {
    return (
      <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)]">
        Suivi local
      </span>
    );
  }
  const info = balance.balance_infos?.[0];
  if (!info) return <span className="text-[11px] text-[var(--tx-3)]">{balance.message}</span>;
  return (
    <div className="text-right">
      <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200 tabular-nums">
        {parseFloat(info.total_balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {info.currency}
      </span>
      {info.granted_balance && parseFloat(info.granted_balance) > 0 && (
        <p className="text-[10px] text-[var(--tx-3)] mt-0.5 tabular-nums">
          dont {parseFloat(info.granted_balance).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} offerts
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const dispatch    = useAppDispatch();
  const stats       = useAppSelector(s => s.monitoring.stats);
  const statsLoading    = useAppSelector(s => s.monitoring.statsLoading);
  const aiUsage         = useAppSelector(s => s.monitoring.aiUsage);
  const aiUsageLoading  = useAppSelector(s => s.monitoring.aiUsageLoading);
  const aiBalance       = useAppSelector(s => s.monitoring.aiBalance);
  const aiBalanceLoading = useAppSelector(s => s.monitoring.aiBalanceLoading);

  const [spinning, setSpinning] = useState(false);
  const [usageDays, setUsageDays] = useState(30);

  /* ── WebSocket live stream ── */
  const [wsSnapshot, setWsSnapshot] = useState<WsSnapshot | null>(null);
  const [wsConnStatus, setWsConnStatus] = useState<WsConnStatus>('connecting');
  const destroyedRef  = useRef(false);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWsRef   = useRef<WebSocket | null>(null);

  useEffect(() => {
    const base    = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const wsBase  = base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    const wsUrl   = `${wsBase}/api/v1/monitoring/stream`;
    destroyedRef.current = false;

    function connect() {
      if (destroyedRef.current) return;
      let token = '';
      try {
        const kc = (require('@/lib/keycloak') as typeof import('@/lib/keycloak')).getKeycloakInstance();
        token = kc?.token ?? '';
      } catch { /* keycloak indisponible */ }

      setWsConnStatus('connecting');
      const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
      const ws  = new WebSocket(url);
      activeWsRef.current = ws;

      ws.onopen = () => {
        if (!destroyedRef.current) setWsConnStatus('connected');
      };

      ws.onmessage = (e) => {
        if (destroyedRef.current) return;
        try { setWsSnapshot(JSON.parse(e.data) as WsSnapshot); } catch { /* payload invalide */ }
      };

      ws.onclose = () => {
        if (destroyedRef.current) return;
        setWsConnStatus('reconnecting');
        reconnectRef.current = setTimeout(connect, 3_000);
      };

      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      destroyedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      activeWsRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Données affichées : WS en temps réel → REST en fallback */
  const displayStats = wsSnapshot
    ? {
        timestamp: wsSnapshot.timestamp,
        cpu:     { ...wsSnapshot.cpu,     status: normalizeStatus(wsSnapshot.cpu.status)     },
        memory:  { ...wsSnapshot.memory,  status: normalizeStatus(wsSnapshot.memory.status)  },
        network: { ...wsSnapshot.network, status: normalizeStatus(wsSnapshot.network.status) },
      }
    : stats;

  const fetchAll = useCallback((days = usageDays) => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
    dispatch(fetchMonitoringStats());
    dispatch(fetchAiUsage(days));
    dispatch(fetchAiBalance());
  }, [dispatch, usageDays]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const changeDays = (days: number) => {
    setUsageDays(days);
    dispatch(fetchAiUsage(days));
  };

  // Statut global — WS en priorité, sinon calcul depuis REST
  const systemLevel: MonitoringStatus = wsSnapshot
    ? normalizeStatus(wsSnapshot.status)
    : displayStats?.cpu.status === 'crit' || displayStats?.memory.status === 'crit' ? 'crit' :
      displayStats?.cpu.status === 'warn' || displayStats?.memory.status === 'warn' ? 'warn' : 'ok';

  const isLoading = statsLoading && !stats && !wsSnapshot;

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 flex-shrink-0 border-b border-[var(--bd-def)]">
        <div>
          <h1 className="text-[23px] font-bold text-[var(--tx-1)] tracking-tight leading-tight">
            Monitoring
          </h1>
          <p className="text-[12.5px] text-[var(--tx-3)] mt-[3px]">
            Santé de l&apos;infrastructure IA · 5 agents en fonctionnement
          </p>
        </div>
        <button
          onClick={() => fetchAll()}
          disabled={statsLoading}
          className="flex items-center gap-2 px-4 py-[9px] rounded-[10px] text-[13px] font-semibold border border-[var(--bd-def)] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0 disabled:opacity-60"
        >
          <ArrowsClockwiseIcon
            size={15}
            className={cn('transition-transform', spinning && 'animate-spin')}
          />
          Actualiser
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-6 py-6 space-y-6">

        {/* Status banner */}
        {isLoading ? (
          <Skeleton className="h-[70px] w-full" />
        ) : (
          <div className={cn(
            'flex items-center gap-4 px-5 py-4 rounded-xl border',
            systemLevel === 'ok'   && 'bg-emerald-50 border-emerald-200/60',
            systemLevel === 'warn' && 'bg-amber-50 border-amber-200/60',
            systemLevel === 'crit' && 'bg-red-50 border-red-200/60',
          )}>
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              systemLevel === 'ok'   && 'bg-emerald-600',
              systemLevel === 'warn' && 'bg-amber-500',
              systemLevel === 'crit' && 'bg-red-600',
            )}>
              {systemLevel === 'ok'
                ? <CheckCircleIcon size={20} color="white" weight="bold" />
                : <WarningCircleIcon size={20} color="white" weight="bold" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[15px] font-bold leading-tight',
                systemLevel === 'ok'   && 'text-emerald-800',
                systemLevel === 'warn' && 'text-amber-800',
                systemLevel === 'crit' && 'text-red-800',
              )}>
                {systemLevel === 'ok'   ? 'Système opérationnel' :
                 systemLevel === 'warn' ? 'Charge élevée détectée' :
                                         'Incident en cours'}
              </p>
              <p className="text-[12px] text-[var(--tx-3)] mt-0.5">
                {systemLevel === 'ok'
                  ? 'CPU, mémoire et réseau dans les seuils normaux · aucun incident actif'
                  : 'Certains indicateurs dépassent les seuils recommandés'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-semibold text-[var(--tx-1)] tabular-nums">{fmtTimestamp(displayStats?.timestamp)}</p>
              <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Dernière vérification · {fmtDate(displayStats?.timestamp)}</p>
            </div>
          </div>
        )}

        {/* Live stream status */}
        <div className="flex items-center justify-between -mb-2">
          <p className="text-[12px] font-semibold text-[var(--tx-3)]">Métriques système</p>
          <span className={cn(
            'flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border',
            wsConnStatus === 'connected'   && 'text-emerald-700 bg-emerald-50 border-emerald-200',
            wsConnStatus === 'reconnecting' && 'text-amber-700 bg-amber-50 border-amber-200',
            wsConnStatus === 'connecting'   && 'text-[var(--tx-3)] bg-[var(--bg-sink)] border-[var(--bd-def)]',
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full animate-pulse',
              wsConnStatus === 'connected'    && 'bg-emerald-500',
              wsConnStatus === 'reconnecting' && 'bg-amber-500',
              wsConnStatus === 'connecting'   && 'bg-[var(--tx-3)]',
            )} />
            {wsConnStatus === 'connected'    && 'Temps réel'}
            {wsConnStatus === 'reconnecting' && 'Reconnexion…'}
            {wsConnStatus === 'connecting'   && 'Connexion…'}
          </span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* CPU */}
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--tx-2)]">
                <CpuIcon size={16} className="text-[var(--tx-3)]" />
                CPU
              </span>
              {isLoading ? <Skeleton className="h-5 w-20" /> : (
                <StatusBadge
                  level={displayStats?.cpu.status ?? 'ok'}
                  label={displayStats?.cpu.status === 'ok' ? 'Faible charge' : displayStats?.cpu.status === 'warn' ? 'Charge élevée' : 'Critique'}
                />
              )}
            </div>
            {isLoading ? (
              <><Skeleton className="h-8 w-24 mb-3.5" /><Skeleton className="h-1.5 w-full mb-3.5" /><Skeleton className="h-3 w-40" /></>
            ) : (
              <>
                <p className="text-[28px] font-bold text-[var(--tx-1)] leading-none tabular-nums">
                  {displayStats?.cpu.percent ?? '—'}
                  <span className="text-[13px] font-normal text-[var(--tx-3)] ml-1">% · {displayStats?.cpu.count ?? '—'} cœurs</span>
                </p>
                <MetricBar pct={displayStats?.cpu.percent ?? 0} level={displayStats?.cpu.status ?? 'ok'} />
                <p className="text-[11px] text-[var(--tx-3)]">Snapshot instantané</p>
              </>
            )}
          </div>

          {/* Mémoire */}
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--tx-2)]">
                <HardDriveIcon size={16} className="text-[var(--tx-3)]" />
                Mémoire
              </span>
              {isLoading ? <Skeleton className="h-5 w-16" /> : (
                <StatusBadge
                  level={displayStats?.memory.status ?? 'ok'}
                  label={displayStats?.memory.status === 'ok' ? 'Normal' : displayStats?.memory.status === 'warn' ? 'Élevée' : 'Critique'}
                />
              )}
            </div>
            {isLoading ? (
              <><Skeleton className="h-8 w-32 mb-3.5" /><Skeleton className="h-1.5 w-full mb-3.5" /><Skeleton className="h-3 w-36" /></>
            ) : (
              <>
                <p className="text-[28px] font-bold text-[var(--tx-1)] leading-none tabular-nums">
                  {displayStats?.memory.percent ?? '—'}
                  <span className="text-[13px] font-normal text-[var(--tx-3)] ml-1">
                    % · {displayStats ? (stats?.memory?.total_mb ? fmtBytes(stats.memory.total_mb * 1_048_576) : '—') : '—'}
                  </span>
                </p>
                <MetricBar pct={displayStats?.memory.percent ?? 0} level={displayStats?.memory.status ?? 'ok'} />
                <p className="text-[11px] text-[var(--tx-3)] tabular-nums">
                  {displayStats ? (stats?.memory?.available_mb ? fmtBytes(stats.memory.available_mb * 1_048_576) : '—') : '—'} disponibles
                </p>
              </>
            )}
          </div>

          {/* Réseau */}
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--tx-2)]">
                <WifiHighIcon size={16} className="text-[var(--tx-3)]" />
                Réseau
              </span>
              {isLoading ? <Skeleton className="h-5 w-16" /> : (
                <StatusBadge level={displayStats?.network.status ?? 'ok'} label="Normal" />
              )}
            </div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[12.5px] text-[var(--tx-3)]">
                      <ArrowUpIcon size={14} className="text-emerald-600" weight="bold" />
                      Envoi
                    </span>
                    <span className="text-[17px] font-bold text-[var(--tx-1)] tabular-nums">
                      {displayStats?.network.send_rate_kbps ?? '—'} <span className="text-[12px] font-normal text-[var(--tx-3)]">kbps</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[12.5px] text-[var(--tx-3)]">
                      <ArrowDownIcon size={14} className="text-primary" weight="bold" />
                      Réception
                    </span>
                    <span className="text-[17px] font-bold text-[var(--tx-1)] tabular-nums">
                      {displayStats?.network.recv_rate_kbps ?? '—'} <span className="text-[12px] font-normal text-[var(--tx-3)]">kbps</span>
                    </span>
                  </div>
                </div>
                <div className="flex justify-between mt-4 pt-3 border-t border-[var(--bd-def)] text-[11px] text-[var(--tx-3)] tabular-nums">
                  <span>{displayStats ? fmtBytes(displayStats.network.bytes_sent_total) : '—'} envoyés</span>
                  <span>{displayStats ? fmtBytes(displayStats.network.bytes_recv_total) : '—'} reçus</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Fournisseurs IA ── */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--bd-def)] flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-bold text-[var(--tx-1)]">Fournisseurs IA</h2>
              <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Solde et consommation par fournisseur</p>
            </div>
            {/* Sélecteur de période */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-sink)] border border-[var(--bd-def)]">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => changeDays(d)}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    usageDays === d
                      ? 'bg-white text-[var(--tx-1)] shadow-sm'
                      : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                  )}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>

          {/* Résumé global usage */}
          {aiUsage && (
            <div className="grid grid-cols-3 divide-x divide-[var(--bd-def)] border-b border-[var(--bd-def)]">
              {[
                { label: 'Appels totaux',  value: fmtNumber(aiUsage.summary.total_calls)  },
                { label: 'Tokens totaux',  value: fmtNumber(aiUsage.summary.total_tokens) },
                { label: 'Coût estimé',    value: fmtUsd(aiUsage.summary.cost_usd)        },
              ].map(item => (
                <div key={item.label} className="px-5 py-3 text-center">
                  <p className="text-[18px] font-bold text-[var(--tx-1)] tabular-nums">{item.value}</p>
                  <p className="text-[10px] text-[var(--tx-3)] mt-0.5">{item.label} · {usageDays} jours</p>
                </div>
              ))}
            </div>
          )}
          {aiUsageLoading && !aiUsage && (
            <div className="px-5 py-4 flex gap-4">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
            </div>
          )}

          {/* Liste providers */}
          {(['anthropic', 'openai', 'deepseek'] as const).map((key, i, arr) => {
            const meta    = PROVIDER_META[key];
            const usage   = aiUsage?.by_provider?.[key];
            const balance = aiBalance?.[key];
            return (
              <div
                key={key}
                className={cn(
                  'flex items-start gap-4 px-5 py-4',
                  i < arr.length - 1 && 'border-b border-[var(--bd-def)]',
                )}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold mt-0.5"
                  style={{ background: meta.color }}
                >
                  {meta.abbr}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--tx-1)]">{meta.label}</p>
                  {usage ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <span className="text-[11px] text-[var(--tx-3)] tabular-nums">
                        {fmtNumber(usage.calls)} appels
                      </span>
                      <span className="text-[11px] text-[var(--tx-3)] tabular-nums">
                        {fmtNumber(usage.total_tokens)} tokens
                      </span>
                      <span className="text-[11px] text-[var(--tx-3)] tabular-nums">
                        {fmtUsd(usage.cost_usd)}
                      </span>
                    </div>
                  ) : aiUsageLoading ? (
                    <Skeleton className="h-3 w-48 mt-1.5" />
                  ) : (
                    <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Aucune donnée de consommation</p>
                  )}
                </div>

                {/* Solde */}
                <div className="flex-shrink-0 text-right">
                  {aiBalanceLoading && !aiBalance
                    ? <Skeleton className="h-6 w-24" />
                    : <ProviderBalanceBadge balance={balance} />
                  }
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
