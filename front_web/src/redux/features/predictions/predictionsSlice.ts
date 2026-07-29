import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiPrediction {
  id: string;
  partner_id: number;
  partner_name: string;
  prediction_summary: string;
  suggested_action: string;
  opportunity_type: string;
  confidence_score: number;
  predicted_revenue: number;
  data_sources: Record<string, unknown>;
  status: string;
  validated_by: string | null;
  validated_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  prospect_id: string | null;
  odoo_lead_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ValidateResponse {
  prediction_id: string;
  status: string;
  prospect_id: string | null;
  odoo_lead_id: number | null;
  message: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface PredictionsState {
  items: ApiPrediction[];
  loading: boolean;
  error: string | null;
  actionLoading: Record<string, boolean>;
  actionError: Record<string, string>;
}

const initialState: PredictionsState = {
  items: [],
  loading: false,
  error: null,
  actionLoading: {},
  actionError: {},
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const fetchPredictions = createAsyncThunk(
  'predictions/fetchList',
  async (
    params: { status?: string; limit?: number; offset?: number } = {},
    { rejectWithValue },
  ) => {
    const qp = new URLSearchParams();
    if (params.status) qp.set('status', params.status);
    qp.set('limit', String(params.limit ?? 50));
    qp.set('offset', String(params.offset ?? 0));
    const url = `${ApiRoutes.PREDICTIONS_LIST}?${qp.toString()}`;
    const res = await GetData<ApiPrediction[]>({ url, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les prédictions');
    return res.data!;
  },
);

export const validatePrediction = createAsyncThunk(
  'predictions/validate',
  async (
    { id, expected_revenue, notes }: { id: string; expected_revenue: number; notes: string },
    { rejectWithValue },
  ) => {
    const res = await PostData<ValidateResponse>({
      url: ApiRoutes.PREDICTIONS_VALIDATE(id),
      data: { expected_revenue, notes },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de valider la prédiction');
    return { id, response: res.data! };
  },
);

export const rejectPrediction = createAsyncThunk(
  'predictions/reject',
  async (
    { id, reason }: { id: string; reason: string },
    { rejectWithValue },
  ) => {
    const res = await PostData<ApiPrediction>({
      url: ApiRoutes.PREDICTIONS_REJECT(id),
      data: { reason },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de rejeter la prédiction');
    return res.data!;
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const predictionsSlice = createSlice({
  name: 'predictions',
  initialState,
  reducers: {
    clearActionError(state, action: { payload: string }) {
      delete state.actionError[action.payload];
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchPredictions.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPredictions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPredictions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(validatePrediction.pending, (state, action) => {
        state.actionLoading[action.meta.arg.id] = true;
        delete state.actionError[action.meta.arg.id];
      })
      .addCase(validatePrediction.fulfilled, (state, action) => {
        const { id, response } = action.payload;
        delete state.actionLoading[id];
        const item = state.items.find(p => p.id === id);
        if (item) {
          item.status = response.status;
          item.prospect_id = response.prospect_id ?? null;
          item.odoo_lead_id = response.odoo_lead_id ?? null;
        }
      })
      .addCase(validatePrediction.rejected, (state, action) => {
        const id = action.meta.arg.id;
        delete state.actionLoading[id];
        state.actionError[id] = action.payload as string;
      })

      .addCase(rejectPrediction.pending, (state, action) => {
        state.actionLoading[action.meta.arg.id] = true;
        delete state.actionError[action.meta.arg.id];
      })
      .addCase(rejectPrediction.fulfilled, (state, action) => {
        const id = action.payload.id;
        delete state.actionLoading[id];
        const idx = state.items.findIndex(p => p.id === id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(rejectPrediction.rejected, (state, action) => {
        const id = action.meta.arg.id;
        delete state.actionLoading[id];
        state.actionError[id] = action.payload as string;
      });
  },
});

export const { clearActionError } = predictionsSlice.actions;
export default predictionsSlice.reducer;
