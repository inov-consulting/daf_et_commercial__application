'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CaretRightIcon, MagnifyingGlassIcon, ChartLineIcon, XIcon
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchKpiAvailable } from '@/redux/features/app-config/appConfigSlice';
import { clearSelectedKpi, fetchKpiDetail } from '@/redux/features/kpi/kpiSlice';
import { KpiDetailView } from '@/components/kpi/kpi-detail-view';
import { formatTodayDate } from '@/lib/utils';
import type { KpiDefinition } from '@/types/app_config_type';

// ── Couleurs catégories ───────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  commercial: { bg: '#ECFDF5', color: '#1E5B3C', dot: '#10B981' },
  transport:  { bg: '#EBF5FD', color: '#085499', dot: '#3B82F6' },
  finance:    { bg: '#FBF3DE', color: '#725A0A', dot: '#F59E0B' },
  operations: { bg: '#F3EFFE', color: '#5829A8', dot: '#8B5CF6' },
  default:    { bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
};

function catColor(cat: string) {
  return CATEGORY_COLORS[cat?.toLowerCase()] ?? CATEGORY_COLORS.default;
}

// ── Composant item de liste ───────────────────────────────────────────────────

function KpiListItem({
  definition,
  selected,
  onClick,
}: {
  definition: KpiDefinition;
  selected: boolean;
  onClick: () => void;
}) {
  const cc = catColor(definition.category);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 group ${
        selected
          ? 'bg-primary shadow-sm'
          : 'hover:bg-[#F7F9FC]'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
        style={{ background: selected ? '#fff' : cc.dot }}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`text-[12px] font-semibold leading-snug truncate ${
            selected ? 'text-white' : 'text-[#1B2633]'
          }`}
        >
          {definition.label}
        </div>
        {definition.description && (
          <div
            className={`text-[10px] mt-0.5 truncate ${
              selected ? 'text-[#A7F3D0]' : 'text-[#9EB0C4]'
            }`}
          >
            {definition.description}
          </div>
        )}
        <span
          className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide mt-1 ${
            selected ? 'bg-white/20 text-white' : ''
          }`}
          style={!selected ? { background: cc.bg, color: cc.color } : undefined}
        >
          {definition.category}
        </span>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const today    = formatTodayDate();

  // Données Redux
  const { kpiAvailable, kpiLoading } = useAppSelector(s => s.appConfig);
  const { kpiDetailLoading }          = useAppSelector(s => s.kpi);

  // État local
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search,      setSearch]      = useState('');

  // Charge la liste au montage si vide
  useEffect(() => {
    if (kpiAvailable.length === 0) {
      dispatch(fetchKpiAvailable());
    }
  }, [dispatch, kpiAvailable.length]);

  // Sélectionne le premier KPI par défaut
  useEffect(() => {
    if (kpiAvailable.length > 0 && !selectedKey) {
      const first = kpiAvailable[0];
      setSelectedKey(first.key);
      dispatch(fetchKpiDetail({ key: first.key }));
    }
  }, [kpiAvailable, selectedKey, dispatch]);

  // Nettoyage à la sortie
  useEffect(() => () => { dispatch(clearSelectedKpi()); }, [dispatch]);

  // Filtrage par recherche
  const filtered = useMemo(() => {
    if (!search.trim()) return kpiAvailable;
    const q = search.toLowerCase();
    return kpiAvailable.filter(
      k =>
        k.label.toLowerCase().includes(q) ||
        k.category.toLowerCase().includes(q) ||
        k.description?.toLowerCase().includes(q),
    );
  }, [kpiAvailable, search]);

  // Groupement par catégorie
  const groups = useMemo(() => {
    const map = new Map<string, KpiDefinition[]>();
    for (const kpi of filtered) {
      const cat = kpi.category || 'Autres';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(kpi);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Sélection d'un KPI
  const handleSelect = useCallback(
    (kpi: KpiDefinition) => {
      setSelectedKey(kpi.key);
      dispatch(fetchKpiDetail({ key: kpi.key }));
    },
    [dispatch],
  );

  const selectedDefinition = kpiAvailable.find(k => k.key === selectedKey) ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <div className="px-7 pt-5 pb-0 text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
        <span className="text-gray-500">Tableau de bord</span>
        <CaretRightIcon size={10} className="text-gray-300" />
        <span className="text-gray-500">Analytiques</span>
        <CaretRightIcon size={10} className="text-gray-300" />
        <span>{today}</span>
      </div>

      {/* ── Layout master-detail ────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-0 mt-4 px-6 pb-6">

        {/* ── Panneau gauche — liste KPIs ─────────────────────────── */}
        <aside className="w-[260px] flex-shrink-0 flex flex-col bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden mr-4">
          {/* Header liste */}
          <div className="px-4 pt-4 pb-3 border-b border-[#EEF2F7]">
            <h1 className="font-space-grotesk text-[15px] font-bold text-[#1B2633] mb-3">
              Indicateurs
            </h1>
            {/* Recherche */}
            <div className="relative">
              <MagnifyingGlassIcon
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C5D0DC]"
              />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-2.5 border border-[#DDE5EF] rounded-lg text-[11px] text-[#1B2633] bg-[#F7F9FC] placeholder:text-[#C5D0DC] focus:outline-none focus:border-primary"
              />
              <XIcon
                size={12}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C5D0DC] cursor-pointer ${
                  search ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setSearch('')}
              />
            </div>
          </div>

          {/* Liste scrollable */}
          <div className="flex-1 overflow-y-auto p-2">
            {kpiLoading && (
              <div className="space-y-1.5 p-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-[#F3F6F9] animate-pulse" />
                ))}
              </div>
            )}

            {!kpiLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-[#C5D0DC]">
                <span className="text-[11px]">Aucun résultat</span>
              </div>
            )}

            {!kpiLoading &&
              groups.map(([category, items]) => (
                <div key={category} className="mb-3">
                  <div className="text-[9px] font-bold text-[#B0BCC9] uppercase tracking-widest px-2 mb-1.5">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {items.map(kpi => (
                      <KpiListItem
                        key={kpi.key}
                        definition={kpi}
                        selected={selectedKey === kpi.key}
                        onClick={() => handleSelect(kpi)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#EEF2F7] text-[10px] text-[#C5D0DC]">
            {kpiAvailable.length} indicateur{kpiAvailable.length !== 1 ? 's' : ''} disponible{kpiAvailable.length !== 1 ? 's' : ''}
          </div>
        </aside>

        {/* ── Panneau droit — détail KPI ──────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden">
          {selectedDefinition ? (
            <KpiDetailView
              key={selectedDefinition.key}
              definition={selectedDefinition}
            />
          ) : (
            /* État vide */
            <div className="flex flex-col items-center justify-center h-full text-[#C5D0DC] gap-3">
              <ChartLineIcon size={48} className="opacity-40" />
              <div className="text-[13px] font-medium text-[#9EB0C4]">
                Sélectionnez un indicateur
              </div>
              <div className="text-[11px]">
                {kpiLoading ? 'Chargement des indicateurs…' : 'Choisissez un KPI dans la liste à gauche'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
