import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ApiCompany } from '@/types/company_type';

const PAGE_SIZE = 20;

// ── State ──────────────────────────────────────────────────────────────────

interface CompaniesState {
  items: ApiCompany[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: CompaniesState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  hasMore: true,
};

// ── Types ──────────────────────────────────────────────────────────────────

type ListResponse = {
  items: ApiCompany[];
  limit: number;
  offset: number;
  count: number;
};

type FetchCompaniesParams = {
  offset?: number;
  search?: string;
  limit?: number;
};

// ── Thunk ──────────────────────────────────────────────────────────────────

export const fetchCompanies = createAsyncThunk(
  'companies/fetch',
  async (params: FetchCompaniesParams, { rejectWithValue }) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(params.limit ?? PAGE_SIZE));
    qs.set('offset', String(params.offset ?? 0));
    if (params.search) qs.set('search', params.search);

    const res = await GetData<ListResponse>({
      url: `${ApiRoutes.COMPANY_LIST}?${qs}`,
      protected: true,
    });

    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les entreprises');

    const data = res.data!;
    return {
      items: data.items,
      count: data.count,
      // Si offset > 0, on est en mode "page suivante" → append
      append: (params.offset ?? 0) > 0,
    };
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────

const companiesSlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    resetCompanies(state) {
      state.items = [];
      state.total = 0;
      state.hasMore = true;
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCompanies.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.total = action.payload.count;
        if (action.payload.append) {
          state.items = [...state.items, ...action.payload.items];
        } else {
          state.items = action.payload.items;
        }
        state.hasMore = state.items.length < action.payload.count;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetCompanies } = companiesSlice.actions;
export default companiesSlice.reducer;
