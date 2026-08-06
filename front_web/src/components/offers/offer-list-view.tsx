'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FunnelSimpleIcon, PlusIcon, DownloadSimpleIcon, CaretRightIcon,
} from '@phosphor-icons/react';
import type { Offer, OfferStatus } from '@/types/offer_type';
import { computeOfferStatus, fmtOfferDate } from '@/types/offer_type';
import type { OfferListViewProps } from '@/types/offer_type';
import { exportFromRows, type ExportCsvColumn } from '@/lib/exportCsv';
import { STATUS_TABS } from '@/lib/constants';
import { formatTodayDate } from '@/lib/utils';
import { SearchInput } from './search-input';
import { OfferRow } from './offer-row';
import { OfferListSkeleton } from './offer-list-skeleton';
import { OfferListEmpty } from './offer-list-empty';
import { Pagination } from './pagination';
import { Legend } from './legend';

export function OfferListView({
  offers, loading, onRefresh, onNew,
  onView, onEdit, onDuplicate, onSend, onDelete,
}: OfferListViewProps) {
  const [search, setSearch] = useState('');
  const [tabKey, setTabKey] = useState<OfferStatus | 'tous'>('tous');
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const today = formatTodayDate();

  // Comptage par statut
  const countsByStatus = useMemo(() => {
    const counts: Partial<Record<OfferStatus | 'tous', number>> = { tous: offers.length };
    offers.forEach(offer => {
      const status = computeOfferStatus(offer);
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return counts;
  }, [offers]);

  // Filtrage
  const filtered = useMemo(() => {
    let list = offers;
    if (tabKey !== 'tous') {
      list = list.filter(offer => computeOfferStatus(offer) === tabKey);
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(offer =>
        offer.client_name.toLowerCase().includes(query) ||
        offer.name.toLowerCase().includes(query)
      );
    }
    return list;
  }, [offers, tabKey, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Réinitialiser la page et la sélection lors du changement de filtre
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [tabKey, search, perPage]);

  // États de sélection pour la page courante
  const allOnPageSelected = paged.length > 0 && paged.every(o => selectedIds.has(o.id));
  const someOnPageSelected = paged.some(o => selectedIds.has(o.id)) && !allOnPageSelected;

  // Synchronise l'état indeterminate du checkbox header (ne peut être fait qu'en JS)
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someOnPageSelected;
    }
  }, [someOnPageSelected]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paged.forEach(o => next.delete(o.id));
      } else {
        paged.forEach(o => next.add(o.id));
      }
      return next;
    });
  }, [allOnPageSelected, paged]);

  const handleToggleRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);
  
  const hasSearch = !!search.trim();
  const hasFilter = tabKey !== 'tous';

  // Convertit les placeholders UI "–" en chaîne vide pour le CSV
  const csv = (v: string | null | undefined) => (!v || v === '–') ? '' : v;

  const OFFERS_COLUMNS: ExportCsvColumn<Offer>[] = [
    { header: 'Référence',       value: r => r.name },
    { header: 'Client',          value: r => csv(r.client_name) },
    { header: 'Origine',         value: r => csv(r.origin_location) },
    { header: 'Destination',     value: r => csv(r.destination_location) },
    { header: 'Mode transport',  value: r => csv(r.transport_mode) },
    { header: 'Statut',          value: r => computeOfferStatus(r) },
    { header: 'Montant TTC',     value: r => r.amount_ttc > 0 ? r.amount_ttc : '' },
    { header: 'Devise',          value: r => r.currency ?? 'FCFA' },
    { header: "Date d'émission", value: r => { const d = fmtOfferDate(r.date_emission); return d === '–' ? '' : d; } },
    { header: "Date expiration", value: r => r.validity_days > 0 ? fmtOfferDate(r.date_expiry) : '' },
    { header: 'Créé le',         value: r => fmtOfferDate(r.created_at) },
  ];

  const handleExportCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const label = tabKey !== 'tous' ? `-${tabKey}` : '';
    exportFromRows(filtered, OFFERS_COLUMNS, `offres${label}-${today}.csv`);
  };
  
  return (
    <div className="p-7 px-8 pb-16 min-h-full overflow-y-auto">
      
      {/* Page header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3.5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
          Offres
        </h1>
        
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="h-9 px-3.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
            <DownloadSimpleIcon size={14} />
            Exporter CSV{filtered.length !== offers.length ? ` (${filtered.length})` : ''}
          </button>
          
          <button 
            onClick={onNew}
            className="h-9 px-4 bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 hover:bg-emerald-900 transition-colors shadow-md"
          >
            <PlusIcon size={14} />
            Nouvelle offre
          </button>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        
        {/* Tabs */}
        <nav className="inline-flex gap-0.5 bg-gray-50 border border-gray-200 rounded-lg p-1">
          {STATUS_TABS.map(tab => {
            const isActive = tabKey === tab.key;
            const count = countsByStatus[tab.key] ?? 0;
            
            return (
              <button
                key={tab.key}
                onClick={() => setTabKey(tab.key as OfferStatus | 'tous')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs font-semibold ${
                    isActive ? 'text-white bg-primary p-1 rounded-full' : 'text-gray-400 rounded-full border border-gray-200 bg-gray-100 p-1'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <SearchInput value={search} setValue={setSearch} onChange={setSearch} />
          
          {/* <button className="h-9 px-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 transition-colors">
            <FunnelSimpleIcon size={13} />
            Filtres
          </button> */}
        </div>
      </div>
      
      {/* Table card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-visible">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 cursor-pointer accent-emerald-800"
                  />
                </th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Offre
                </th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Trajet
                </th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Statut
                </th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Dossier Odoo
                </th>
                <th className="bg-gray-50 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Montant TTC (FCFA)
                </th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Validité
                </th>
                <th className="bg-gray-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  Activité
                </th>
                <th className="bg-gray-50 w-12 border-b border-gray-200" />
              </tr>
            </thead>
            
            <tbody>
              {loading ? (
                <OfferListSkeleton rows={5} />
              ) : paged.length === 0 ? (
                <OfferListEmpty 
                  hasSearch={hasSearch} 
                  hasFilter={hasFilter} 
                  onCreateNew={onNew} 
                />
              ) : (
                paged.map(offer => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    checked={selectedIds.has(offer.id)}
                    onCheck={handleToggleRow}
                    onView={onView}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onSend={onSend}
                    onDelete={onDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={setPerPage}
          totalItems={filtered.length}
        />
      )}
      
      {/* Legend */}
      <Legend />
    </div>
  );
}