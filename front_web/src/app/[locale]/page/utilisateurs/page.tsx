'use client';

import { useEffect, useMemo, useState } from 'react';

import { ExportIcon, UserPlusIcon, WarningIcon, TrashIcon, CheckIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { UserDetailPanel } from '@/components/layout/user-detail-panel';
import { UserFormModal } from '@/components/layout/user-form-modal';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchUsers,
  createUser,
  updateUser,
  removeUser,
  updateUserLocal,
} from '@/redux/features/users/usersSlice';
import { mapApiUser, type User } from '@/types/user_type';
import { UserTable } from '@/components/layout/user-table';
import { UserKpiRow } from '@/components/layout/user-kpi-row';
import type { UserFormSubmitData } from '@/components/layout/user-form-modal';

export default function UtilisateursPage() {
  const dispatch = useAppDispatch();
  const { list: apiUsers, loading, error: apiError } = useAppSelector(state => state.users);

  // Mapping API → UI à chaque changement de la liste Redux
  const users = useMemo(() => apiUsers.map(mapApiUser), [apiUsers]);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{ mode: 'invite' | 'edit'; uid?: string } | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; sub?: string; type?: 'success' | 'error' } | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Chargement initial
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const selectedUser = selectedUid ? (users.find(u => u.uid === selectedUid) ?? null) : null;
  const editUser = formModal?.uid ? users.find(u => u.uid === formModal.uid) : undefined;
  const rawEditUser = formModal?.uid ? apiUsers.find(u => u.id === formModal.uid) : undefined;
  const deleteUser = deleteUid ? (users.find(u => u.uid === deleteUid) ?? null) : null;

  function showToast(message: string, sub?: string, type: 'success' | 'error' = 'success') {
    setToast({ message, sub, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleDelete() {
    if (!deleteUid) return;
    const uid = deleteUid;
    if (selectedUid === uid) setSelectedUid(null);
    setDeleteUid(null);
    setMobilePanelOpen(false);
    // Suppression optimiste + désactivation côté backend (pas de DELETE endpoint)
    dispatch(removeUser(uid));
    await dispatch(updateUser({ id: uid, payload: { is_active: false } }));
    showToast('Utilisateur supprimé', 'Le compte a été désactivé');
  }

  async function handleFormSubmit(data: UserFormSubmitData): Promise<{ ok: boolean; error?: string }> {
    if (formModal?.mode === 'edit' && formModal.uid) {
      dispatch(updateUserLocal({
        id: formModal.uid,
        changes: {
          ...(data.prenom !== undefined && { first_name: data.prenom }),
          ...(data.nom !== undefined && { last_name: data.nom }),
          ...(data.email !== undefined && { email: data.email }),
        },
      }));
      const result = await dispatch(updateUser({
        id: formModal.uid,
        payload: {
          ...(data.company_ids.length > 0 && { company_ids: data.company_ids }),
        },
      }));
      if (updateUser.rejected.match(result)) {
        const error = result.payload as string;
        showToast(error, undefined, 'error');
        return { ok: false, error };
      }
      setFormModal(null);
      showToast('Modifications enregistrées', 'Profil mis à jour avec succès');
      return { ok: true };
    } else {
      const result = await dispatch(createUser({
        email: data.email ?? '',
        first_name: data.prenom ?? '',
        last_name: data.nom ?? '',
        company_ids: data.company_ids,
        group_ids: [],
      }));
      if (createUser.fulfilled.match(result)) {
        setFormModal(null);
        showToast('Invitation envoyée', "Email d'invitation envoyé avec succès");
        return { ok: true };
      }
      const error = result.payload as string;
      showToast(error, undefined, 'error');
      return { ok: false, error };
    }
  }

  async function handleToggleActive(uid: string, active: boolean) {
    await dispatch(updateUser({ id: uid, payload: { is_active: active } }));
    showToast(
      active ? 'Compte réactivé' : 'Compte désactivé',
      active ? "L'utilisateur a de nouveau accès à PortaLis" : "L'accès à PortaLis a été retiré",
    );
  }

  function handleSelectUser(uid: string) {
    setSelectedUid(uid);
    setMobilePanelOpen(true);
  }

  return (
    <div className="p-4 sm:p-7 pb-16">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Utilisateurs
          </h1>
          {(loading) && (
            <p className="text-sm text-foreground-3 mt-1">Chargement des utilisateurs...</p>
          )}
          {(apiError) && (
            <p className="text-sm text-red-500 mt-1">Erreur lors du chargement des utilisateurs: {apiError}</p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Button variant="ghost" size="sm" className="flex-1 sm:flex-none">
            <ExportIcon size={13} />
            <span className="hidden xs:inline ml-1.5">Exporter CSV</span>
            <span className="xs:hidden ml-1.5">CSV</span>
          </Button>
          <Button
            variant="gradient"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setFormModal({ mode: 'invite' })}
          >
            <UserPlusIcon size={14} weight="fill" />
            <span className="hidden xs:inline ml-1.5">Inviter un membre</span>
            <span className="xs:hidden ml-1.5">Inviter</span>
          </Button>
        </div>
      </div>

      {/* KPI */}
      <UserKpiRow users={users} />

      {/* Table + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className={`w-full lg:flex-1 ${mobilePanelOpen ? 'hidden lg:block' : ''}`}>
          <UserTable
            users={users}
            selectedUid={selectedUid}
            onSelectUser={handleSelectUser}
            onEditUser={uid => setFormModal({ mode: 'edit', uid })}
            onResendInvite={uid => {
              const u = users.find(x => x.uid === uid);
              showToast('Invitation renvoyée', `${u?.email} · Lien 7 jours`);
            }}
          />
        </div>
        
        {/* Desktop panel */}
        <div className="hidden lg:block lg:w-[380px] lg:flex-shrink-0">
          <UserDetailPanel
            user={selectedUser}
            onEdit={uid => setFormModal({ mode: 'edit', uid })}
            onDelete={uid => setDeleteUid(uid)}
            onToggleActive={handleToggleActive}
          />
        </div>

        {/* Mobile panel overlay */}
        {mobilePanelOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobilePanelOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-surface rounded-t-2xl animate-slide-up">
              <div className="sticky top-0 bg-surface pt-3 pb-2 px-4 border-b border-border flex items-center justify-between">
                <span className="font-display font-semibold text-sm text-foreground">
                  Détails utilisateur
                </span>
                <button
                  onClick={() => setMobilePanelOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-foreground-3 hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <UserDetailPanel
                  user={selectedUser}
                  onEdit={uid => {
                    setFormModal({ mode: 'edit', uid });
                    setMobilePanelOpen(false);
                  }}
                  onDelete={uid => {
                    setDeleteUid(uid);
                    setMobilePanelOpen(false);
                  }}
                  onToggleActive={handleToggleActive}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal (invite / edit) */}
      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={editUser}
          rawUser={rawEditUser}
          onClose={() => setFormModal(null)}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteUid && deleteUser && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setDeleteUid(null)}
        >
          <div
            className="bg-[#1B2633] rounded-2xl p-4 sm:p-5 max-w-[420px] w-full flex flex-col sm:flex-row items-start gap-3 sm:gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-9 h-9 rounded-lg bg-error/20 flex items-center justify-center text-error flex-shrink-0">
              <WarningIcon size={16} weight="fill" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-white text-sm mb-1.5">
                Supprimer {deleteUser.prenom} {deleteUser.nom} ?
              </p>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed mb-4">
                Cette action est irréversible. Le compte sera supprimé et l&apos;accès à
                PortaLis retiré immédiatement. Les données créées sont conservées.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setDeleteUid(null)}
                  className="flex-1 h-8 rounded-md border border-white/20 bg-transparent text-xs font-display font-semibold text-white hover:bg-white/[.06] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 h-8 rounded-md border border-error/40 bg-error/15 text-xs font-display font-semibold text-red-300 flex items-center justify-center gap-1.5 hover:bg-error/25 transition-colors"
                >
                  <TrashIcon size={12} />
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 sm:top-20 right-4 sm:right-6 z-[80] bg-surface rounded-xl p-3 flex items-start gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-[320px] border ${
            toast.type === 'error'
              ? 'border-error shadow-[0_4px_20px_rgba(239,68,68,.18)]'
              : 'border-success shadow-[0_4px_20px_rgba(16,185,129,.18)]'
          }`}
        >
          <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 ${
            toast.type === 'error' ? 'bg-error/10 text-error' : 'bg-success-50 text-success'
          }`}>
            {toast.type === 'error'
              ? <WarningIcon size={14} weight="fill" />
              : <CheckIcon size={14} weight="bold" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-foreground text-xs">{toast.message}</p>
            {toast.sub && <p className="text-[11px] text-foreground-3 mt-0.5">{toast.sub}</p>}
          </div>
          <button
            onClick={() => setToast(null)}
            className="w-5 h-5 rounded border border-border flex items-center justify-center text-foreground-3 hover:text-foreground text-[10px] flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
} 