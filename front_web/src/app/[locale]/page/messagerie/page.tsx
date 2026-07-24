'use client';

import { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { convName } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchConversations,
  fetchMessages,
  startConversation,
  replyToConversation,
  generateConvCr,
  setActiveConvId,
} from '@/redux/features/whatsapp/whatsappSlice';

import { ConvItem, ConvSkeleton } from '@/components/messagerie/ConvItem';
import { Thread }                  from '@/components/messagerie/Thread';
import { EmptyThread }             from '@/components/messagerie/EmptyThread';
import { NewConvModal }            from '@/components/messagerie/NewConvModal';

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MessageriePage() {
  const dispatch = useAppDispatch();

  // ── Redux selectors ──
  const conversations   = useAppSelector(s => s.whatsapp.conversations);
  const loading         = useAppSelector(s => s.whatsapp.loading);
  const error           = useAppSelector(s => s.whatsapp.error);
  const activeConvId    = useAppSelector(s => s.whatsapp.activeConvId);
  const messages        = useAppSelector(s => s.whatsapp.messages);
  const loadingMessages = useAppSelector(s => s.whatsapp.loadingMessages);
  const sending         = useAppSelector(s => s.whatsapp.sending);
  const sendError       = useAppSelector(s => s.whatsapp.sendError);
  const starting        = useAppSelector(s => s.whatsapp.starting);
  const startError      = useAppSelector(s => s.whatsapp.startError);
  const generatingCr    = useAppSelector(s => s.whatsapp.generatingCr);
  const crError         = useAppSelector(s => s.whatsapp.crError);

  // ── Local state ──
  const [filter,    setFilter]    = useState<'ouverts' | 'non-lus'>('ouverts');
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  // Initial load
  useEffect(() => { dispatch(fetchConversations()); }, [dispatch]);

  // Fetch messages on conversation select
  useEffect(() => {
    if (!activeConvId) return;
    if (!messages[activeConvId]) {
      dispatch(fetchMessages({ conversationId: activeConvId }));
    }
    setViewedIds(prev => new Set(prev).add(activeConvId));
  }, [activeConvId, dispatch, messages]);

  // ── Derived ──
  const unreadCount = conversations.filter(c => !viewedIds.has(c.id) && c.message_count > 0).length;

  const filtered = conversations.filter(c => {
    if (filter === 'non-lus' && (viewedIds.has(c.id) || c.message_count === 0)) return false;
    if (!search) return true;
    const t = search.toLowerCase();
    const n = convName(c).toLowerCase();
    return n.includes(t) || c.display_phone_number.includes(t);
  });

  const activeConv     = conversations.find(c => c.id === activeConvId) ?? null;
  const activeMessages = activeConvId ? (messages[activeConvId] ?? []) : [];

  // ── Callbacks ──
  const handleSelectConv = useCallback((id: string) => {
    dispatch(setActiveConvId(id));
  }, [dispatch]);

  const handleSend = useCallback((text: string, file?: File) => {
    if (!activeConvId) return;
    dispatch(replyToConversation({ conversationId: activeConvId, text: text || undefined, file }));
  }, [activeConvId, dispatch]);

  const handleStart = useCallback((phone: string, text?: string, contactName?: string) => {
    dispatch(startConversation({ phone, text, contactName }))
      .unwrap()
      .then(() => setShowModal(false))
      .catch(() => { /* error shown in modal via startError */ });
  }, [dispatch]);

  const handleClose = useCallback(() => {
    dispatch(setActiveConvId(null));
  }, [dispatch]);

  const handleGenerateCr = useCallback((extraNoteIds?: string[]) => {
    if (!activeConvId) return;
    dispatch(generateConvCr({ conversationId: activeConvId, extraNoteIds }));
  }, [activeConvId, dispatch]);

  // ── Render ──
  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 flex-shrink-0 border-b border-[var(--bd-def)]">
        <div>
          <h1 className="text-[23px] font-bold text-[var(--tx-1)] tracking-tight leading-tight">Messagerie</h1>
          <p className="text-[12.5px] text-[var(--tx-3)] mt-[3px]">
            Échanges WhatsApp centralisés avec vos prospects et clients
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-[9px] rounded-[10px] text-[13px] font-bold text-white flex-shrink-0 transition-all hover:-translate-y-px active:scale-[0.98]"
          style={{ background: 'var(--grad)' }}
        >
          <PlusIcon size={15} weight="bold" />
          Nouvelle conversation
        </button>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT — conversation list */}
        <div className="w-[312px] flex-shrink-0 border-r border-[var(--bd-def)] flex flex-col min-h-0">
          <div className="px-3 pt-3 pb-2 flex flex-col gap-2.5 flex-shrink-0">
            {/* Search */}
            <div className="flex items-center gap-2 bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-[8px] px-2.5 py-[7px]">
              <MagnifyingGlassIcon size={14} className="text-[var(--tx-3)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un contact…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-[var(--tx-1)] placeholder:text-[var(--tx-3)]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-[var(--bd-def)]"
                >
                  <XIcon size={10} className="text-[var(--tx-3)]" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-0.5">
              {([
                { key: 'ouverts',  label: 'Ouverts' },
                { key: 'non-lus', label: 'Non lus', count: unreadCount },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    'py-1.5 text-[12.5px] font-semibold border-b-2 transition-colors',
                    filter === t.key
                      ? 'text-[var(--tx-1)] border-[var(--p500)]'
                      : 'text-[var(--tx-3)] border-transparent hover:text-[var(--tx-2)]',
                  )}
                >
                  {t.label}
                  {'count' in t && (
                    <span className={cn('ml-1', filter === t.key ? 'text-[var(--p500)]' : 'text-[var(--tx-3)]')}>
                      ({t.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-3">
            {loading && conversations.length === 0 ? (
              <>{[1, 2, 3, 4].map(i => <ConvSkeleton key={i} />)}</>
            ) : error ? (
              <div className="text-center py-10 px-4">
                <p className="text-[13px] font-semibold text-error">Erreur de chargement</p>
                <p className="text-[12px] text-[var(--tx-3)] mt-1">{error}</p>
                <button
                  onClick={() => dispatch(fetchConversations())}
                  className="mt-3 text-[12px] font-semibold text-[var(--p500)] hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-[13px] font-semibold text-[var(--tx-2)]">Aucune conversation</p>
                <p className="text-[12px] text-[var(--tx-3)] mt-1">
                  {search ? 'Essayez un autre filtre.' : 'Démarrez votre première conversation.'}
                </p>
              </div>
            ) : filtered.map(c => (
              <ConvItem
                key={c.id}
                conv={c}
                active={c.id === activeConvId}
                unread={!viewedIds.has(c.id) && c.message_count > 0}
                onClick={() => handleSelectConv(c.id)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — thread or empty state */}
        {activeConv ? (
          <Thread
            key={activeConv.id}
            conv={activeConv}
            messages={activeMessages}
            loadingMessages={loadingMessages}
            sending={sending}
            sendError={sendError}
            generatingCr={generatingCr}
            crError={crError}
            onClose={handleClose}
            onSend={handleSend}
            onGenerateCr={handleGenerateCr}
          />
        ) : (
          <EmptyThread />
        )}
      </div>

      {/* New conversation modal */}
      {mounted && showModal && (
        <NewConvModal
          starting={starting}
          startError={startError}
          onStart={handleStart}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
