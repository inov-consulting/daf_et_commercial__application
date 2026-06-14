'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, TrashIcon, ChatCenteredTextIcon } from '@phosphor-icons/react';
import { GetData, PostData, DeleteData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { type ProspectNote, type NotesListResponse } from '@/types/prospect_note_type';
import { Button } from '@/components/ui/button';

interface ProspectNotesSectionProps {
  prospectId: string;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProspectNotesSection({ prospectId }: ProspectNotesSectionProps) {
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const res = await GetData<NotesListResponse>({
      url: ApiRoutes.PROSPECT_NOTES(prospectId),
      protected: true,
    });
    if (res.ok && res.data) setNotes(res.data.items);
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function addNote() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await PostData<ProspectNote, { content: string }>({
      url: ApiRoutes.PROSPECT_NOTES(prospectId),
      data: { content: newContent.trim() },
      protected: true,
    });
    if (res.ok && res.data) {
      setNotes(prev => [res.data!, ...prev]);
      setNewContent('');
    } else {
      setError(res.error ?? 'Erreur lors de l\'ajout de la note');
    }
    setSubmitting(false);
  }

  async function deleteNote(noteId: string) {
    setDeletingId(noteId);
    const res = await DeleteData({
      url: ApiRoutes.PROSPECT_NOTE_DELETE(prospectId, noteId),
      protected: true,
    });
    if (res.ok) setNotes(prev => prev.filter(n => n.id !== noteId));
    setDeletingId(null);
  }

  return (
    <div className="bg-[var(--bg-surf)] border border-[var(--bd-def)] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[var(--bd-def)]">
        <ChatCenteredTextIcon size={15} className="text-[var(--p500)]" />
        <h2 className="text-[13px] font-semibold text-[var(--tx-1)]">Notes de prospection</h2>
        {!loading && (
          <span className="ml-auto text-[11px] text-[var(--tx-3)] font-mono bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded px-1.5 py-0.5">
            {notes.length}
          </span>
        )}
      </div>

      {/* Add note form */}
      <div className="p-4 border-b border-[var(--bd-def)] bg-[var(--bg-sink)]">
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
          placeholder="Ajouter une note… (Ctrl+Entrée pour enregistrer)"
          rows={3}
          className="w-full rounded-lg border border-[var(--bd-def)] bg-[var(--bg-surf)] text-[13px] text-[var(--tx-1)] px-3 py-2.5 resize-none outline-none transition-colors focus:border-[var(--p500)] focus:ring-2 focus:ring-[rgba(27,107,69,0.12)] placeholder:text-[var(--tx-3)]"
        />
        {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
        <div className="flex justify-end mt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={addNote}
            disabled={!newContent.trim() || submitting}
          >
            <PlusIcon size={13} />
            {submitting ? 'Envoi…' : 'Ajouter'}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <div className="divide-y divide-[var(--bd-def)]">
        {loading ? (
          <div className="py-8 text-center text-[12px] text-[var(--tx-3)]">Chargement…</div>
        ) : notes.length === 0 ? (
          <div className="py-10 text-center">
            <ChatCenteredTextIcon size={28} className="text-[var(--tx-3)] mx-auto mb-2 opacity-50" />
            <p className="text-[12px] text-[var(--tx-3)]">Aucune note pour ce prospect.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="group px-5 py-4 hover:bg-[var(--bg-sink)] transition-colors">
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                  style={{ background: 'var(--grad)' }}
                >
                  {note.author_id.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[var(--tx-1)] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[11px] text-[var(--tx-3)] mt-1">{timeAgo(note.created_at)}</p>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  disabled={deletingId === note.id}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-[var(--tx-3)] hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 mt-0.5"
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
