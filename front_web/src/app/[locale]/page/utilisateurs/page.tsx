'use client';

import { useState } from 'react';
import { Export, UserPlus, Warning, Trash, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { UserKpiRow } from '@/components/layout/user-kpi-row';
import { UserTable } from '@/components/layout/user-table';
import { UserDetailPanel } from '@/components/layout/user-detail-panel';
import { UserFormModal } from '@/components/layout/user-form-modal';
import { MOCK_USERS, type User } from '@/types/user_type';

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{ mode: 'invite' | 'edit'; uid?: string } | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; sub?: string } | null>(null);

  const selectedUser = selectedUid ? (users.find(u => u.uid === selectedUid) ?? null) : null;
  const editUser = formModal?.uid ? users.find(u => u.uid === formModal.uid) : undefined;
  const deleteUser = deleteUid ? (users.find(u => u.uid === deleteUid) ?? null) : null;

  function showToast(message: string, sub?: string) {
    setToast({ message, sub });
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete() {
    if (!deleteUid) return;
    setUsers(prev => prev.filter(u => u.uid !== deleteUid));
    if (selectedUid === deleteUid) setSelectedUid(null);
    setDeleteUid(null);
    showToast('Utilisateur supprimé', 'Le compte a été supprimé définitivement');
  }

  function handleFormSubmit(data: Partial<User>) {
    if (formModal?.mode === 'edit' && formModal.uid) {
      setUsers(prev =>
        prev.map(u => u.uid === formModal.uid ? { ...u, ...data } : u),
      );
      showToast('Modifications enregistrées', 'Profil mis à jour avec succès');
    } else {
      showToast('Invitation envoyée', "Email d'invitation envoyé avec succès");
    }
  }

  return (
    <div className="p-7 pb-16">
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-display text-[26px] font-bold text-foreground tracking-tight leading-tight">
            Utilisateurs
          </h1>
          <p className="text-xs text-foreground-3 mt-0.5">
            <span className="text-foreground-2">Dashboard</span>
            {' › '}Admin › Utilisateurs · 4 juin 2026
          </p>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <Button variant="ghost" size="sm">
            <Export size={13} />
            Exporter CSV
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setFormModal({ mode: 'invite' })}
          >
            <UserPlus size={14} weight="fill" />
            Inviter un membre
          </Button>
        </div>
      </div>

      {/* KPI */}
      <UserKpiRow users={users} />

      {/* Table + Detail Panel */}
      <div className="flex gap-4 items-start">
        <UserTable
          users={users}
          selectedUid={selectedUid}
          onSelectUser={setSelectedUid}
          onEditUser={uid => setFormModal({ mode: 'edit', uid })}
          onResendInvite={uid => {
            const u = users.find(x => x.uid === uid);
            showToast('Invitation renvoyée', `${u?.email} · Lien 7 jours`);
          }}
        />
        <UserDetailPanel
          user={selectedUser}
          onEdit={uid => setFormModal({ mode: 'edit', uid })}
          onDelete={uid => setDeleteUid(uid)}
        />
      </div>

      {/* Form Modal (invite / edit) */}
      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={editUser}
          onClose={() => setFormModal(null)}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteUid && deleteUser && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setDeleteUid(null)}
        >
          <div
            className="bg-[#1B2633] rounded-2xl p-5 max-w-[420px] w-full flex items-start gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-9 h-9 rounded-lg bg-error/20 flex items-center justify-center text-error flex-shrink-0">
              <Warning size={16} weight="fill" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-white text-sm mb-1.5">
                Supprimer {deleteUser.prenom} {deleteUser.nom} ?
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Cette action est irréversible. Le compte sera supprimé et l&apos;accès à
                PortaLis retiré immédiatement. Les données créées sont conservées.
              </p>
              <div className="flex gap-2">
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
                  <Trash size={12} />
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-[80] bg-surface border border-success rounded-xl p-3 flex items-start gap-2.5 shadow-[0_4px_20px_rgba(16,185,129,.18)] max-w-[280px]">
          <div className="w-[30px] h-[30px] rounded-lg bg-success-50 flex items-center justify-center text-success flex-shrink-0">
            <Check size={14} weight="bold" />
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
