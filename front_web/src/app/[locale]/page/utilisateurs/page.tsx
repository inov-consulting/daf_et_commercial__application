"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";

import {
  ExportIcon,
  UserPlusIcon,
  WarningIcon,
  TrashIcon,
  CheckIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { UserDetailPanel } from "@/components/layout/user-detail-panel";
import { UserFormModal } from "@/components/layout/user-form-modal";
import { Toast } from "@/components/ui/toast";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  fetchUsers,
  createUser,
  updateUser,
  removeUser,
  toggleUserStatus,
} from "@/redux/features/users/usersSlice";
import { fetchGroups } from "@/redux/features/groups/groupsSlice";
import { mapApiUser, type User } from "@/types/user_type";
import { UserTable } from "@/components/layout/user-table";
import { UserKpiRow } from "@/components/layout/user-kpi-row";
import type { UserFormSubmitData } from "@/components/layout/user-form-modal";
import {
  CheckCircleIcon,
  WarningCircleIcon,
  InfoIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastState {
  id: number;
  message: string;
  sub?: string;
  type: ToastType;
}

// Configuration des toasts selon le type
const toastConfig: Record<ToastType, { title: string; icon: React.ReactNode }> =
  {
    success: {
      title: "Succès",
      icon: <CheckCircleIcon size={18} weight="fill" />,
    },
    error: {
      title: "Erreur",
      icon: <XCircleIcon size={18} weight="fill" />,
    },
    warning: {
      title: "Attention",
      icon: <WarningCircleIcon size={18} weight="fill" />,
    },
    info: {
      title: "Information",
      icon: <InfoIcon size={18} weight="fill" />,
    },
  };

export default function UtilisateursPage() {
  const dispatch = useAppDispatch();
  const {
    list: apiUsers,
    loading,
    error: apiError,
  } = useAppSelector((state) => state.users);
  const { list: groups } = useAppSelector((state) => state.groups);
  const me = useAppSelector((state) => state.me.me);

  // {id: name} pour résoudre les group_ids en noms lisibles
  const groupNameById = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.name])),
    [groups],
  );

  // Mapping API → UI à chaque changement de la liste Redux
  const users = useMemo(
    () =>
      apiUsers.map((u) => {
        const mapped = mapApiUser(u);
        return {
          ...mapped,
          groupes: (u.groups ?? []).map((id) => groupNameById[id.id] ?? id),
        };
      }),
    [apiUsers, groupNameById],
  );

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{
    mode: "invite" | "edit";
    uid?: string;
  } | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const toastIdRef = useRef(0);
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Chargement initial
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchGroups());
  }, [dispatch]);

  // Nettoyage des timers au démontage
  useEffect(() => {
    const currentTimers = timersRef.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  const selectedUser = selectedUid
    ? (users.find((u) => u.uid === selectedUid) ?? null)
    : null;
  const editUser = formModal?.uid
    ? users.find((u) => u.uid === formModal.uid)
    : undefined;
  const rawEditUser = formModal?.uid
    ? apiUsers.find((u) => u.id === formModal.uid)
    : undefined;
  const deleteUser = deleteUid
    ? (users.find((u) => u.uid === deleteUid) ?? null)
    : null;

  // Fonction pour afficher un toast avec le composant Toast
  const showToast = useCallback(
    (
      message: string,
      sub?: string,
      type: ToastType = "success",
      duration = 5000,
    ) => {
      const id = toastIdRef.current++;
      const newToast: ToastState = { id, message, sub, type };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss après la durée spécifiée
      if (duration > 0) {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timersRef.current.delete(id);
        }, duration);

        timersRef.current.set(id, timer);
      }
    },
    [],
  );

  // Fonction pour fermer manuellement un toast
  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  async function handleDelete() {
    if (!deleteUid) return;
    const uid = deleteUid;
    if (selectedUid === uid) setSelectedUid(null);
    setDeleteUid(null);
    setMobilePanelOpen(false);
    dispatch(removeUser(uid));
    await dispatch(toggleUserStatus({ id: uid, isActive: false }));
    showToast("Utilisateur supprimé", "Le compte a été désactivé", "success");
  }

  async function handleFormSubmit(
    data: UserFormSubmitData,
  ): Promise<{ ok: boolean; error?: string }> {
    if (formModal?.mode === "edit" && formModal.uid) {
      const result = await dispatch(
        updateUser({
          id: formModal.uid,
          payload: {
            ...(data.prenom !== undefined && { first_name: data.prenom }),
            ...(data.nom !== undefined && { last_name: data.nom }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.company_ids.length > 0 && {
              company_ids: data.company_ids,
            }),
            ...(data.group_ids &&
              data.group_ids.length > 0 && { group_ids: data.group_ids }),
            ...(data.avatar_url !== undefined && {
              avatar_url: data.avatar_url,
            }),
          },
        }),
      );
      if (updateUser.rejected.match(result)) {
        const error = result.payload as string;
        showToast("Erreur de modification", error, "error");
        return { ok: false, error };
      }
      setFormModal(null);
      showToast(
        "Modifications enregistrées",
        "Profil mis à jour avec succès",
        "success",
      );
      return { ok: true };
    } else {
      const result = await dispatch(
        createUser({
          email: data.email ?? "",
          first_name: data.prenom ?? "",
          last_name: data.nom ?? "",
          company_ids: data.company_ids,
          group_ids: data.group_ids,
        }),
      );
      if (createUser.fulfilled.match(result)) {
        setFormModal(null);
        showToast(
          "Invitation envoyée",
          "Email d'invitation envoyé avec succès",
          "success",
        );
        return { ok: true };
      }
      const error = result.payload as string;
      showToast("Erreur d'invitation", error, "error");
      return { ok: false, error };
    }
  }

  async function handleToggleActive(uid: string, active: boolean) {
    await dispatch(toggleUserStatus({ id: uid, isActive: active }));
    if (active) {
      const u = users.find(x => x.uid === uid);
      const companies = u?.entreprises ?? [];
      const companiesSub = companies.length > 0
        ? `Accès rétabli sur : ${companies.join(', ')}`
        : "L'utilisateur a de nouveau accès à PortaLis";
      showToast("Compte réactivé", companiesSub, "success");
    } else {
      const u = users.find(x => x.uid === uid);
      const companies = u?.entreprises ?? [];
      const companiesSub = companies.length > 0
        ? `Accès retiré sur : ${companies.join(', ')}`
        : "L'accès à PortaLis a été retiré";
      showToast("Compte désactivé", companiesSub, "success");
    }
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
          {loading && (
            <p className="text-sm text-foreground-3 mt-1">
              Chargement des utilisateurs...
            </p>
          )}
          {apiError && (
            <p className="text-sm text-red-500 mt-1">
              Erreur lors du chargement des utilisateurs: {apiError}
            </p>
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
            onClick={() => setFormModal({ mode: "invite" })}
          >
            <UserPlusIcon size={14} weight="fill" />
            <span className="hidden xs:inline ml-1.5">Inviter un membre</span>
            <span className="xs:hidden ml-1.5">Inviter</span>
          </Button>
        </div>
      </div>

      {/* KPI + Table + Detail Panel - grille alignée */}
      {/* items-stretch : les deux colonnes s'étirent à la hauteur de la plus grande,
          ce qui permet au sticky du panel de s'activer quand la table est plus longue */}
      <div className="grid grid-cols-4 gap-4 items-stretch">
        {/* KPI Row - prend toute la largeur */}
        <div className="col-span-4">
          <UserKpiRow users={users} />
        </div>

        {/* Table - occupe les 3 premières colonnes (pas de sticky : thead est déjà sticky) */}
        <div className="col-span-4 lg:col-span-3 min-w-0">
          <UserTable
            users={users}
            selectedUid={selectedUid}
            onSelectUser={handleSelectUser}
            onEditUser={(uid) => setFormModal({ mode: "edit", uid })}
            onDeleteUser={(uid) => setDeleteUid(uid)}
            onToggleActiveUser={(uid) => {
              const user = users.find((u) => u.uid === uid);
              if (user) {
                handleToggleActive(uid, user.status !== "active");
              }
            }}
            onResendInvite={(uid) => {
              const u = users.find((x) => x.uid === uid);
              showToast(
                "Invitation renvoyée",
                `${u?.email} · Lien 7 jours`,
                "info",
              );
            }}
          />
        </div>

        {/* Desktop panel - occupe exactement la 4ème colonne
            max-h + overflow-y-auto : le panel défile en interne si son contenu
            dépasse la hauteur du viewport */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="lg:sticky lg:top-[88px] max-h-[calc(100vh-108px)] overflow-y-auto">
            <UserDetailPanel
              user={selectedUser}
              onEdit={(uid) => setFormModal({ mode: "edit", uid })}
              onDelete={(uid) => setDeleteUid(uid)}
              onToggleActive={handleToggleActive}
              isSelf={selectedUser?.uid === me?.id}
            />
          </div>
        </div>
      </div>

      {/* Mobile detail modal */}
      {mobilePanelOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex items-center justify-center p-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Fermer le panneau"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobilePanelOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter")
                setMobilePanelOpen(false);
            }}
          />
          <div className="relative w-full max-w-[480px] max-h-[85vh] flex flex-col bg-surface rounded-2xl border border-border shadow-[var(--sh-xl)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <span className="font-display font-semibold text-sm text-foreground">
                Détails utilisateur
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobilePanelOpen(false)}
                className="!w-7 !h-7 !p-0"
              >
                <span className="sr-only">Fermer</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            </div>
            <div className="overflow-y-auto">
              <UserDetailPanel
                naked
                user={selectedUser}
                onEdit={(uid) => {
                  setFormModal({ mode: "edit", uid });
                  setMobilePanelOpen(false);
                }}
                onDelete={(uid) => {
                  setDeleteUid(uid);
                  setMobilePanelOpen(false);
                }}
                onToggleActive={handleToggleActive}
                isSelf={selectedUser?.uid === me?.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (invite / edit) */}
      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={editUser}
          rawUser={rawEditUser}
          groups={groups}
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-9 rounded-lg bg-error/20 flex items-center justify-center text-error flex-shrink-0">
              <WarningIcon size={16} weight="fill" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-white text-sm mb-1.5">
                Supprimer {deleteUser.prenom} {deleteUser.nom} ?
              </p>
              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed mb-4">
                Cette action est irréversible. Le compte sera supprimé et
                l&apos;accès à PortaLis retiré immédiatement. Les données créées
                sont conservées.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteUid(null)}
                  className="flex-1 !text-white !border-white/20 hover:!bg-white/[.06]"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  <TrashIcon size={12} />
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts - Positionnés en haut à droite */}
      <div className="fixed top-4 sm:top-20 right-4 sm:right-6 z-[80] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-[380px] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-in slide-in-from-right fade-in duration-300 pointer-events-auto"
          >
            <Toast
              type={toast.type}
              title={toastConfig[toast.type].title}
              message={
                toast.sub ? `${toast.message}\n${toast.sub}` : toast.message
              }
              icon={toastConfig[toast.type].icon}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
