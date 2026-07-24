"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { fetchRuns, fetchLatestSnapshot } from "@/redux/features/daf/dafSlice";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { FinSectionHeader } from "@/components/finance/fin-section-header";
import {
  FinCard,
} from "@/components/finance/fin-card";
import { FloatingToast } from "@/components/ui/toast";
import {
  ClockIcon,
  ArrowClockwiseIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Skeleton pour les runs ──────────────────────────────────────────── */

function RunsSkeleton() {
  return (
    <FinCard className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3.5 h-3.5 rounded bg-[var(--bg-sink)] animate-pulse" />
        <div className="h-3 w-20 bg-[var(--bg-sink)] rounded animate-pulse" />
      </div>
      <div className="divide-y divide-[var(--bd-def)] -mx-4 sm:-mx-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-2.5 animate-pulse">
            <div className="h-5 w-16 bg-[var(--bg-sink)] rounded-full" />
            <div className="h-3 flex-1 bg-[var(--bg-sink)] rounded" />
            <div className="h-4 w-10 bg-[var(--bg-sink)] rounded" />
          </div>
        ))}
      </div>
    </FinCard>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function ReportingPage() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "fr";

  const {
    runs,
    runsLoading,
    runsError,
    latestSnapshot,
    latestSnapshotLoading,
    latestSnapshotError,
  } = useAppSelector((s) => s.daf);

  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success" | "info";
  } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  function showToast(
    msg: string,
    type: "error" | "success" | "info" = "error",
  ) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    dispatch(fetchRuns(35));
    dispatch(fetchLatestSnapshot());
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [dispatch]);

  useEffect(() => {
    if (runsError) showToast(runsError);
    if (latestSnapshotError) showToast(latestSnapshotError);
  }, [runsError, latestSnapshotError]);

  const lastCompletedRun = runs.find(
    (r) => r.status === "completed" && r.summary,
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 mx-auto max-w-[1600px] space-y-4 sm:space-y-5">
      <FinSectionHeader
        title="Reporting financier"
        onAction={() => {}}
      />

      {/* Grille principale : Synthèse IA + Rapports */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 sm:gap-5 items-start">
        
        {/* Colonne gauche : Synthèse IA */}
        <div className="min-w-0">
          <FinCard className="border-[rgba(16,185,129,.3)] bg-[rgba(16,185,129,.02)]">
            {/* En-tête */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ background: "var(--grad)" }}
                >
                  IA
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--tx-1)] truncate">
                    Synthèse IA
                  </p>
                  <p className="text-[10px] text-[var(--tx-3)]">
                    Dernier run complété
                  </p>
                </div>
              </div>
              <button
                onClick={() => dispatch(fetchRuns(35))}
                disabled={runsLoading}
                className="w-7 h-7 rounded-lg border border-[var(--bd-def)] flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors disabled:opacity-50 flex-shrink-0"
                title="Actualiser"
              >
                <ArrowClockwiseIcon
                  size={13}
                  className={runsLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {/* Contenu */}
            {runsLoading && !lastCompletedRun ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-3 w-full bg-[rgba(16,185,129,.08)] rounded" />
                <div className="h-3 w-5/6 bg-[rgba(16,185,129,.08)] rounded" />
                <div className="h-3 w-4/6 bg-[rgba(16,185,129,.08)] rounded" />
                <div className="h-3 w-full bg-[rgba(16,185,129,.08)] rounded" />
                <div className="h-3 w-3/4 bg-[rgba(16,185,129,.08)] rounded" />
              </div>
            ) : lastCompletedRun?.summary ? (
              <div className="prose-sm max-w-none text-[12px] sm:text-[13px] leading-relaxed text-[var(--tx-1)]">
                {renderMarkdown(lastCompletedRun.summary)}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-[12px] text-[var(--tx-3)] italic">
                  {runsError
                    ? "Erreur de chargement."
                    : "Aucun run complété disponible."}
                </p>
              </div>
            )}

            {/* Pied */}
            {lastCompletedRun && !runsLoading && (
              <div className="mt-4 pt-3 border-t border-[rgba(16,185,129,.15)] flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[10px] text-[var(--tx-3)]">
                  {fmtDate(lastCompletedRun.started_at)} · Agent DAF
                </p>
                {lastCompletedRun.proposed_actions_count > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--p600)] bg-[rgba(99,102,241,.08)] px-2 py-0.5 rounded-full">
                    {lastCompletedRun.proposed_actions_count} action{lastCompletedRun.proposed_actions_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Pied skeleton pendant le rechargement */}
            {runsLoading && lastCompletedRun && (
              <div className="mt-4 pt-3 border-t border-[rgba(16,185,129,.15)] flex items-center justify-between gap-2 animate-pulse">
                <div className="h-3 w-44 bg-[rgba(16,185,129,.08)] rounded" />
                <div className="h-4 w-24 bg-[rgba(16,185,129,.08)] rounded-full" />
              </div>
            )}
          </FinCard>
        </div>

        {/* Colonne droite : Runs récents */}
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Loading skeleton */}
          {runsLoading && (
            <RunsSkeleton />
          )}

          {/* Liste des runs */}
          {!runsLoading && runs.length > 0 && (
            <FinCard>
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon size={14} className="text-[var(--tx-3)] flex-shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--tx-3)]">
                  Runs récents
                </p>
              </div>
              <div className="divide-y divide-[var(--bd-def)] -mx-4 sm:-mx-5">
                {runs.slice(0, 35).map((r) => (
                  <Link
                    key={r.id}
                    href={`/${locale}/page/finances/reporting/${r.id}`}
                    className="flex items-center gap-3 px-4 sm:px-5 py-2.5 hover:bg-[var(--bg-sink)] transition-colors group"
                  >
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0",
                        r.status === "completed"
                          ? "bg-[rgba(16,185,129,.1)] text-[#1B6B45]"
                          : r.status === "running"
                            ? "bg-[rgba(99,102,241,.1)] text-[#4338CA]"
                            : r.status === "failed"
                              ? "bg-[rgba(239,68,68,.1)] text-[#DC2626]"
                              : "bg-[var(--bg-sink)] text-[var(--tx-3)]",
                      )}
                    >
                      {r.status === "completed" ? "complété" : r.status}
                    </span>
                    <span className="text-[11px] text-[var(--tx-2)] font-mono truncate flex-1 group-hover:text-[var(--tx-1)] transition-colors">
                      {fmtDate(r.started_at)}
                    </span>
                    <span className="text-[10px] text-[var(--tx-3)] bg-[var(--bg-sink)] px-1.5 py-0.5 rounded flex-shrink-0">
                      {r.proposed_actions_count} act.
                    </span>
                  </Link>
                ))}
              </div>
            </FinCard>
          )}

          {/* État vide après chargement */}
          {!runsLoading && runs.length === 0 && !runsError && (
            <FinCard>
              <div className="py-10 text-center">
                <ClockIcon size={24} className="mx-auto mb-2 text-[var(--tx-3)] opacity-40" />
                <p className="text-[12px] text-[var(--tx-3)] italic">
                  Aucun run récent.
                </p>
              </div>
            </FinCard>
          )}
        </div>
      </div>

      <FloatingToast
        message={toast?.msg ?? null}
        type={toast?.type ?? "error"}
      />
    </div>
  );
}