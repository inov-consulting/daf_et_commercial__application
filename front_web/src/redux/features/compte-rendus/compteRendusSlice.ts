import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type GlobalCR,
  type GlobalCRDetail,
  type GlobalCRListResponse,
} from '@/types/prospect_note_type';

interface CompteRendusState {
  items: GlobalCR[];
  total: number;
  loading: boolean;
  error: string | null;
  parentType: string;
  limit: number;
  offset: number;
  detail: Record<string, GlobalCRDetail>;
  detailLoading: Record<string, boolean>;
}

const initialState: CompteRendusState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  parentType: '',
  limit: 100,
  offset: 0,
  detail: {},
  detailLoading: {},
};

export const fetchCompteRendus = createAsyncThunk(
  'compteRendus/fetch',
  async (
    { parentType, limit, offset }: { parentType?: string; limit?: number; offset?: number },
    { rejectWithValue },
  ) => {
    const params = new URLSearchParams();
    if (parentType) params.set('parent_type', parentType);
    params.set('limit',  String(limit  ?? 100));
    params.set('offset', String(offset ?? 0));

    const res = await GetData<GlobalCRListResponse>({
      url: `${ApiRoutes.COMPTE_RENDUS}?${params.toString()}`,
      protected: true,
    });
    if (!res.ok || !res.data) return rejectWithValue(res.error ?? 'Erreur chargement CRs');
    return res.data;
  },
);

export const fetchCompteRenduDetail = createAsyncThunk(
  'compteRendus/fetchDetail',
  async (crId: string, { rejectWithValue, getState }) => {
    const state = getState() as { compteRendus: CompteRendusState };
    if (state.compteRendus.detail[crId] !== undefined)
      return { crId, detail: state.compteRendus.detail[crId] };

    const res = await GetData<GlobalCRDetail>({
      url: ApiRoutes.COMPTE_RENDU_DETAIL(crId),
      protected: true,
    });
    if (!res.ok || !res.data) return rejectWithValue(res.error ?? 'Erreur chargement détail CR');
    return { crId, detail: res.data };
  },
);

const compteRendusSlice = createSlice({
  name: 'compteRendus',
  initialState,
  reducers: {
    setParentType(state, action: PayloadAction<string>) {
      state.parentType = action.payload;
      state.offset     = 0;
    },
    setOffset(state, action: PayloadAction<number>) {
      state.offset = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCompteRendus.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchCompteRendus.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload.items;
        state.total   = action.payload.total;
      })
      .addCase(fetchCompteRendus.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload as string;
      })
      .addCase(fetchCompteRenduDetail.pending, (state, action) => {
        state.detailLoading[action.meta.arg] = true;
      })
      .addCase(fetchCompteRenduDetail.fulfilled, (state, action) => {
        state.detailLoading[action.payload.crId] = false;
        state.detail[action.payload.crId]        = action.payload.detail;
      })
      .addCase(fetchCompteRenduDetail.rejected, (state, action) => {
        state.detailLoading[action.meta.arg] = false;
      });
  },
});

export const { setParentType, setOffset } = compteRendusSlice.actions;
export default compteRendusSlice.reducer;
