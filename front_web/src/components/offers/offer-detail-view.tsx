"use client";

import { useState } from "react";
import {
  CopyIcon,
  DownloadSimpleIcon,
  PencilSimpleIcon,
  ArrowsClockwiseIcon,
  WarningCircleIcon,
  MapPinIcon,
  ArrowRightIcon,
  FileTextIcon,
  BuildingsIcon,
  TruckIcon,
  CalendarBlankIcon,
  ClockCounterClockwiseIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  CheckSquareIcon,
  XCircleIcon,
  LinkSimpleIcon,
  CaretDownIcon,
  CaretUpIcon,
} from "@phosphor-icons/react";
import type {
  Offer,
  OfferStatus,
  Route,
  TransportOfferDetail,
} from "@/types/offer_type";
import {
  computeOfferStatus,
  isOfferExpired,
  offerDaysLeft,
  fmtOfferAmount,
  fmtOfferDate,
  OFFER_MODE_CONFIG,
} from "@/types/offer_type";
import { OfferDocument } from "./offer-document";
import { OfferStatusBadge } from "./offer-status-badge";
import { Button } from "../ui";
import { useAppSelector } from "@/redux/store";

// ── Props ─────────────────────────────────────────────────────────────────────

interface OfferDetailViewProps {
  offer: Offer;
  detail?: TransportOfferDetail | null;
  loading?: boolean;
  onBack: () => void;
  onEdit: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onSend: (offer: Offer) => void;
  onRegenerate?: (offer: Offer) => void;
  onValidate?: (offer: Offer) => Promise<void>;
  onConfirm?: (offer: Offer) => Promise<void>;
  onCancel?: (offer: Offer) => Promise<void>;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonBlock({
  w,
  h,
  rounded = "rounded",
}: {
  w: string;
  h: string;
  rounded?: string;
}) {
  return <div className={`bg-[#EEF2F7] animate-pulse ${w} ${h} ${rounded}`} />;
}

function OfferDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="overflow-auto min-h-full">
      <div className="p-4 sm:p-5 md:p-7 lg:px-8 pb-16 max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={onBack}
                className="!w-9 !h-9 !p-0"
              >
                <ArrowLeftIcon size={14} />
              </Button>
              <SkeletonBlock w="w-48" h="h-7" rounded="rounded-lg" />
              <SkeletonBlock w="w-20" h="h-6" rounded="rounded-full" />
            </div>
            <div className="mt-2 ml-11">
              <SkeletonBlock w="w-64" h="h-3.5" rounded="rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock w="w-9" h="h-9" rounded="rounded-lg" />
            <SkeletonBlock w="w-9" h="h-9" rounded="rounded-lg" />
            <SkeletonBlock w="w-24" h="h-9" rounded="rounded-lg" />
            <SkeletonBlock w="w-28" h="h-9" rounded="rounded-lg" />
          </div>
        </div>

        {/* Alert banner */}
        <div className="bg-[#F7F9FC] border border-[#EEF2F7] rounded-xl p-4 mb-4 animate-pulse">
          <SkeletonBlock w="w-3/4" h="h-3.5" rounded="rounded" />
        </div>

        {/* Main grid */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
          {/* Document card */}
          <div className="w-full lg:flex-1 min-w-0 bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-[18px] py-3.5 border-b border-[#DDE5EF]">
              <SkeletonBlock w="w-4" h="h-4" rounded="rounded" />
              <SkeletonBlock w="w-40" h="h-4" rounded="rounded" />
            </div>
            <div className="p-6 sm:p-10 space-y-4 animate-pulse">
              {/* Letterhead */}
              <div className="flex justify-between items-start mb-8">
                <SkeletonBlock w="w-32" h="h-8" rounded="rounded-lg" />
                <div className="space-y-1.5 text-right">
                  <SkeletonBlock w="w-24" h="h-3" />
                  <SkeletonBlock w="w-32" h="h-3" />
                </div>
              </div>
              {/* Title */}
              <SkeletonBlock w="w-56" h="h-6" rounded="rounded-lg" />
              <SkeletonBlock w="w-40" h="h-3.5" />
              {/* Address block */}
              <div className="mt-6 space-y-1.5">
                <SkeletonBlock w="w-48" h="h-3.5" />
                <SkeletonBlock w="w-36" h="h-3" />
                <SkeletonBlock w="w-32" h="h-3" />
              </div>
              {/* Table header */}
              <div className="mt-8 h-10 bg-[#F7F9FC] rounded-lg" />
              {/* Table rows */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 py-3 border-b border-[#EEF2F7]"
                >
                  <SkeletonBlock w="flex-1" h="h-3" />
                  <SkeletonBlock w="w-16" h="h-3" />
                  <SkeletonBlock w="w-16" h="h-3" />
                  <SkeletonBlock w="w-20" h="h-3" />
                </div>
              ))}
              {/* Total */}
              <div className="mt-4 flex justify-end gap-8">
                <div className="space-y-2">
                  <SkeletonBlock w="w-32" h="h-3" />
                  <SkeletonBlock w="w-32" h="h-3" />
                  <SkeletonBlock w="w-36" h="h-5" rounded="rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Rail */}
          <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
            {[{ rows: 2 }, { rows: 5 }, { rows: 4 }, { rows: 3 }].map(
              (card, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 sm:px-[18px] py-3.5 border-b border-[#DDE5EF]">
                    <SkeletonBlock w="w-4" h="h-4" rounded="rounded" />
                    <SkeletonBlock w="w-24" h="h-3.5" rounded="rounded" />
                  </div>
                  <div className="p-4 sm:p-[18px] space-y-3 animate-pulse">
                    {Array.from({ length: card.rows }).map((_, j) => (
                      <div
                        key={j}
                        className="flex justify-between items-center py-1.5 border-b border-[#EEF2F7] last:border-0"
                      >
                        <SkeletonBlock w="w-20" h="h-3" />
                        <SkeletonBlock w="w-28" h="h-3" />
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2.5 py-2 border-b border-[#EEF2F7] text-[12px] sm:text-[13px]">
      <span className="text-[#7691A8] flex-shrink-0">{label}</span>
      <span
        className={`font-medium text-right min-w-0 break-words ${danger ? "text-[#B91C1C]" : "text-[#1B2633]"}`}
      >
        {value}
      </span>
    </div>
  );
}

function InfoRowLast({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center gap-2.5 py-2 text-[12px] sm:text-[13px]">
      <span className="text-[#7691A8] flex-shrink-0">{label}</span>
      <span className="font-medium text-[#1B2633] text-right min-w-0 break-words">
        {value}
      </span>
    </div>
  );
}

// ── Icon Button ───────────────────────────────────────────────────────────────

function IconBtn({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-9 h-9 rounded-lg border border-[#DDE5EF] bg-white text-[#5A738A] flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-[#F7F9FC] transition-colors shadow-sm"
    >
      {icon}
    </button>
  );
}

// ── Collapsible Card ──────────────────────────────────────────────────────────

function CollapsibleCard({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-[#DDE5EF] rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 sm:px-[18px] py-3.5 border-b border-[#DDE5EF] hover:bg-[#F7F9FC] transition-colors"
      >
        <span className="text-[#1E5B3C] flex-shrink-0">{icon}</span>
        <span className="font-space-grotesk text-[13px] font-semibold text-[#1B2633] flex-1 text-left">
          {title}
        </span>
        {isOpen ? (
          <CaretUpIcon size={12} className="text-[#9EB0C4] flex-shrink-0" />
        ) : (
          <CaretDownIcon size={12} className="text-[#9EB0C4] flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className="p-4 sm:p-[18px]">{children}</div>}
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

type TlColor = "gold" | "ok" | "warn" | "err" | "gray";

interface TlEvent {
  label: string;
  meta?: string;
  color: TlColor;
}

const TL_COLOR: Record<TlColor, string> = {
  gold: "#92720C",
  ok: "#10B981",
  warn: "#F59E0B",
  err: "#EF4444",
  gray: "#9EB0C4",
};

function Timeline({ events }: { events: TlEvent[] }) {
  return (
    <div className="flex flex-col">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3 relative pb-[18px] last:pb-0">
          {i < events.length - 1 && (
            <div className="absolute left-[5px] top-4 bottom-0 w-px bg-[#DDE5EF]" />
          )}
          <div
            className="w-[11px] h-[11px] rounded-full flex-shrink-0 mt-0.5 ring-2 ring-white ring-offset-1"
            style={{
              background: TL_COLOR[ev.color],
              boxShadow: `0 0 0 1px ${TL_COLOR[ev.color]}`,
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[#1B2633]">
              {ev.label}
            </div>
            {ev.meta && (
              <div className="text-[11px] text-[#7691A8] mt-0.5">{ev.meta}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OfferDetailView({
  offer,
  detail,
  loading = false,
  onBack,
  onEdit,
  onDuplicate,
  onSend,
  onRegenerate,
  onValidate,
  onConfirm,
  onCancel,
}: OfferDetailViewProps) {
  // ── Hooks (must come before any conditional return) ───────────────────────────
  const { me } = useAppSelector((s) => s.me);
  const { config } = useAppSelector((s) => s.appConfig);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <OfferDetailSkeleton onBack={onBack} />;

  const status = computeOfferStatus(offer);
  const expired = isOfferExpired(offer);
  const daysLeft = !expired ? offerDaysLeft(offer) : null;
  const modeCfg = offer.transport_mode
    ? OFFER_MODE_CONFIG[offer.transport_mode.toLowerCase()]
    : undefined;

  // ── Validator check ──────────────────────────────────────────────────────────
  const offerValidator = config?.validators?.offer_validator ?? null;
  const canValidate = !offerValidator || me?.id === offerValidator.id;

  async function doValidate() {
    if (!onValidate || validating || !canValidate) return;
    setValidating(true);
    try {
      await onValidate(offer);
    } finally {
      setValidating(false);
    }
  }

  async function doConfirm() {
    if (!onConfirm || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(offer);
    } finally {
      setConfirming(false);
    }
  }

  async function doCancel() {
    if (!onCancel || cancelling) return;
    setCancelling(true);
    try {
      await onCancel(offer);
    } finally {
      setCancelling(false);
    }
  }

  // ── Pricing ──────────────────────────────────────────────────────────────────
  const p = {
    ht: offer.amount_untaxed || offer.unit_price * (offer.quantity ?? 1),
    ttc: offer.amount_ttc,
  };

  // ── Timeline ─────────────────────────────────────────────────────────────────
  // Flow : generated → validate → validated → confirm (Odoo) → confirmed
  const tlEvents: TlEvent[] = [
    {
      label: "Générée par l'IA",
      meta: fmtOfferDate(offer.created_at),
      color: "gold",
    },
  ];
  if (status === "envoyee") {
    tlEvents.push({
      label: "Validée par l'équipe",
      meta: "En attente de confirmation Odoo",
      color: "ok",
    });
  } else if (status === "validee") {
    tlEvents.push({ label: "Validée par l'équipe", color: "ok" });
    tlEvents.push({
      label: "Confirmée dans Odoo",
      meta: "Dossier transport créé",
      color: "ok",
    });
  } else if (status === "refusee") {
    tlEvents.push({
      label: "Offre annulée",
      meta: "Annulée avant confirmation",
      color: "err",
    });
  } else if (expired) {
    tlEvents.push(
      {
        label: "Validité expirée",
        meta: fmtOfferDate(offer.date_expiry),
        color: "gray",
      },
      {
        label: "Non validée",
        meta: "L'offre n'a pas été validée à temps",
        color: "gray",
      },
    );
  }

  // ── Action buttons helper ────────────────────────────────────────────────────
  const ActionButton = ({
    onClick,
    disabled,
    loading,
    icon,
    label,
    variant = "primary",
    title,
  }: {
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon: React.ReactNode;
    label: string;
    variant?: "primary" | "danger" | "info" | "ghost";
    title?: string;
  }) => {
    const variants = {
      primary: "bg-[#1E5B3C] text-white hover:bg-[#174A30]",
      danger:
        "bg-[#FFF5F5] text-[#B91C1C] border border-[#FCA5A5] hover:bg-[#FEE2E2]",
      info: "bg-[#085499] text-white hover:bg-[#064276]",
      ghost:
        "bg-white text-[#1B2633] border border-[#DDE5EF] hover:bg-[#F7F9FC]",
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        title={title}
        className={`h-9 px-3 sm:px-4 rounded-lg text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm ${
          variants[variant]
        } ${disabled || loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {loading ? (
          <ArrowsClockwiseIcon
            size={13}
            className="animate-spin flex-shrink-0"
          />
        ) : (
          <span className="flex-shrink-0">{icon}</span>
        )}
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.split(" ")[0]}</span>
      </button>
    );
  };

  return (
    <div className="overflow-auto min-h-full">
      <div className="p-4 sm:p-5 md:p-7 lg:px-8 pb-16 max-w-full">
        {/* ── Page header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="md"
                onClick={onBack}
                className="!w-9 !h-9 !p-0"
              >
                <ArrowLeftIcon size={14} />
              </Button>
              <h1 className="font-space-grotesk text-[20px] sm:text-[22px] md:text-[24px] font-bold text-[#1B2633] tracking-[-0.5px] leading-tight truncate">
                {offer.client_name}
              </h1>
              <OfferStatusBadge status={status} size="md" />
              {/* Dossier Odoo */}
              {status === "validee" && offer.odoo_shipment_name && (
                <span
                  className="inline-flex items-center gap-1.5 h-6 sm:h-7 px-2 sm:px-2.5 rounded-full bg-[#EBF5FD] border border-[#7DBCEA] text-[10px] sm:text-[11px] font-semibold text-[#085499] font-mono whitespace-nowrap"
                  title="Dossier Odoo"
                >
                  <LinkSimpleIcon
                    size={11}
                    weight="bold"
                    className="flex-shrink-0"
                  />
                  {offer.odoo_shipment_name}
                </span>
              )}
            </div>
            <div className="text-[11px] sm:text-xs text-[#7691A8] mt-1 font-mono truncate">
              {offer.name} · émise le {fmtOfferDate(offer.date_emission)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <button
              onClick={() => onEdit(offer)}
              className="h-9 px-3 sm:px-3.5 rounded-lg border border-[#DDE5EF] bg-white text-[#435869] text-[11px] sm:text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 hover:bg-[#F7F9FC] transition-colors shadow-sm whitespace-nowrap"
            >
              <PencilSimpleIcon size={13} className="flex-shrink-0" />
              <span className="hidden sm:inline">Modifier</span>
              <span className="sm:hidden">Éditer</span>
            </button>

            {/* Annuler */}
            {(["genere", "envoyee"] as OfferStatus[]).includes(status) &&
              onCancel && (
                <ActionButton
                  onClick={doCancel}
                  loading={cancelling}
                  disabled={cancelling}
                  icon={<XCircleIcon size={13} weight="fill" />}
                  label={cancelling ? "Annulation…" : "Annuler"}
                  variant="danger"
                />
              )}

            {/* Étape 1 — Valider l'offre (generated → validated)
                Prérequis API : statut generated. Si un validateur est configuré, seul lui peut valider. */}
            {status === "genere" && onValidate && (
              <ActionButton
                onClick={doValidate}
                loading={validating}
                disabled={validating || !canValidate}
                icon={<ShieldCheckIcon size={13} weight="fill" />}
                label={validating ? "Validation…" : "Valider l'offre"}
                variant="primary"
                title={
                  !canValidate
                    ? `Seul ${offerValidator?.display_name} peut valider cette offre`
                    : undefined
                }
              />
            )}

            {/* Étape 2 — Confirmer → Odoo (validated → confirmed)
                Prérequis API : statut validated. Crée le dossier transport dans Odoo. */}
            {status === "envoyee" && onConfirm && (
              <ActionButton
                onClick={doConfirm}
                loading={confirming}
                disabled={confirming}
                icon={<CheckSquareIcon size={13} weight="fill" />}
                label={confirming ? "Envoi…" : "Confirmer → Odoo"}
                variant="info"
              />
            )}

            {/* Régénérer */}
            {expired && (
              <ActionButton
                onClick={() =>
                  onRegenerate ? onRegenerate(offer) : onEdit(offer)
                }
                icon={<ArrowsClockwiseIcon size={13} weight="fill" />}
                label="Régénérer"
                variant="danger"
              />
            )}
          </div>
        </div>

        {/* ── Alertes ────────────────────────────────────────────────────────── */}

        {/* genere → valider d'abord (generated → validated), confirm ensuite */}
        {status === "genere" && (
          <div className="flex items-start gap-3 bg-[#FBF3DE] border border-[#D4A217] rounded-xl p-4 mb-4 text-[12px] sm:text-[13px] text-[#725A0A]">
            <ShieldCheckIcon
              size={18}
              weight="fill"
              className="text-[#92720C] flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <strong>En attente de validation</strong>
              {offerValidator ? (
                <>
                  {" "}
                  — seul <strong>{offerValidator.display_name}</strong> peut
                  valider cette offre avant l&apos;envoi vers Odoo.
                </>
              ) : (
                <>
                  {" "}
                  — cliquez sur{" "}
                  <strong>&ldquo;Valider l&apos;offre&rdquo;</strong> pour
                  passer au statut <em>Validée</em>, puis confirmez dans Odoo.
                </>
              )}
              {!canValidate && (
                <div className="mt-1.5 text-[#B91C1C] text-[11px] sm:text-xs">
                  Vous n&apos;êtes pas le validateur désigné pour cette offre.
                </div>
              )}
            </div>
          </div>
        )}

        {/* envoyee (validated) → prêt à confirmer dans Odoo */}
        {status === "envoyee" && (
          <div className="flex items-start gap-3 bg-[#EBF5FD] border border-[#7DBCEA] rounded-xl p-4 mb-4 text-[12px] sm:text-[13px] text-[#064276]">
            <CheckSquareIcon
              size={18}
              weight="fill"
              className="text-[#085499] flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <strong>Offre validée</strong> — Cliquez sur{" "}
              <strong>&ldquo;Confirmer → Odoo&rdquo;</strong> pour créer le
              dossier transport dans Odoo et lier cette offre.
            </div>
          </div>
        )}

        {expired && (
          <div className="flex items-start gap-3 bg-[#FFFBEB] border border-[#D97706] rounded-xl p-4 mb-5 text-[12px] sm:text-[13px] text-[#7A4A06]">
            <WarningCircleIcon
              size={18}
              weight="fill"
              className="text-[#D97706] flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <strong>
                Offre expirée depuis le {fmtOfferDate(offer.date_expiry)}
              </strong>{" "}
              - la validité de {offer.validity_days} jours a expiré.
            </div>
          </div>
        )}

        {!expired &&
          daysLeft !== null &&
          daysLeft <= 7 &&
          !(["validee", "refusee", "envoyee"] as OfferStatus[]).includes(
            status,
          ) && (
            <div className="flex items-center gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 mb-4 text-[12px] sm:text-[13px] text-[#D97706]">
              <WarningCircleIcon
                size={16}
                weight="fill"
                className="flex-shrink-0"
              />
              <span>
                L&apos;offre expire dans{" "}
                <strong>
                  {daysLeft} jour{daysLeft !== 1 ? "s" : ""}
                </strong>
                .
              </span>
            </div>
          )}

        {status === "validee" && offer.odoo_linked && (
          <div className="flex items-start gap-3 bg-[#ECFDF5] border border-[#6EE7B7] rounded-xl p-4 mb-4 text-[12px] sm:text-[13px] text-[#064E3B]">
            <LinkSimpleIcon
              size={18}
              weight="fill"
              className="text-[#059669] flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <strong>Dossier transport créé dans Odoo</strong> - L&apos;offre
              est liée à un dossier Odoo.
            </div>
          </div>
        )}

        {/* ── Grid document + rail ──────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
          {/* Document */}
          <div className="w-full lg:flex-1 min-w-0">
            <CollapsibleCard
              icon={<FileTextIcon size={15} />}
              title="Document de l'offre"
            >
              <div className="p-2 sm:p-4 md:p-7">
                <OfferDocument
                  offer={{ ...offer, route: offer.route as Route }}
                  detail={detail}
                />
              </div>
            </CollapsibleCard>
          </div>

          {/* Rail */}
          <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
            {/* Client */}
            <CollapsibleCard icon={<BuildingsIcon size={15} />} title="Client">
              <InfoRow label="Nom" value={offer.client_name} />
              <InfoRowLast label="Contact" value="–" />
              <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#7691A8] bg-[#EEF2F7] px-2.5 py-1 rounded-full mt-2">
                {offer.odoo_linked
                  ? "✔ Lié à un partenaire Odoo"
                  : "○ Non lié à un partenaire Odoo"}
              </div>
            </CollapsibleCard>

            {/* Trajet & transport */}
            <CollapsibleCard
              icon={<TruckIcon size={15} />}
              title="Trajet & transport"
            >
              {offer.route?.origin !== "–" &&
                offer.route?.destination !== "–" && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg mb-3 bg-[#F7F9FC] border border-[#DDE5EF]">
                    <div className="flex items-center gap-1 text-[11px] text-[#1B2633] font-semibold flex-1 min-w-0">
                      <MapPinIcon
                        size={11}
                        className="text-[#1E5B3C] flex-shrink-0"
                      />
                      <span className="truncate">
                        {offer.route?.origin.split(",")[0].trim()}
                      </span>
                    </div>
                    <ArrowRightIcon
                      size={10}
                      className="text-[#9EB0C4] flex-shrink-0"
                    />
                    <div className="flex items-center gap-1 text-[11px] text-[#1B2633] font-semibold flex-1 min-w-0">
                      <MapPinIcon
                        size={11}
                        className="text-[#DC2626] flex-shrink-0"
                      />
                      <span className="truncate">
                        {offer.route?.destination.split(",")[0].trim()}
                      </span>
                    </div>
                  </div>
                )}
              <InfoRow
                label="Origine"
                value={offer.route?.origin !== "–" ? offer.route?.origin : "–"}
              />
              <InfoRow
                label="Destination"
                value={
                  offer.route?.destination !== "–"
                    ? offer.route?.destination
                    : "–"
                }
              />
              <InfoRow
                label="Mode"
                value={
                  modeCfg ? (
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: modeCfg.bg, color: modeCfg.color }}
                    >
                      {modeCfg.label}
                    </span>
                  ) : (
                    (offer.transport_mode ?? "–")
                  )
                }
              />
              <InfoRow label="Véhicule" value={offer.vehicle_type ?? "–"} />
              <InfoRowLast
                label="Date prévue"
                value={fmtOfferDate(offer.date_planned)}
              />
            </CollapsibleCard>

            {/* Dates clés */}
            <CollapsibleCard
              icon={<CalendarBlankIcon size={15} />}
              title="Dates clés"
            >
              <InfoRow
                label="Émission"
                value={fmtOfferDate(offer.date_emission)}
              />
              <InfoRow
                label="Validité"
                value={
                  offer.validity_days ? `${offer.validity_days} jours` : "–"
                }
              />
              <InfoRow
                label={expired ? "Expirée le" : "Expire le"}
                value={
                  offer.validity_days ? fmtOfferDate(offer.date_expiry) : "–"
                }
                danger={expired}
              />
              <InfoRowLast
                label="Montant TTC"
                value={
                  p.ttc > 0 ? (
                    <span className="font-mono font-semibold text-[#1E5B3C]">
                      {fmtOfferAmount(p.ttc, offer.currency ?? "FCFA")}
                    </span>
                  ) : (
                    "–"
                  )
                }
              />
            </CollapsibleCard>

            {/* Historique */}
            <CollapsibleCard
              icon={<ClockCounterClockwiseIcon size={15} />}
              title="Historique"
            >
              <Timeline events={tlEvents} />
            </CollapsibleCard>
          </div>
        </div>
      </div>
    </div>
  );
}
