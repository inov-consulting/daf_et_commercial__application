'use client';

import { useState, useCallback } from 'react';
import {
  ArrowsClockwiseIcon, CheckCircleIcon, ArrowUpIcon, ArrowDownIcon,
  WifiHighIcon, CpuIcon, HardDriveIcon, WarningCircleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface Metrics {
  cpuPct:      number;
  memPct:      number;
  memAvailMo:  number;
  netSendKbps: number;
  netRecvKbps: number;
  lastCheck:   Date;
}

type StatusLevel = 'ok' | 'warn' | 'crit';

// ── Constants ──────────────────────────────────────────────────────────────

const MEM_TOTAL_MO = 64_132;

const PROVIDERS = [
  {
    key:   'anthropic',
    label: 'Anthropic',
    desc:  'Claude Haiku 4.5 · Claude Sonnet 4.5 — modèles utilisés par les 5 agents',
    abbr:  'A',
    color: '#0F1117',
    balance: null,
    note:  'API de solde non exposée',
  },
  {
    key:   'openai',
    label: 'OpenAI',
    desc:  'Non utilisé par les agents PortaLis actuellement',
    abbr:  'O',
    color: '#10A37F',
    balance: null,
    note:  'API de solde non exposée',
  },
  {
    key:   'deepseek',
    label: 'DeepSeek',
    desc:  'Non utilisé par les agents PortaLis actuellement',
    abbr:  'D',
    color: '#6C4CE0',
    balance: '4,79 $',
    note:  'Solde rechargé · 0,00 $ offert',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function rand(min: number, max: number, dec = 0): number {
  const v = Math.random() * (max - min) + min;
  return dec ? parseFloat(v.toFixed(dec)) : Math.round(v);
}

function initialMetrics(): Metrics {
  const memPct = 28.3;
  return {
    cpuPct:      1.7,
    memPct,
    memAvailMo:  Math.round(MEM_TOTAL_MO * (1 - memPct / 100)),
    netSendKbps: 1.1,
    netRecvKbps: 2.9,
    lastCheck:   new Date(),
  };
}

function levelOf(cpu: number, mem: number): StatusLevel {
  if (cpu > 80 || mem > 80) return 'crit';
  if (cpu > 60 || mem > 60) return 'warn';
  return 'ok';
}

function fmtTime(d: Date) {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ level, label }: { level: StatusLevel; label: string }) {
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

function MetricBar({ pct, level }: { pct: number; level: StatusLevel }) {
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [metrics,  setMetrics]  = useState<Metrics>(initialMetrics);
  const [spinning, setSpinning] = useState(false);

  const refresh = useCallback(() => {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
    const cpuPct = rand(1, 14, 1);
    const memPct = rand(25, 34, 1);
    setMetrics({
      cpuPct,
      memPct,
      memAvailMo:  Math.round(MEM_TOTAL_MO * (1 - memPct / 100)),
      netSendKbps: rand(0.5, 4, 1),
      netRecvKbps: rand(1, 6, 1),
      lastCheck:   new Date(),
    });
  }, []);

  const level = levelOf(metrics.cpuPct, metrics.memPct);

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
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-[9px] rounded-[10px] text-[13px] font-semibold border border-[var(--bd-def)] text-[var(--tx-2)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
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
        <div className={cn(
          'flex items-center gap-4 px-5 py-4 rounded-xl border',
          level === 'ok'   && 'bg-emerald-50 border-emerald-200/60',
          level === 'warn' && 'bg-amber-50 border-amber-200/60',
          level === 'crit' && 'bg-red-50 border-red-200/60',
        )}>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            level === 'ok'   && 'bg-emerald-600',
            level === 'warn' && 'bg-amber-500',
            level === 'crit' && 'bg-red-600',
          )}>
            {level === 'ok'
              ? <CheckCircleIcon size={20} color="white" weight="bold" />
              : <WarningCircleIcon size={20} color="white" weight="bold" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-[15px] font-bold leading-tight',
              level === 'ok'   && 'text-emerald-800',
              level === 'warn' && 'text-amber-800',
              level === 'crit' && 'text-red-800',
            )}>
              {level === 'ok'   ? 'Système opérationnel' :
               level === 'warn' ? 'Charge élevée détectée' :
                                  'Incident en cours'}
            </p>
            <p className="text-[12px] text-[var(--tx-3)] mt-0.5">
              {level === 'ok'
                ? 'CPU, mémoire et réseau dans les seuils normaux · aucun incident actif'
                : 'Certains indicateurs dépassent les seuils recommandés'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[13px] font-semibold text-[var(--tx-1)] tabular-nums">{fmtTime(metrics.lastCheck)}</p>
            <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Dernière vérification · {fmtDate(metrics.lastCheck)}</p>
          </div>
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
              <StatusBadge
                level={metrics.cpuPct < 60 ? 'ok' : metrics.cpuPct < 80 ? 'warn' : 'crit'}
                label={metrics.cpuPct < 60 ? 'Faible charge' : metrics.cpuPct < 80 ? 'Charge élevée' : 'Critique'}
              />
            </div>
            <p className="text-[28px] font-bold text-[var(--tx-1)] leading-none tabular-nums">
              {metrics.cpuPct}
              <span className="text-[13px] font-normal text-[var(--tx-3)] ml-1">% · 8 cœurs</span>
            </p>
            <MetricBar pct={metrics.cpuPct} level={metrics.cpuPct < 60 ? 'ok' : metrics.cpuPct < 80 ? 'warn' : 'crit'} />
            <p className="text-[11px] text-[var(--tx-3)]">Moyenne sur les 5 dernières minutes</p>
          </div>

          {/* Mémoire */}
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--tx-2)]">
                <HardDriveIcon size={16} className="text-[var(--tx-3)]" />
                Mémoire
              </span>
              <StatusBadge
                level={metrics.memPct < 60 ? 'ok' : metrics.memPct < 80 ? 'warn' : 'crit'}
                label={metrics.memPct < 60 ? 'Normal' : metrics.memPct < 80 ? 'Élevée' : 'Critique'}
              />
            </div>
            <p className="text-[28px] font-bold text-[var(--tx-1)] leading-none tabular-nums">
              {metrics.memPct}
              <span className="text-[13px] font-normal text-[var(--tx-3)] ml-1">% · 64 132 Mo</span>
            </p>
            <MetricBar pct={metrics.memPct} level={metrics.memPct < 60 ? 'ok' : metrics.memPct < 80 ? 'warn' : 'crit'} />
            <p className="text-[11px] text-[var(--tx-3)] tabular-nums">
              {metrics.memAvailMo.toLocaleString('fr-FR')} Mo disponibles
            </p>
          </div>

          {/* Réseau */}
          <div className="bg-white border border-[var(--bd-def)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--tx-2)]">
                <WifiHighIcon size={16} className="text-[var(--tx-3)]" />
                Réseau
              </span>
              <StatusBadge level="ok" label="Normal" />
            </div>
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12.5px] text-[var(--tx-3)]">
                  <ArrowUpIcon size={14} className="text-emerald-600" weight="bold" />
                  Envoi
                </span>
                <span className="text-[17px] font-bold text-[var(--tx-1)] tabular-nums">
                  {metrics.netSendKbps} <span className="text-[12px] font-normal text-[var(--tx-3)]">kbps</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12.5px] text-[var(--tx-3)]">
                  <ArrowDownIcon size={14} className="text-primary" weight="bold" />
                  Réception
                </span>
                <span className="text-[17px] font-bold text-[var(--tx-1)] tabular-nums">
                  {metrics.netRecvKbps} <span className="text-[12px] font-normal text-[var(--tx-3)]">kbps</span>
                </span>
              </div>
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t border-[var(--bd-def)] text-[11px] text-[var(--tx-3)] tabular-nums">
              <span>1,08 Mo envoyés</span>
              <span>32,1 Mo reçus</span>
            </div>
          </div>
        </div>

        {/* Fournisseurs IA */}
        <div className="bg-white border border-[var(--bd-def)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--bd-def)]">
            <h2 className="text-[15px] font-bold text-[var(--tx-1)]">Fournisseurs IA</h2>
            <p className="text-[11px] text-[var(--tx-3)] mt-0.5">Solde et disponibilité de l&apos;API par fournisseur</p>
          </div>
          {PROVIDERS.map((p, i) => (
            <div
              key={p.key}
              className={cn(
                'flex items-center gap-4 px-5 py-4',
                i < PROVIDERS.length - 1 && 'border-b border-[var(--bd-def)]',
              )}
            >
              <div
                className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold"
                style={{ background: p.color }}
              >
                {p.abbr}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[var(--tx-1)]">{p.label}</p>
                <p className="text-[11px] text-[var(--tx-3)] truncate">{p.desc}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {p.balance ? (
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200 tabular-nums">
                    {p.balance} disponibles
                  </span>
                ) : (
                  <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg text-[var(--tx-3)] bg-[var(--bg-sink)] border border-[var(--bd-def)]">
                    Suivi local
                  </span>
                )}
                <p className="text-[11px] text-[var(--tx-3)] mt-1">{p.note}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
