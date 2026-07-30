'use client';

import { useRef, useState, useCallback } from 'react';
import { Files } from '@phosphor-icons/react';
import {
  PROSPECT_STATUSES, STATUS_CONFIG, SECTOR_STYLES,
  formatFcfa, pipelineAgeInfo,
  type Prospect, type ProspectStatus,
} from '@/types/prospect_type';
import { cn } from '@/lib/utils';

/* ─── Kanban Card ──────────────────────────────────────────────────────────── */

function ProspectCard({
  prospect,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  prospect: Prospect;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const sector = SECTOR_STYLES[prospect.sector] ?? {
    bg: 'rgba(118,145,168,0.10)', text: '#5A738A', border: 'rgba(118,145,168,0.22)',
  };
  const age = pipelineAgeInfo(prospect.pipelineAge);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-white rounded-xl border border-[var(--bd-def)] p-3',
        'cursor-grab active:cursor-grabbing select-none',
        'transition-all duration-200',
        'hover:shadow-md hover:border-[var(--bd-str)] hover:-translate-y-0.5',
        dragging && 'opacity-40 scale-[0.95] shadow-xl rotate-1',
      )}
    >
      {/* Company header */}
      <div className="flex items-start gap-2 mb-2.5">
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
          style={{ background: prospect.color }}
        >
          {prospect.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 leading-tight">
            <span className="text-[var(--tx-1)] text-[12px] font-semibold font-display truncate">
              {prospect.company}
            </span>
            <span className="flex-shrink-0 text-[11px]">{prospect.flag}</span>
          </div>
          <p className="text-[var(--tx-2)] text-[11px] font-medium leading-tight mt-0.5 truncate">
            {prospect.contact}
          </p>
          <p className="text-[var(--tx-3)] text-[10px] leading-tight truncate">
            {prospect.contactRole}
          </p>
        </div>
      </div>

      {/* Sector badge */}
      <div className="mb-2.5">
        <span
          className="inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-semibold border"
          style={{ background: sector.bg, color: sector.text, borderColor: sector.border }}
        >
          {prospect.sector}
        </span>
      </div>

      {/* Pipeline amount */}
      {prospect.pipeline !== null && (
        <p className="text-[var(--tx-1)] text-[13px] font-bold font-display mb-2">
          {formatFcfa(prospect.pipeline)}
        </p>
      )}

      {/* Footer: dossiers (left) + age or activity (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[var(--tx-3)] text-[10px]">
          <Files size={10} weight="duotone" />
          <span>
            {prospect.dossiers
              ? `${prospect.dossiers} dossier${prospect.dossiers > 1 ? 's' : ''}`
              : 'Aucun dossier'}
          </span>
        </div>

        {prospect.pipelineAge !== null ? (
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: age.color }}>
            {age.prefix && <span className="mr-0.5">{age.prefix}</span>}
            {age.label}
          </span>
        ) : (
          <span className="text-[var(--tx-3)] text-[10px]">{prospect.lastActivity}</span>
        )}
      </div>

      {/* Activity time when pipeline age takes the right spot */}
      {prospect.pipelineAge !== null && (
        <p className="text-right text-[var(--tx-3)] text-[10px] mt-0.5">{prospect.lastActivity}</p>
      )}
    </div>
  );
}

/* ─── Kanban Column ────────────────────────────────────────────────────────── */

function KanbanColumn({
  status,
  prospects,
  draggingId,
  isDropTarget,
  isValidDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
}: {
  status: ProspectStatus;
  prospects: Prospect[];
  draggingId: string | null;
  isDropTarget: boolean;
  isValidDrop: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onCardDragStart: (id: string) => (e: React.DragEvent) => void;
  onCardDragEnd: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const total = prospects.reduce((s, p) => s + (p.pipeline ?? 0), 0);

  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Column header */}
      <div 
        className={cn(
          'flex flex-col px-3 py-2.5 mb-2 border-b-2 transition-all duration-200',
          isDropTarget && 'scale-[1.02]',
        )}
        style={{
          background: isDropTarget && isValidDrop ? cfg.colBg : isDropTarget ? 'rgba(239,68,68,0.05)' : 'transparent',
          borderColor: isDropTarget && isValidDrop ? cfg.dotColor : isDropTarget ? '#EF4444' : 'var(--bd-def)',
          boxShadow: isDropTarget && isValidDrop ? `0 0 0 1px ${cfg.dotColor}40` : isDropTarget ? '0 0 0 1px rgba(239,68,68,0.3)' : undefined,
        }}
      >
        <div className="flex items-center justify-between">
          <span 
            className="text-[13px] font-semibold font-display"
            style={{ color: cfg.tagText }}
          >
            {cfg.label}
          </span>
          <span
            className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-200"
            style={{ 
              background: isDropTarget && isValidDrop ? cfg.dotColor : cfg.tagBg, 
              color: isDropTarget && isValidDrop ? '#fff' : cfg.tagText,
              transform: isDropTarget ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {prospects.length}
          </span>
        </div>
        {total > 0 && (
          <p className="text-[var(--tx-3)] text-[11px] mt-0.5">{formatFcfa(total)}</p>
        )}
      </div>

      {/* Drop zone + cards */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-[200px] rounded-xl p-2 transition-all duration-200',
          isDropTarget && isValidDrop && 'ring-2 scale-[1.01]',
          isDropTarget && !isValidDrop && 'ring-2 ring-red-400 bg-red-50/50',
        )}
        style={{
          background: isDropTarget && isValidDrop 
            ? cfg.colBg 
            : isDropTarget && !isValidDrop
            ? 'rgba(254,226,226,0.5)'
            : 'rgba(247,249,252,0.6)',
          boxShadow: isDropTarget && isValidDrop 
            ? `inset 0 0 0 2px ${cfg.dotColor}` 
            : isDropTarget && !isValidDrop
            ? 'inset 0 0 0 2px rgba(239,68,68,0.5)'
            : undefined,
        }}
      >
        {prospects.map((p) => (
          <ProspectCard
            key={p.id}
            prospect={p}
            dragging={draggingId === p.id}
            onDragStart={onCardDragStart(p.id)}
            onDragEnd={onCardDragEnd}
          />
        ))}

        {prospects.length === 0 && (
          <div
            className={cn(
              'flex-1 flex items-center justify-center rounded-lg border-2 border-dashed',
              'text-[11px] min-h-[80px] transition-all duration-200',
              isDropTarget && 'scale-[1.02]',
            )}
            style={{
              borderColor: isDropTarget && isValidDrop 
                ? cfg.dotColor 
                : isDropTarget && !isValidDrop
                ? '#EF4444'
                : 'transparent',
              color: isDropTarget && isValidDrop 
                ? cfg.tagText 
                : isDropTarget && !isValidDrop
                ? '#EF4444'
                : 'var(--tx-3)',
              background: isDropTarget && isValidDrop 
                ? cfg.tagBg 
                : isDropTarget && !isValidDrop
                ? 'rgba(254,226,226,0.3)'
                : 'transparent',
            }}
          >
            {isDropTarget && isValidDrop && 'Déposer ici'}
            {isDropTarget && !isValidDrop && '⛔ Non autorisé'}
            {!isDropTarget && 'Aucun prospect'}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ProspectKanban ───────────────────────────────────────────────────────── */

interface ProspectKanbanProps {
  prospects: Prospect[];
  onMove: (id: string, newStatus: ProspectStatus) => void;
  canMoveToStatus?: (prospectId: string, fromStatus: ProspectStatus, toStatus: ProspectStatus) => boolean;
}

export function ProspectKanban({ 
  prospects, 
  onMove,
  canMoveToStatus = () => true, // Par défaut, tous les mouvements sont autorisés
}: ProspectKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ProspectStatus | null>(null);
  const [isValidDropTarget, setIsValidDropTarget] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<ProspectStatus | null>(null);
  const enterCount = useRef<Partial<Record<ProspectStatus, number>>>({});
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  // Nettoyer l'état du drag
  const resetDragState = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
    setIsValidDropTarget(false);
    setDragOverColumn(null);
    enterCount.current = {};
  }, []);

  // Gérer le début du drag d'une carte
  const handleCardDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    const card = e.currentTarget as HTMLElement;
    
    // Configuration du drag
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Créer une image de drag personnalisée
    if (card) {
      const rect = card.getBoundingClientRect();
      e.dataTransfer.setDragImage(card, rect.width / 2, rect.height / 2);
    }
    
    // Animation de la carte source
    requestAnimationFrame(() => {
      card.style.opacity = '0.4';
    });
    
    setDraggingId(id);
  }, []);

  // Gérer la fin du drag
  const handleCardDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  // Gérer l'entrée dans une colonne
  const handleDragEnter = useCallback((status: ProspectStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    enterCount.current[status] = (enterCount.current[status] ?? 0) + 1;
    
    if (draggingId) {
      const prospect = prospects.find(p => p.id === draggingId);
      if (prospect) {
        const isValid = canMoveToStatus(draggingId, prospect.status, status);
        setIsValidDropTarget(isValid);
      }
    }
    
    setDropTarget(status);
    setDragOverColumn(status);
  }, [draggingId, prospects, canMoveToStatus]);

  // Gérer la sortie d'une colonne
  const handleDragLeave = useCallback((status: ProspectStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const next = Math.max(0, (enterCount.current[status] ?? 0) - 1);
    enterCount.current[status] = next;
    
    if (next === 0) {
      setDropTarget(prev => prev === status ? null : prev);
      setDragOverColumn(prev => prev === status ? null : prev);
    }
  }, []);

  // Gérer le survol d'une colonne
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggingId && dropTarget) {
      const prospect = prospects.find(p => p.id === draggingId);
      if (prospect) {
        const isValid = canMoveToStatus(draggingId, prospect.status, dropTarget);
        e.dataTransfer.dropEffect = isValid ? 'move' : 'none';
      }
    }
  }, [draggingId, dropTarget, prospects, canMoveToStatus]);

  // Gérer le drop
  const handleDrop = useCallback((e: React.DragEvent, status: ProspectStatus) => {
    e.preventDefault();
    e.stopPropagation();
    
    const id = e.dataTransfer.getData('text/plain');
    
    if (id && draggingId) {
      const prospect = prospects.find(p => p.id === id);
      if (prospect && canMoveToStatus(id, prospect.status, status)) {
        onMove(id, status);
      }
    }
    
    resetDragState();
  }, [draggingId, prospects, canMoveToStatus, onMove, resetDragState]);

  return (
    <div 
      className="flex gap-3 overflow-x-auto pb-4 kanban-scrollbar"
      onDragEnd={handleCardDragEnd}
    >
      {PROSPECT_STATUSES.map((status) => (
        <div 
          key={status} 
          className={cn(
            'bg-[var(--bg-page)] rounded-xl border border-[var(--bd-def)] w-[272px] flex-shrink-0 transition-all duration-200',
            dragOverColumn === status && isValidDropTarget && 'shadow-lg',
            dragOverColumn === status && !isValidDropTarget && 'shadow-red-200',
          )}
        >
          <KanbanColumn
            status={status}
            prospects={prospects.filter((p) => p.status === status)}
            draggingId={draggingId}
            isDropTarget={dropTarget === status}
            isValidDrop={isValidDropTarget}
            onDragEnter={handleDragEnter(status)}
            onDragLeave={handleDragLeave(status)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
          />
        </div>
      ))}
    </div>
  );
}