'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowsClockwiseIcon, CaretRightIcon, FunnelSimpleIcon,
  XCircleIcon, ChartBarIcon,
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchKpiCatalog,
  fetchKpiCatalogWithFilter,
  resetFilter,
} from '@/redux/features/kpi/kpiSlice';
import { KpiChartCard, KpiChartCardSkeleton } from '@/components/kpi/kpi-chart-card';
import { formatTodayDate } from '@/lib/utils';

export default function AnalyticsPage() {
  const dispatch = useAppDispatch();
  const { displayed, catalog, catalogLoading, catalogError, filterLoading } =
    useAppSelector(s => s.kpi);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [filtered, setFiltered] = useState(false);

  const today = formatTodayDate();

  // Chargement initial du catalogue
  const loadCatalog = useCallback(() => {
    dispatch(fetchKpiCatalog());
  }, [dispatch]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Groupement par catégorie
  const groups = useMemo(() => {
    const map = new Map<string, typeof displayed>();
    for (const kpi of displayed) {
      const cat = kpi.category || 'Autres';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(kpi);
    }
    return Array.from(map.entries());
  }, [displayed]);

  // Applique le filtre date
  async function applyFilter() {
    if (!dateFrom && !dateTo) return;
    const keys = catalog.map(k => k.key);
    await dispatch(fetchKpiCatalogWithFilter({ keys, date_from: dateFrom, date_to: dateTo }));
    setFiltered(true);
  }

  // Réinitialise le filtre
  function clearDateFilter() {
    setDateFrom('');
    setDateTo('');
    setFiltered(false);
    dispatch(resetFilter());
  }

  const loading = catalogLoading || filterLoading;
  const isEmpty = !loading && displayed.length === 0;

  return (
    <div className="p-7 px-8 pb-16 min-h-full overflow-y-auto">

      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-2.5 flex items-center gap-1">
        <span className="text-gray-500">Tableau de bord</span>
        <CaretRightIcon size={10} className="text-gray-300" />
        <span className="text-gray-500">Analytiques</span>
        <CaretRightIcon size={10} className="text-gray-300" />
        <span>{today}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
            Analytiques
          </h1>
          <p className="text-sm text-[#7691A8] mt-1">
            Indicateurs clés générés en temps réel depuis les données opérationnelles
          </p>
        </div>

        <button
          onClick={loadCatalog}
          disabled={loading}
          className="h-9 px-3.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm disabled:opacity-50"
        >
          <ArrowsClockwiseIcon size={13} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Filtre date */}
      <div className="bg-white border border-[#DDE5EF] rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5A738A] mr-1">
          <FunnelSimpleIcon size={13} />
          Période
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#9EB0C4] font-medium uppercase tracking-wide">Début</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 px-2.5 border border-[#DDE5EF] rounded-lg text-[12px] text-[#1B2633] bg-white focus:outline-none focus:border-[#1E5B3C] focus:ring-1 focus:ring-[#1E5B3C]/20"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-[#9EB0C4] font-medium uppercase tracking-wide">Fin</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 px-2.5 border border-[#DDE5EF] rounded-lg text-[12px] text-[#1B2633] bg-white focus:outline-none focus:border-[#1E5B3C] focus:ring-1 focus:ring-[#1E5B3C]/20"
          />
        </div>
        <button
          onClick={applyFilter}
          disabled={loading || (!dateFrom && !dateTo)}
          className="h-8 px-4 bg-[#1E5B3C] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-[#174A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {filterLoading ? (
            <ArrowsClockwiseIcon size={12} className="animate-spin" />
          ) : (
            <FunnelSimpleIcon size={12} />
          )}
          Filtrer
        </button>
        {filtered && (
          <button
            onClick={clearDateFilter}
            className="h-8 px-3 border border-[#DDE5EF] rounded-lg text-xs text-[#7691A8] inline-flex items-center gap-1 hover:bg-[#F7F9FC] transition-colors"
          >
            <XCircleIcon size={12} />
            Réinitialiser
          </button>
        )}
        {filtered && (
          <span className="text-[11px] text-[#1E5B3C] bg-[#ECFDF5] px-2.5 py-1 rounded-full font-medium">
            Filtre actif · {dateFrom} → {dateTo}
          </span>
        )}
      </div>

      {/* Erreur */}
      {catalogError && (
        <div className="flex items-center gap-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl p-4 mb-5 text-sm text-[#DC2626]">
          <XCircleIcon size={16} weight="fill" className="flex-shrink-0" />
          {catalogError}
        </div>
      )}

      {/* Skeleton */}
      {catalogLoading && (
        <div className="space-y-8">
          {[1, 2].map(g => (
            <div key={g}>
              <div className="h-5 w-32 bg-[#EEF2F7] rounded animate-pulse mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <KpiChartCardSkeleton key={i} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* État vide */}
      {isEmpty && !catalogError && (
        <div className="flex flex-col items-center justify-center py-24 text-[#9EB0C4]">
          <ChartBarIcon size={48} className="mb-3 opacity-40" />
          <div className="text-sm font-medium">Aucun indicateur disponible</div>
          <div className="text-xs mt-1">Vérifiez vos permissions ou actualisez la page</div>
        </div>
      )}

      {/* Grille de KPIs groupés par catégorie */}
      {!catalogLoading && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map(([category, items]) => (
            <section key={category}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-[#1B2633] uppercase tracking-wider">
                  {category}
                </h2>
                <div className="flex-1 h-px bg-[#EEF2F7]" />
                <span className="text-[11px] text-[#9EB0C4] font-medium">
                  {items.length} indicateur{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map(kpi => (
                  <KpiChartCard
                    key={kpi.key}
                    kpi={kpi}
                    loading={filterLoading}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
