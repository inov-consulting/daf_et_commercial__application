'use client';

import { useState } from 'react';
import { FinSectionHeader } from '@/components/finance/fin-section-header';
import { FinCard, FinCardHeader } from '@/components/finance/fin-card';
import {
  WarningCircleIcon, ClockIcon, BellIcon, InfoIcon,
  CheckIcon, XIcon, FunnelIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { AlerteFinance, AlerteLevel } from '@/types/finance_type';

/* ── Types ──────────────────────────────────────────────────────── */

interface AlerteExtended extends AlerteFinance {
  categorie: 'dso' | 'tresorerie' | 'facturation' | 'ia';
  entite:    'sn' | 'ci' | 'all';
  dismissed?: boolean;
}

/* ── Mock data ─────────────────────────────────────────────────── */

const INITIAL_ALERTES: AlerteExtended[] = [
  { id: 1,  level: 'critique', tag: 'DSO',        categorie: 'dso',        entite: 'sn', title: 'DSO 57j · Seuil critique dépassé',                  sub: 'Objectif 45j — 3 clients > 60j — 18,3M FCFA exposés',                      date: 'Depuis 12h · 09/07/2026' },
  { id: 2,  level: 'critique', tag: 'Créance',     categorie: 'dso',        entite: 'sn', title: 'Transcont SARL · 14 200 000 FCFA · 68 jours',        sub: 'Client en retard critique · Relance urgente non répondue · 2 tentatives',  date: 'Échéance dépassée · 23j' },
  { id: 3,  level: 'critique', tag: 'Trésorerie',  categorie: 'tresorerie', entite: 'ci', title: 'Solde BICICI CI · Seuil minimum atteint',             sub: '1,2M FCFA · Seuil opérationnel 2M — Risque de blocage paiements',          date: 'Détecté il y a 2h' },
  { id: 4,  level: 'urgent',   tag: 'Relance',     categorie: 'dso',        entite: 'sn', title: 'SONACOS CI · 2 840 000 FCFA · 64 jours',              sub: 'Deuxième relance sans réponse · Contact DG recommandé',                     date: '08/07/2026' },
  { id: 5,  level: 'urgent',   tag: 'Facturation', categorie: 'facturation', entite: 'sn', title: 'FAC-2026-0089 · Litige signalé',                     sub: '8 200 000 FCFA · Transcont conteste les frais de consignation — À traiter', date: '07/07/2026' },
  { id: 6,  level: 'urgent',                        categorie: 'tresorerie', entite: 'sn', title: 'Virement masse salariale · Dans 5 jours',             sub: '17 200 000 FCFA · Paie Juin 2026 — Vérifier provision SGBCI SN',           date: '15/07/2026' },
  { id: 7,  level: 'demain',   tag: 'Facturation', categorie: 'facturation', entite: 'sn', title: 'FAC-2026-0134 · Échéance demain',                     sub: '3 450 000 FCFA · SODITRA SA — Confirmer réception',                        date: '10/07/2026' },
  { id: 8,  level: 'demain',                        categorie: 'dso',        entite: 'ci', title: 'SONATRANS CI · Engagement paiement demain',           sub: '4 800 000 FCFA · Confirmation verbale du 08/07 — Surveiller',              date: '10/07/2026' },
  { id: 9,  level: 'demain',   tag: 'Impôts',      categorie: 'facturation', entite: 'ci', title: 'Acompte IS T3 · Dépôt demain',                        sub: '6 800 000 FCFA · DGI Côte d\'Ivoire — Virement planifié',                 date: '10/07/2026' },
  { id: 10, level: 'info',     tag: 'IA',          categorie: 'ia',         entite: 'all', title: 'Synthèse Juin 2026 générée · Validation requise',    sub: 'Rapport financier mensuel complet · À soumettre avant le 15 juil.',        date: 'Dans 5 jours' },
  { id: 11, level: 'info',     tag: 'IA',          categorie: 'ia',         entite: 'sn', title: 'Projection trésorerie J+90 disponible',               sub: '3 scénarios générés · Optimiste / Base / Pessimiste — À valider',           date: 'Généré il y a 4h' },
  { id: 12, level: 'info',                          categorie: 'tresorerie', entite: 'sn', title: 'Rapprochement bancaire SGBCI · En attente',           sub: '7 relevés importés · Validation manuelle requise pour 3 opérations',       date: '09/07/2026' },
];

/* ── Config niveaux ─────────────────────────────────────────────── */

const LEVEL_CONFIG: Record<AlerteLevel, {
  bg: string; text: string; border: string; barColor: string; dotColor: string;
  Icon: React.ElementType; label: string; badgeBg: string;
}> = {
  critique: { bg: 'rgba(239,68,68,.05)',   text: '#DC2626', border: 'rgba(239,68,68,.2)',   barColor: '#EF4444', dotColor: '#EF4444', Icon: WarningCircleIcon, label: 'Critique',  badgeBg: '#FEE2E2' },
  urgent:   { bg: 'rgba(249,115,22,.05)',  text: '#EA580C', border: 'rgba(249,115,22,.2)', barColor: '#F97316', dotColor: '#F97316', Icon: ClockIcon,         label: 'Urgent',    badgeBg: '#FFEDD5' },
  demain:   { bg: 'rgba(245,158,11,.05)',  text: '#B45309', border: 'rgba(245,158,11,.2)', barColor: '#F59E0B', dotColor: '#F59E0B', Icon: BellIcon,          label: 'Demain',    badgeBg: '#FEF3C7' },
  info:     { bg: 'rgba(16,185,129,.05)',  text: '#1B6B45', border: 'rgba(16,185,129,.2)', barColor: '#10B981', dotColor: '#10B981', Icon: InfoIcon,          label: 'Info',      badgeBg: '#D1FAE5' },
};

const CATEGORIES = [
  { key: 'all',        label: 'Toutes' },
  { key: 'dso',        label: 'DSO & Créances' },
  { key: 'tresorerie', label: 'Trésorerie' },
  { key: 'facturation', label: 'Facturation' },
  { key: 'ia',         label: 'IA' },
];

const ENTITES = [
  { key: 'all', label: 'Toutes' },
  { key: 'sn',  label: 'Sénégal' },
  { key: 'ci',  label: 'Côte d\'Ivoire' },
];

/* ── Page ──────────────────────────────────────────────────────── */

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<AlerteExtended[]>(INITIAL_ALERTES);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterEnt, setFilterEnt] = useState<string>('all');

  function dismiss(id: number) {
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  }

  const visible = alertes.filter(a => !a.dismissed);
  const filtered = visible.filter(a =>
    (filterCat === 'all' || a.categorie === filterCat) &&
    (filterEnt === 'all' || a.entite === filterEnt || a.entite === 'all')
  );

  const counts: Record<AlerteLevel, number> = {
    critique: visible.filter(a => a.level === 'critique').length,
    urgent:   visible.filter(a => a.level === 'urgent').length,
    demain:   visible.filter(a => a.level === 'demain').length,
    info:     visible.filter(a => a.level === 'info').length,
  };

  const levels: AlerteLevel[] = ['critique', 'urgent', 'demain', 'info'];

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px]">
      <FinSectionHeader
        title="Alertes financières"
        subtitle={`${visible.length} alertes actives`}
        secondaryAction={{ label: 'Archiver toutes', icon: <CheckIcon size={13} />, onClick: () => {} }}
        actionLabel="+ Règle personnalisée"
        onAction={() => {}}
      />

      {/* Résumé niveaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {levels.map(l => {
          const c = LEVEL_CONFIG[l];
          const { Icon } = c;
          return (
            <button
              key={l}
              onClick={() => {}}
              className="p-3 rounded-xl border text-left transition-all hover:scale-[1.01]"
              style={{ background: c.bg, borderColor: c.border }}
            >
              <div className="flex items-start justify-between mb-2">
                <Icon size={20} style={{ color: c.text }} />
                <span className="text-2xl font-bold font-display" style={{ color: c.text }}>{counts[l]}</span>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: c.text }}>{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filtres */}
      <FinCard className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FunnelIcon size={13} className="text-[var(--tx-3)]" />
            <span className="text-[11px] text-[var(--tx-3)] font-semibold uppercase tracking-wide">Filtres</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setFilterCat(c.key)}
                className={cn('h-6 px-2 rounded-md text-[11px] font-medium transition-colors border', filterCat === c.key
                  ? 'bg-[var(--p500)] text-white border-[var(--p500)]'
                  : 'text-[var(--tx-2)] border-[var(--bd-def)] hover:bg-[var(--bg-sink)]')}
              >{c.label}</button>
            ))}
          </div>
          <div className="w-px h-4 bg-[var(--bd-def)]" />
          <div className="flex flex-wrap gap-1.5">
            {ENTITES.map(e => (
              <button
                key={e.key}
                onClick={() => setFilterEnt(e.key)}
                className={cn('h-6 px-2 rounded-md text-[11px] font-medium transition-colors border', filterEnt === e.key
                  ? 'bg-[var(--tx-1)] text-[var(--bg-base)] border-[var(--tx-1)]'
                  : 'text-[var(--tx-2)] border-[var(--bd-def)] hover:bg-[var(--bg-sink)]')}
              >{e.label}</button>
            ))}
          </div>
        </div>
      </FinCard>

      {/* Liste alertes groupées par niveau */}
      <div className="space-y-4">
        {levels.map(level => {
          const group = filtered.filter(a => a.level === level);
          if (!group.length) return null;
          const c = LEVEL_CONFIG[level];
          const { Icon } = c;
          return (
            <div key={level}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: c.text }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.text }}>{c.label}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: c.badgeBg, color: c.text }}>{group.length}</span>
              </div>
              <div className="space-y-2">
                {group.map(a => (
                  <div
                    key={a.id}
                    className="rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm"
                    style={{ background: c.bg, borderColor: c.border }}
                  >
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: c.barColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        {a.tag && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.badgeBg, color: c.text }}>{a.tag}</span>
                        )}
                        <p className="text-[13px] font-semibold text-[var(--tx-1)]">{a.title}</p>
                      </div>
                      <p className="text-[12px] text-[var(--tx-2)]">{a.sub}</p>
                      {a.date && <p className="text-[11px] text-[var(--tx-3)] mt-1">{a.date}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => dismiss(a.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
                        title="Ignorer"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[var(--tx-3)]">
          <CheckIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune alerte pour ce filtre</p>
        </div>
      )}
    </div>
  );
}
