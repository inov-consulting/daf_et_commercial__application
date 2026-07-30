'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CheckIcon,
  XIcon,
  SpinnerGapIcon,
  CaretDownIcon,
  PlusIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { WaConversation, WaMessage } from '@/redux/features/whatsapp/whatsappSlice';
import { colorFromId, initials, convName, hasBothSides } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { fetchNotes } from '@/redux/features/notes/notesSlice';
import { useInfiniteProspects } from '@/hooks/useInfiniteProspects';
import { hashColor, toInitials, type ApiProspect } from '@/types/prospect_type';
import { MsgBubble } from './MsgBubble';
import { Composer } from './Composer';
import { MediaViewer, type MediaViewerItem } from './MediaViewer';

// ── CR doc icon ────────────────────────────────────────────────────────────────

function CrDocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]">
      <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke="currentColor" />
      <path d="M9 12.5h6M9 16h4" stroke="currentColor" />
    </svg>
  );
}

// ── Note panel (prospect search → note checklist) ─────────────────────────────

interface NotePanelProps {
  onGenerate: (noteIds: string[]) => void;
  onClose:    () => void;
  generating: boolean;
}

function NotePanel({ onGenerate, onClose, generating }: NotePanelProps) {
  const dispatch        = useAppDispatch();
  const notesByProspect = useAppSelector(s => s.notes.byProspect);
  const notesLoading    = useAppSelector(s => s.notes.loading);

  const [selectedProspect, setSelectedProspect] = useState<{ id: string; label: string } | null>(null);
  const [checkedIds, setCheckedIds]             = useState<Set<string>>(new Set());
  const [rawSearch, setRawSearch]               = useState('');
  const [search, setSearch]                     = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 400);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const { items: prospects, loading: prospectsLoading } = useInfiniteProspects({ search, status: '', sector: '' });

  function selectProspect(p: ApiProspect) {
    setSelectedProspect({ id: p.id, label: p.company_name || p.lead_name });
    setCheckedIds(new Set());
    dispatch(fetchNotes(p.id));
  }

  function toggleNote(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const notes        = selectedProspect ? (notesByProspect[selectedProspect.id] ?? []) : [];
  const loadingNotes = selectedProspect ? !!notesLoading[selectedProspect.id] : false;

  return (
    <div className="flex-shrink-0 border-b border-[var(--bd-def)] bg-[#F8F7FF] px-4 py-3 flex flex-col gap-2.5">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedProspect && (
            <button
              onClick={() => { setSelectedProspect(null); setCheckedIds(new Set()); }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#E0DBF5] transition-colors"
            >
              <ArrowLeftIcon size={11} className="text-[#6C4CE0]" />
            </button>
          )}
          <p className="text-[12px] font-semibold text-[#6C4CE0]">
            {selectedProspect ? selectedProspect.label : 'Combiner avec des notes existantes'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#E0DBF5] transition-colors"
        >
          <XIcon size={11} className="text-[#6C4CE0]" />
        </button>
      </div>

      {/* Step 1: prospect search */}
      {!selectedProspect && (
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <MagnifyingGlassIcon
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
            />
            <input
              type="text"
              value={rawSearch}
              onChange={e => setRawSearch(e.target.value)}
              placeholder="Rechercher un prospect…"
              autoFocus
              className="w-full h-7 pl-7 pr-3 rounded-[7px] border border-[var(--bd-def)] bg-white text-[12px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)] focus:outline-none focus:border-[#6C4CE0] transition-colors"
            />
          </div>
          <div className="overflow-y-auto flex flex-col gap-1 max-h-[180px] pr-0.5">
            {prospectsLoading && prospects.length === 0 ? (
              <div className="flex items-center justify-center py-4 text-[var(--tx-3)]">
                <CircleNotchIcon size={14} className="animate-spin" />
              </div>
            ) : prospects.length === 0 ? (
              <p className="text-center text-[11px] text-[var(--tx-3)] py-3">Aucun prospect trouvé</p>
            ) : (
              prospects.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProspect(p)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] border border-[var(--bd-def)] bg-white hover:border-[#6C4CE0] hover:bg-[#F3F0FF] transition-all text-left"
                >
                  <div
                    className="w-6 h-6 rounded-[6px] flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: hashColor(p.id) }}
                  >
                    {toInitials(p.company_name)}
                  </div>
                  <p className="text-[12px] font-medium text-[var(--tx-1)] truncate flex-1">
                    {p.company_name || p.lead_name}
                  </p>
                  {p.contact_name && (
                    <p className="text-[11px] text-[var(--tx-3)] flex-shrink-0 hidden sm:block">{p.contact_name}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 2: notes checklist */}
      {selectedProspect && (
        <div className="flex flex-col gap-2">
          <div className="overflow-y-auto flex flex-col gap-1 max-h-[160px] pr-0.5">
            {loadingNotes ? (
              <div className="flex items-center justify-center py-4 text-[var(--tx-3)]">
                <CircleNotchIcon size={14} className="animate-spin" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-center text-[11px] text-[var(--tx-3)] py-3">Aucune note pour ce prospect</p>
            ) : (
              notes.map(note => (
                <label
                  key={note.id}
                  className="flex items-start gap-2 px-2.5 py-1.5 rounded-[8px] border bg-white cursor-pointer transition-colors hover:bg-[#F3F0FF]"
                  style={{ borderColor: checkedIds.has(note.id) ? '#6C4CE0' : 'var(--bd-def)' }}
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(note.id)}
                    onChange={() => toggleNote(note.id)}
                    className="mt-[2px] accent-[#6C4CE0] flex-shrink-0"
                  />
                  <p className="text-[11.5px] text-[var(--tx-1)] line-clamp-2 flex-1 leading-relaxed">
                    {note.content}
                  </p>
                </label>
              ))
            )}
          </div>
          <button
            onClick={() => { onGenerate(Array.from(checkedIds)); onClose(); }}
            disabled={generating || loadingNotes}
            className="flex items-center justify-center gap-1.5 w-full py-[7px] rounded-[8px] bg-[#6C4CE0] hover:bg-[#5B3CC4] text-white text-[12px] font-bold transition-colors disabled:opacity-60"
          >
            <PlusIcon size={11} weight="bold" />
            {checkedIds.size > 0
              ? `Générer avec ${checkedIds.size} note${checkedIds.size > 1 ? 's' : ''}`
              : 'Générer sans notes supplémentaires'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Thread ─────────────────────────────────────────────────────────────────────

export interface ThreadProps {
  conv:            WaConversation;
  messages:        WaMessage[];
  loadingMessages: boolean;
  sending:         boolean;
  sendError:       string | null;
  generatingCr:    boolean;
  crError:         string | null;
  transcriptions:  Record<string, string>;
  transcribing:    Record<string, boolean>;
  onClose:          () => void;
  onSend:           (text: string, file?: File) => void;
  onGenerateCr:     (extraNoteIds?: string[]) => void;
  onTranscribe:     (messageId: string, mediaUrl: string) => void;
  onTranscribeFile: (file: File) => Promise<string>;
}

export function Thread({
  conv, messages, loadingMessages,
  sending, sendError,
  generatingCr, crError,
  transcriptions, transcribing,
  onClose, onSend, onGenerateCr, onTranscribe, onTranscribeFile,
}: ThreadProps) {
  const scrollRef      = useRef<HTMLDivElement>(null);
  const prevGenerating = useRef(false);
  const [crSuccess,    setCrSuccess]    = useState(false);
  const [mediaViewer,  setMediaViewer]  = useState<MediaViewerItem | null>(null);
  const [showNotePanel, setShowNotePanel] = useState(false);

  const name     = convName(conv);
  const color    = colorFromId(conv.id);
  // Exclure les réactions (message_type = 'reaction') — non affichables sans emoji mappé
  const rendered = messages.filter(m => m.message_type !== 'reaction');
  const both     = hasBothSides(rendered);

  useEffect(() => {
    if (prevGenerating.current && !generatingCr && !crError) {
      setCrSuccess(true);
      const t = setTimeout(() => setCrSuccess(false), 3500);
      return () => clearTimeout(t);
    }
    prevGenerating.current = generatingCr;
  }, [generatingCr, crError]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {mediaViewer && (
        <MediaViewer item={mediaViewer} onClose={() => setMediaViewer(null)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-[11px] border-b border-[var(--bd-def)] flex-shrink-0 bg-white">
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
          style={{ background: color }}
        >
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[var(--tx-1)] leading-tight">{name}</p>
          <p className="text-[11px] text-[var(--tx-3)]">{conv.display_phone_number} · WhatsApp</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Générer CR — split button */}
            {!crSuccess && (
              <div className={cn(
                'flex items-stretch rounded-[9px] overflow-hidden border transition-all',
                both && !generatingCr
                  ? 'border-[#6C4CE0]'
                  : 'border-[var(--bd-def)]',
              )}>
                {/* Main action */}
                <button
                  onClick={() => {
                    if (!both || generatingCr) return;
                    onGenerateCr();
                    setShowNotePanel(false);
                  }}
                  disabled={!both || generatingCr}
                  title={!both ? 'Disponible dès que le prospect a répondu.' : undefined}
                  className={cn(
                    'flex items-center gap-2 px-3 py-[7px] text-[12.5px] font-bold transition-all select-none',
                    both && !generatingCr
                      ? 'bg-[#6C4CE0] text-white hover:bg-[#5B3CC4] active:scale-[0.98]'
                      : 'bg-[var(--bg-sink)] text-[var(--tx-3)] cursor-default',
                  )}
                >
                  <span className={cn(
                    'w-[20px] h-[20px] rounded-[6px] flex items-center justify-center flex-shrink-0',
                    both ? 'bg-white/20' : 'bg-[var(--bd-def)]',
                  )}>
                    {generatingCr
                      ? <SpinnerGapIcon size={11} className="animate-spin text-white" />
                      : <span className={both ? 'text-white' : 'text-[var(--tx-3)]'}><CrDocIcon /></span>
                    }
                  </span>
                  {generatingCr ? 'Génération…' : 'Générer un CR'}
                </button>
                {/* Dropdown — ajouter des notes */}
                <button
                  onClick={() => both && !generatingCr && setShowNotePanel(v => !v)}
                  disabled={!both || generatingCr}
                  title="Combiner avec des notes existantes"
                  className={cn(
                    'flex items-center px-2 border-l transition-all',
                    both && !generatingCr
                      ? 'border-[#5B3CC4] bg-[#6C4CE0] text-white hover:bg-[#5B3CC4]'
                      : 'border-[var(--bd-def)] bg-[var(--bg-sink)] text-[var(--tx-3)] cursor-default',
                  )}
                >
                  <CaretDownIcon
                    size={11}
                    weight="bold"
                    className={cn('transition-transform', showNotePanel && 'rotate-180')}
                  />
                </button>
              </div>
            )}
            {crSuccess && (
              <div className="flex items-center gap-2 px-3 py-[7px] rounded-[9px] bg-[#1B6B45] text-white text-[12.5px] font-bold">
                <span className="w-[20px] h-[20px] rounded-[6px] flex items-center justify-center bg-white/20">
                  <CheckIcon size={11} weight="bold" />
                </span>
                CR généré ✓
              </div>
            )}

            {/* Fermer la discussion */}
            <button
              onClick={onClose}
              title="Fermer la discussion"
              className="w-8 h-8 border border-[var(--bd-def)] rounded-[8px] flex items-center justify-center hover:bg-[var(--bg-sink)] transition-colors"
            >
              <XIcon size={14} weight="bold" className="text-[var(--tx-2)]" />
            </button>
          </div>
          {crError && (
            <p className="text-[10.5px] text-error text-right pr-1">{crError}</p>
          )}
        </div>
      </div>

      {/* ── Panel notes (optionnel) ── */}
      {showNotePanel && (
        <NotePanel
          onGenerate={ids => onGenerateCr(ids.length ? ids : undefined)}
          onClose={() => setShowNotePanel(false)}
          generating={generatingCr}
        />
      )}

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-3 bg-white">
        {loadingMessages ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex gap-2 max-w-[60%]', i % 2 === 0 ? 'self-end flex-row-reverse' : 'self-start')}>
                <div className="w-[26px] h-[26px] rounded-full bg-[var(--bd-def)] flex-shrink-0 animate-pulse" />
                <div className="flex flex-col gap-1">
                  <div className={cn('h-10 rounded-[14px] bg-[var(--bd-def)] animate-pulse', i % 2 === 0 ? 'w-40' : 'w-52')} />
                  <div className="h-2 w-8 bg-[var(--bd-def)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : rendered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-sink)] flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="w-6 h-6 stroke-[var(--tx-3)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-3 3v-3Z" />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[var(--tx-2)]">Aucun message pour l&apos;instant</p>
            <p className="text-[12px] text-[var(--tx-3)] mt-1">Écrivez le premier message à {name.split(' ')[0]}.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-[var(--bd-def)]" />
              <span className="text-[11px] font-semibold text-[var(--tx-3)] whitespace-nowrap">Conversation</span>
              <div className="flex-1 h-px bg-[var(--bd-def)]" />
            </div>
            {rendered.map(m => (
              <MsgBubble
                key={m.id}
                msg={m}
                contactName={name}
                contactColor={color}
                transcription={transcriptions[m.id]}
                transcribing={!!transcribing[m.id]}
                onTranscribe={onTranscribe}
                onMediaClick={setMediaViewer}
              />
            ))}
            {both && (
              <div className="self-center flex items-center gap-1.5 text-[11px] font-semibold text-[#1B6B45] bg-[#E6F3EC] px-3 py-[5px] rounded-full mt-1">
                <CheckIcon size={12} weight="bold" />
                Conversation engagée des deux côtés · CR disponible
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Composer ── */}
      <Composer
        key={conv.id}
        convFirstName={name.split(' ')[0]}
        sending={sending}
        sendError={sendError}
        onSend={onSend}
        onTranscribeFile={onTranscribeFile}
      />
    </div>
  );
}
