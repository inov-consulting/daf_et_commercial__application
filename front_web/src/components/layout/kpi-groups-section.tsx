'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchKpiAvailable,
  fetchKpiGroups,
  setGroupKpiAccess,
  deleteGroupKpiAccess,
} from '@/redux/features/app-config/appConfigSlice';
import { KpiGroupConfig } from '@/types/app_config_type';
import { fetchGroups } from '@/redux/features/groups/groupsSlice';
import {
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';

interface KpiGroupsSectionProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function KpiGroupsSection({ showToast }: KpiGroupsSectionProps) {
  const dispatch = useAppDispatch();
  const { kpiAvailable, kpiGroups, kpiLoading } = useAppSelector(s => s.appConfig);
  const { list: allGroups } = useAppSelector(s => s.groups);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editKeys, setEditKeys] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [newKpiKeys, setNewKpiKeys] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchKpiAvailable());
    dispatch(fetchKpiGroups());
    if (allGroups.length === 0) dispatch(fetchGroups());
  }, [dispatch, allGroups.length]);

  // Initialise editKeys quand les groupes sont chargés
  useEffect(() => {
    const initial: Record<string, string[]> = {};
    kpiGroups.forEach(g => { initial[g.group_id] = [...g.kpi_keys]; });
    setEditKeys(initial);
  }, [kpiGroups]);

  // KPIs groupés par catégorie
  const kpiByCategory = kpiAvailable.reduce<Record<string, typeof kpiAvailable>>((acc, k) => {
    const cat = k.category || 'Autres';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(k);
    return acc;
  }, {});

  function toggleKey(groupId: string, key: string) {
    setEditKeys(prev => {
      const current = prev[groupId] ?? [];
      return {
        ...prev,
        [groupId]: current.includes(key) ? current.filter(k => k !== key) : [...current, key],
      };
    });
  }

  async function handleSaveGroup(group: KpiGroupConfig) {
    setSaving(group.group_id);
    const result = await dispatch(setGroupKpiAccess({
      group_id: group.group_id,
      group_name: group.group_name,
      kpi_keys: editKeys[group.group_id] ?? [],
    }));
    setSaving(null);
    if (setGroupKpiAccess.fulfilled.match(result)) {
      showToast(`Accès KPI du groupe « ${group.group_name} » mis à jour`, 'success');
      setExpandedId(null);
    } else {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  }

  async function handleDeleteGroup(group: KpiGroupConfig) {
    setSaving(group.group_id);
    const result = await dispatch(deleteGroupKpiAccess(group.group_id));
    setSaving(null);
    if (deleteGroupKpiAccess.fulfilled.match(result)) {
      showToast(`Accès KPI du groupe « ${group.group_name} » supprimé`, 'warning');
      if (expandedId === group.group_id) setExpandedId(null);
    } else {
      showToast('Erreur lors de la suppression', 'error');
    }
  }

  async function handleAddGroup() {
    if (!newGroupId) return;
    const group = allGroups.find(g => g.id === newGroupId);
    if (!group) return;

    setSaving('new');
    const result = await dispatch(setGroupKpiAccess({
      group_id: group.id,
      group_name: group.name,
      kpi_keys: newKpiKeys,
    }));
    setSaving(null);
    if (setGroupKpiAccess.fulfilled.match(result)) {
      showToast(`Accès KPI configuré pour « ${group.name} »`, 'success');
      setShowAddForm(false);
      setNewGroupId('');
      setNewKpiKeys([]);
    } else {
      showToast('Erreur lors de la configuration', 'error');
    }
  }

  // Groupes Keycloak pas encore configurés
  const configuredIds = new Set(kpiGroups.map(g => g.group_id));
  const availableToAdd = allGroups.filter(g => !configuredIds.has(g.id));

  return (
    <section className="bg-white border border-[#DDE5EF] rounded-xl p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center flex-shrink-0">
            <ChartBarIcon size={16} className="text-violet-700" weight="bold" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--tx-1)] leading-tight">
              Accès KPI par groupe
            </h3>
            <p className="text-[11px] text-[var(--tx-3)] mt-0.5">
              Définissez quels indicateurs sont visibles pour chaque groupe d&apos;utilisateurs
            </p>
          </div>
        </div>
        {!showAddForm && availableToAdd.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-700 text-white hover:bg-violet-800 transition-colors"
          >
            <PlusIcon size={12} weight="bold" />
            Ajouter un groupe
          </button>
        )}
      </div>

      {/* Loading */}
      {kpiLoading && kpiGroups.length === 0 ? (
        <div className="flex items-center gap-2 text-[12px] text-[var(--tx-3)]">
          <ArrowsClockwiseIcon size={14} className="animate-spin" />
          Chargement des groupes KPI…
        </div>
      ) : (
        <div className="space-y-2">
          {/* Liste des groupes configurés */}
          {kpiGroups.length === 0 && !showAddForm && (
            <p className="text-[12px] text-[var(--tx-3)] py-4 text-center">
              Aucun groupe configuré — cliquez sur « Ajouter un groupe » pour commencer.
            </p>
          )}

          {kpiGroups.map(group => {
            const isExpanded = expandedId === group.group_id;
            const isSaving = saving === group.group_id;
            const currentKeys = editKeys[group.group_id] ?? group.kpi_keys;
            const isDirty = JSON.stringify(currentKeys.slice().sort()) !== JSON.stringify([...group.kpi_keys].sort());

            return (
              <div key={group.group_id} className="border border-[#DDE5EF] rounded-lg overflow-hidden">
                {/* Row header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : group.group_id)}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[12px] font-semibold text-[var(--tx-1)] truncate">
                      {group.group_name}
                    </span>
                    <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                      {group.kpi_keys.length} KPI{group.kpi_keys.length !== 1 ? 's' : ''}
                    </span>
                    {isDirty && (
                      <span className="flex-shrink-0 text-[10px] text-amber-600 font-medium">• modifié</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteGroup(group); }}
                      disabled={isSaving}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Supprimer l'accès KPI de ce groupe"
                    >
                      {isSaving ? <ArrowsClockwiseIcon size={13} className="animate-spin" /> : <TrashIcon size={13} />}
                    </button>
                    {isExpanded ? <CaretUpIcon size={13} className="text-gray-400" /> : <CaretDownIcon size={13} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded: KPI checkboxes */}
                {isExpanded && (
                  <div className="px-4 py-4 border-t border-[#DDE5EF] space-y-4">
                    {kpiAvailable.length === 0 ? (
                      <p className="text-[12px] text-[var(--tx-3)]">Aucun KPI disponible.</p>
                    ) : (
                      Object.entries(kpiByCategory).map(([category, kpis]) => (
                        <div key={category}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-3)] mb-2">
                            {category}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {kpis.map(kpi => (
                              <KpiCheckbox
                                key={kpi.key}
                                kpi={kpi}
                                checked={currentKeys.includes(kpi.key)}
                                onChange={() => toggleKey(group.group_id, kpi.key)}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Save row */}
                    <div className="flex justify-end pt-2 border-t border-[#EEF2F7]">
                      <button
                        onClick={() => handleSaveGroup(group)}
                        disabled={isSaving || !isDirty}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSaving ? (
                          <><ArrowsClockwiseIcon size={12} className="animate-spin" />Enregistrement…</>
                        ) : (
                          <><CheckCircleIcon size={12} weight="bold" />Enregistrer</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Formulaire ajout groupe */}
          {showAddForm && (
            <div className="border border-violet-200 bg-violet-50/40 rounded-lg p-4 space-y-4">
              <p className="text-[12px] font-semibold text-[var(--tx-1)]">Nouveau groupe KPI</p>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--tx-2)]">Groupe</label>
                <select
                  value={newGroupId}
                  onChange={e => setNewGroupId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#DDE5EF] rounded-lg bg-white text-[var(--tx-1)] focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                >
                  <option value="">— Sélectionner un groupe —</option>
                  {availableToAdd.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {kpiAvailable.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[11px] font-semibold text-[var(--tx-2)]">KPIs accessibles</label>
                  {Object.entries(kpiByCategory).map(([category, kpis]) => (
                    <div key={category}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-3)] mb-1.5">{category}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {kpis.map(kpi => (
                          <KpiCheckbox
                            key={kpi.key}
                            kpi={kpi}
                            checked={newKpiKeys.includes(kpi.key)}
                            onChange={() => setNewKpiKeys(prev =>
                              prev.includes(kpi.key) ? prev.filter(k => k !== kpi.key) : [...prev, kpi.key]
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddGroup}
                  disabled={!newGroupId || saving === 'new'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving === 'new' ? (
                    <><ArrowsClockwiseIcon size={12} className="animate-spin" />Enregistrement…</>
                  ) : (
                    <><CheckCircleIcon size={12} weight="bold" />Confirmer</>
                  )}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewGroupId(''); setNewKpiKeys([]); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--tx-2)] bg-white border border-[#DDE5EF] hover:bg-gray-50 transition-colors"
                >
                  <XCircleIcon size={12} />
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────

function KpiCheckbox({
  kpi,
  checked,
  onChange,
}: {
  kpi: { key: string; label: string; description: string; unit: string };
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 w-3.5 h-3.5 accent-violet-600 cursor-pointer flex-shrink-0"
      />
      <div className="min-w-0">
        <span className="text-[12px] font-medium text-[var(--tx-1)] leading-tight block truncate">
          {kpi.label}
        </span>
        {kpi.description && (
          <span className="text-[10px] text-[var(--tx-3)] leading-tight block truncate">
            {kpi.description}{kpi.unit ? ` (${kpi.unit})` : ''}
          </span>
        )}
      </div>
    </label>
  );
}
