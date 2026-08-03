import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PatchData, PostData, PutData, DeleteData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type {
  ApiProspect, ProspectsListResponse, CreateProspectBody,
  UpdateProspectBody, ProspectStatus,
} from '@/types/prospect_type';

// ── State ──────────────────────────────────────────────────────────────────

interface ProspectsState {
  list: ApiProspect[];
  byStatus: Partial<Record<ProspectStatus, number>>;
  total: number;
  totalPipelineValue: number;
  // fetch
  loading: boolean;
  error: string | null;
  // create
  creating: boolean;
  createError: string | null;
  // update
  updating: boolean;
  updateError: string | null;
  // action (changement de statut)
  actioning: boolean;
  actionError: string | null;
  _actionSnapshot: { id: string; prevStatus: ProspectStatus } | null;
  // delete
  deleting: boolean;
  deleteError: string | null;
  // sync
  syncing: boolean;
  syncError: string | null;
}

const initialState: ProspectsState = {
  list: [],
  byStatus: {},
  total: 0,
  totalPipelineValue: 0,
  loading: false,
  error: null,
  creating: false,
  createError: null,
  updating: false,
  updateError: null,
  actioning: false,
  actionError: null,
  _actionSnapshot: null,
  deleting: false,
  deleteError: null,
  syncing: false,
  syncError: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────

export type FetchProspectsParams = {
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export const fetchProspects = createAsyncThunk(
  'prospects/fetchAll',
  async (params: FetchProspectsParams | void, { rejectWithValue }) => {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.status)     qs.set('status',     p.status);
    if (p.search)     qs.set('search',     p.search);
    if (p.sort_by)    qs.set('sort_by',    p.sort_by);
    if (p.sort_order) qs.set('sort_order', p.sort_order);
    qs.set('limit',  String(p.limit  ?? 20));
    qs.set('offset', String(p.offset ?? 0));

    const res = await GetData<ProspectsListResponse>({
      url: `${ApiRoutes.PROSPECTS_LIST}?${qs}`,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les prospects');
    return res.data!;
  },
);

export const createProspect = createAsyncThunk(
  'prospects/create',
  async (body: CreateProspectBody, { rejectWithValue }) => {
    const res = await PostData<ApiProspect, CreateProspectBody>({
      url: ApiRoutes.PROSPECTS_CREATE,
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la création du prospect');
    return res.data!;
  },
);

export const updateProspect = createAsyncThunk(
  'prospects/update',
  async ({ id, body }: { id: string; body: UpdateProspectBody }, { rejectWithValue }) => {
    const res = await PatchData<ApiProspect, UpdateProspectBody>({
      url: ApiRoutes.PROSPECTS_UPDATE(id),
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la mise à jour');
    return res.data!;
  },
);

// Map action → status pour la mise à jour optimiste
const ACTION_TO_STATUS: Record<string, ProspectStatus> = {
  contact: 'contacte',
  qualify: 'qualifie',
  convert: 'converti',
  lose:    'perdu',
};

export const executeProspectAction = createAsyncThunk(
  'prospects/executeAction',
  async (
    arg: {
      id: string;
      action: 'contact' | 'qualify' | 'convert' | 'lose';
      lost_reason_id?: number;
      custom_reason?: string;
    },
    { rejectWithValue },
  ) => {
    const { id, action, lost_reason_id, custom_reason } = arg;
    const res = await PostData<ApiProspect>({
      url: ApiRoutes.PROSPECTS_ACTION(id),
      data: {
        action,
        ...(lost_reason_id != null ? { lost_reason_id } : {}),
        ...(custom_reason    ? { custom_reason }    : {}),
      },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Erreur lors de l'exécution de l'action");
    return res.data!;
  },
);

export const deleteProspect = createAsyncThunk(
  'prospects/delete',
  async (id: string, { rejectWithValue }) => {
    const res = await DeleteData({ url: ApiRoutes.PROSPECTS_DELETE(id), protected: true });
    if (!res.ok) return rejectWithValue(res.error);
    return id;
  },
);

export const syncProspects = createAsyncThunk(
  'prospects/sync',
  async (fullSync: boolean | void, { rejectWithValue }) => {
    const url = fullSync
      ? `${ApiRoutes.PROSPECTS_SYNC}?full_sync=true`
      : ApiRoutes.PROSPECTS_SYNC;
    const res = await PostData({ url, data: {}, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur de synchronisation Odoo');
    return res.data;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────

const prospectsSlice = createSlice({
  name: 'prospects',
  initialState,
  reducers: {
    reset: () => initialState,
    clearProspectErrors(state) {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.actionError = null;
      state.syncError = null;
    },
  },
  extraReducers(builder) {
    builder

      // ── fetchProspects ──────────────────────────────────────────────────
      .addCase(fetchProspects.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProspects.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.items;
        state.byStatus = action.payload.by_status ?? {};
        state.total = action.payload.total;
        state.totalPipelineValue = action.payload.total_pipeline_value;
      })
      .addCase(fetchProspects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // ── createProspect ─────────────────────────────────────────────────
      .addCase(createProspect.pending, state => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createProspect.fulfilled, (state) => {
        state.creating = false;
        // La page re-fetche après création pour respecter les filtres actifs
      })
      .addCase(createProspect.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload as string;
      })

      // ── updateProspect ─────────────────────────────────────────────────
      .addCase(updateProspect.pending, state => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateProspect.fulfilled, (state, action) => {
        state.updating = false;
        const idx = state.list.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateProspect.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload as string;
      })

      // ── executeProspectAction — mise à jour optimiste + rollback ───────
      .addCase(executeProspectAction.pending, (state, action) => {
        state.actioning = true;
        state.actionError = null;
        const { id, action: act } = action.meta.arg;
        const idx = state.list.findIndex(p => p.id === id);
        if (idx !== -1) {
          state._actionSnapshot = { id, prevStatus: state.list[idx].status };
          const targetStatus = ACTION_TO_STATUS[act];
          if (targetStatus) state.list[idx] = { ...state.list[idx], status: targetStatus };
        }
      })
      .addCase(executeProspectAction.fulfilled, (state, action) => {
        state.actioning = false;
        state._actionSnapshot = null;
        const idx = state.list.findIndex(p => p.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(executeProspectAction.rejected, (state, action) => {
        state.actioning = false;
        state.actionError = action.payload as string;
        // Rollback vers l'ancien statut
        if (state._actionSnapshot) {
          const { id, prevStatus } = state._actionSnapshot;
          const idx = state.list.findIndex(p => p.id === id);
          if (idx !== -1) state.list[idx] = { ...state.list[idx], status: prevStatus };
          state._actionSnapshot = null;
        }
      })

      // ── deleteProspect ─────────────────────────────────────────────────
      .addCase(deleteProspect.pending, state => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteProspect.fulfilled, (state, action) => {
        state.deleting = false;
        state.list = state.list.filter(p => p.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteProspect.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload as string;
      })

      // ── syncProspects ──────────────────────────────────────────────────
      .addCase(syncProspects.pending, state => {
        state.syncing = true;
        state.syncError = null;
      })
      .addCase(syncProspects.fulfilled, state => {
        state.syncing = false;
      })
      .addCase(syncProspects.rejected, (state, action) => {
        state.syncing = false;
        state.syncError = action.payload as string;
      });
  },
});

export const { clearProspectErrors, reset: resetProspects } = prospectsSlice.actions;
export default prospectsSlice.reducer;
