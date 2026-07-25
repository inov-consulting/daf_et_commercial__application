'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  fetchGroupRoles,
  fetchPermissions,
  assignGroupRoles,
  removeGroupRole,
} from '@/redux/features/groups/groupsSlice';
import {
  UsersIcon,
  PlusIcon,
  TrashIcon,
  ArrowsClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';

interface GroupsManagementSectionProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function GroupsManagementSection({ showToast }: GroupsManagementSectionProps) {
  const dispatch = useAppDispatch();
  const {
    list: groups,
    loading,
    roles,
    rolesLoading,
    permissions,
    creating,
    deletingIds,
    assigningIds,
    removingRoles,
  } = useAppSelector(s => s.groups);

  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm]   = useState(false);
  const [newGroupName, setNewGroupName]       = useState('');
  const [selectedRoles, setSelectedRoles]     = useState<Record<string, string[]>>({});

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchPermissions());
  }, [dispatch]);

  // Charger les rôles à l'expansion d'un groupe
  useEffect(() => {
    if (expandedId && !roles[expandedId] && !rolesLoading[expandedId]) {
      dispatch(fetchGroupRoles(expandedId));
    }
  }, [expandedId, roles, rolesLoading, dispatch]);

  async function handleCreate() {
    if (!newGroupName.trim()) return;
    const result = await dispatch(createGroup(newGroupName.trim()));
    if (createGroup.fulfilled.match(result)) {
      showToast(`Groupe « ${newGroupName.trim()} » créé`, 'success');
      setNewGroupName('');
      setShowCreateForm(false);
    } else {
      showToast('Erreur lors de la création du groupe', 'error');
    }
  }

  async function handleDelete(groupId: string, groupName: string) {
    const result = await dispatch(deleteGroup(groupId));
    if (deleteGroup.fulfilled.match(result)) {
      showToast(`Groupe « ${groupName} » supprimé`, 'warning');
      setConfirmDeleteId(null);
      if (expandedId === groupId) setExpandedId(null);
    } else {
      showToast('Suppression impossible — des utilisateurs sont rattachés à ce groupe', 'error');
      setConfirmDeleteId(null);
    }
  }

  async function handleAssign(groupId: string) {
    const roleNames = selectedRoles[groupId] ?? [];
    if (!roleNames.length) return;
    const result = await dispatch(assignGroupRoles({ groupId, roleNames }));
    if (assignGroupRoles.fulfilled.match(result)) {
      showToast('Rôles assignés avec succès', 'success');
      setSelectedRoles(prev => ({ ...prev, [groupId]: [] }));
    } else {
      showToast("Erreur lors de l'assignation des rôles", 'error');
    }
  }

  async function handleRemoveRole(groupId: string, roleName: string) {
    const result = await dispatch(removeGroupRole({ groupId, roleName }));
    if (!removeGroupRole.fulfilled.match(result)) {
      showToast('Erreur lors de la suppression du rôle', 'error');
    }
  }

  function toggleSelectedRole(groupId: string, roleName: string) {
    setSelectedRoles(prev => {
      const cur = prev[groupId] ?? [];
      return {
        ...prev,
        [groupId]: cur.includes(roleName) ? cur.filter(r => r !== roleName) : [...cur, roleName],
      };
    });
  }

  function availablePermissions(groupId: string) {
    const assigned = new Set((roles[groupId] ?? []).map(r => r.name));
    return permissions.filter(p => !assigned.has(p.name) && !p.composite);
  }

  return (
    <section className="bg-white border border-[#DDE5EF] rounded-xl p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
            <UsersIcon size={16} className="text-indigo-700" weight="bold" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--tx-1)] leading-tight">
              Groupes &amp; Permissions
            </h3>
            <p className="text-[11px] text-[var(--tx-3)] mt-0.5">
              Gérez les groupes Keycloak et leurs rôles d&apos;accès
            </p>
          </div>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-700 text-white hover:bg-indigo-800 transition-colors"
          >
            <PlusIcon size={12} weight="bold" />
            Créer un groupe
          </button>
        )}
      </div>

      {loading && groups.length === 0 ? (
        <div className="flex items-center gap-2 text-[12px] text-[var(--tx-3)]">
          <ArrowsClockwiseIcon size={14} className="animate-spin" />
          Chargement des groupes…
        </div>
      ) : (
        <div className="space-y-2">
          {groups.length === 0 && !showCreateForm && (
            <p className="text-[12px] text-[var(--tx-3)] py-4 text-center">
              Aucun groupe — cliquez sur «&nbsp;Créer un groupe&nbsp;» pour commencer.
            </p>
          )}

          {groups.map(group => {
            const isExpanded       = expandedId === group.id;
            const groupRoles       = roles[group.id] ?? [];
            const isRolesLoading   = !!rolesLoading[group.id];
            const isDeleting       = deletingIds.includes(group.id);
            const isConfirming     = confirmDeleteId === group.id;
            const isAssigning      = assigningIds.includes(group.id);
            const currentSelected  = selectedRoles[group.id] ?? [];
            const available        = availablePermissions(group.id);

            return (
              <div key={group.id} className="border border-[#DDE5EF] rounded-lg overflow-hidden">
                {/* Row header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <button
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : group.id)}
                  >
                    <span className="text-[12px] font-semibold text-[var(--tx-1)] truncate">{group.name}</span>
                    {roles[group.id] && (
                      <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {groupRoles.length} rôle{groupRoles.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                        <span className="text-[10px] font-semibold text-red-700">Confirmer la suppression ?</span>
                        <button
                          onClick={() => handleDelete(group.id, group.name)}
                          disabled={isDeleting}
                          className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                        >
                          {isDeleting
                            ? <ArrowsClockwiseIcon size={10} className="animate-spin" />
                            : 'Supprimer'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] font-medium text-red-600 hover:text-red-800"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(group.id); }}
                        disabled={isDeleting}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Supprimer le groupe"
                      >
                        {isDeleting
                          ? <ArrowsClockwiseIcon size={13} className="animate-spin" />
                          : <TrashIcon size={13} />}
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : group.id)}>
                      {isExpanded
                        ? <CaretUpIcon size={13} className="text-gray-400" />
                        : <CaretDownIcon size={13} className="text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="px-4 py-4 border-t border-[#DDE5EF] space-y-4">
                    {/* Rôles assignés */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-3)] mb-2 flex items-center gap-1.5">
                        <ShieldCheckIcon size={11} />
                        Rôles assignés
                      </p>
                      {isRolesLoading ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--tx-3)]">
                          <ArrowsClockwiseIcon size={12} className="animate-spin" /> Chargement…
                        </div>
                      ) : groupRoles.length === 0 ? (
                        <p className="text-[11px] text-[var(--tx-3)] italic">Aucun rôle assigné</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {groupRoles.map(role => {
                            const removing = removingRoles.includes(`${group.id}:${role.name}`);
                            return (
                              <span
                                key={role.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                {role.name}
                                <button
                                  onClick={() => handleRemoveRole(group.id, role.name)}
                                  disabled={removing}
                                  className="hover:text-red-500 transition-colors disabled:opacity-50 ml-0.5"
                                  title="Retirer ce rôle"
                                >
                                  {removing
                                    ? <ArrowsClockwiseIcon size={9} className="animate-spin" />
                                    : <XIcon size={9} weight="bold" />}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Ajouter des rôles */}
                    {!isRolesLoading && available.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-3)] mb-2">
                          Ajouter des rôles
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 max-h-44 overflow-y-auto mb-2.5 pr-1">
                          {available.map(perm => (
                            <label
                              key={perm.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={currentSelected.includes(perm.name)}
                                onChange={() => toggleSelectedRole(group.id, perm.name)}
                                className="w-3.5 h-3.5 accent-indigo-600 flex-shrink-0"
                              />
                              <span className="text-[11px] text-[var(--tx-1)] font-medium truncate">
                                {perm.name}
                              </span>
                            </label>
                          ))}
                        </div>
                        <button
                          onClick={() => handleAssign(group.id)}
                          disabled={isAssigning || currentSelected.length === 0}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isAssigning ? (
                            <><ArrowsClockwiseIcon size={12} className="animate-spin" />Assignation…</>
                          ) : (
                            <><CheckCircleIcon size={12} weight="bold" />Assigner {currentSelected.length > 0 ? `(${currentSelected.length})` : ''}</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Formulaire de création */}
          {showCreateForm && (
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-lg p-4">
              <p className="text-[12px] font-semibold text-[var(--tx-1)] mb-3">Nouveau groupe</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Nom du groupe (ex: Comptabilité)"
                  autoFocus
                  className="flex-1 px-2.5 py-1.5 text-[12px] border border-[#DDE5EF] rounded-lg bg-white text-[var(--tx-1)] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newGroupName.trim() || creating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating
                    ? <><ArrowsClockwiseIcon size={12} className="animate-spin" />Création…</>
                    : <><CheckCircleIcon size={12} weight="bold" />Créer</>}
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setNewGroupName(''); }}
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
