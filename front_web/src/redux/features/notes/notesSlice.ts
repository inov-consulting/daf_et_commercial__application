import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PostData, DeleteData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ProspectNote, NotesListResponse } from '@/types/prospect_note_type';

// ── State ──────────────────────────────────────────────────────────────────

interface NotesState {
  /** Notes par prospect : prospectId → ProspectNote[] */
  byProspect: Record<string, ProspectNote[]>;
  /** Chargement initial par prospect */
  loading: Record<string, boolean>;
  /** Erreur de chargement par prospect */
  error: Record<string, string | null>;
  /** Ajout en cours */
  submitting: boolean;
  submitError: string | null;
}

const initialState: NotesState = {
  byProspect: {},
  loading: {},
  error: {},
  submitting: false,
  submitError: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchNotes = createAsyncThunk(
  'notes/fetch',
  async (prospectId: string, { rejectWithValue }) => {
    const res = await GetData<NotesListResponse>({
      url: ApiRoutes.PROSPECT_NOTES(prospectId),
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les notes');
    return { prospectId, items: res.data!.items };
  },
  {
    // Évite les appels dupliqués : on ne re-fetche pas si déjà chargé ou en cours
    condition: (prospectId, { getState }) => {
      const state = getState() as { notes: NotesState };
      return (
        !state.notes.loading[prospectId] &&
        state.notes.byProspect[prospectId] === undefined
      );
    },
  },
);

export const addNote = createAsyncThunk(
  'notes/add',
  async (
    { prospectId, content }: { prospectId: string; content: string },
    { rejectWithValue },
  ) => {
    const res = await PostData<ProspectNote, { content: string }>({
      url: ApiRoutes.PROSPECT_NOTES(prospectId),
      data: { content },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Erreur lors de l'ajout de la note");
    return { prospectId, note: res.data! };
  },
);

export const deleteNote = createAsyncThunk(
  'notes/delete',
  async (
    { prospectId, noteId }: { prospectId: string; noteId: string },
    { rejectWithValue },
  ) => {
    const res = await DeleteData({
      url: ApiRoutes.PROSPECT_NOTE_DELETE(prospectId, noteId),
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la suppression');
    return { prospectId, noteId };
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    clearSubmitError(state) {
      state.submitError = null;
    },
    /** Invalide le cache d'un prospect pour forcer un re-fetch au prochain mount */
    invalidateNotes(state, action: { payload: string }) {
      delete state.byProspect[action.payload];
    },
  },
  extraReducers(builder) {
    builder
      // ── fetchNotes ──────────────────────────────────────────────────────
      .addCase(fetchNotes.pending, (state, action) => {
        state.loading[action.meta.arg] = true;
        state.error[action.meta.arg] = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        const { prospectId, items } = action.payload;
        state.loading[prospectId] = false;
        state.byProspect[prospectId] = items;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        if (action.meta.condition === false) return; // annulé par condition, pas une erreur
        state.loading[action.meta.arg] = false;
        state.error[action.meta.arg] = action.payload as string;
      })

      // ── addNote ────────────────────────────────────────────────────────
      .addCase(addNote.pending, state => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.submitting = false;
        const { prospectId, note } = action.payload;
        if (!state.byProspect[prospectId]) state.byProspect[prospectId] = [];
        state.byProspect[prospectId].unshift(note);
      })
      .addCase(addNote.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload as string;
      })

      // ── deleteNote ─────────────────────────────────────────────────────
      .addCase(deleteNote.fulfilled, (state, action) => {
        const { prospectId, noteId } = action.payload;
        const list = state.byProspect[prospectId];
        if (list) state.byProspect[prospectId] = list.filter(n => n.id !== noteId);
      });
  },
});

export const { clearSubmitError, invalidateNotes } = notesSlice.actions;
export default notesSlice.reducer;
