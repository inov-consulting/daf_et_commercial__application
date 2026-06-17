import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  type ApiLog,
  type ApiLogsResponse,
  type ApiLogDetails,
  type ApiLogsFilters,
  DEFAULT_LOGS_FILTERS,
} from '@/types/api_log_type';

interface ApiLogsState {
  items: ApiLog[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: ApiLogsFilters;
  details: Record<string, ApiLogDetails>;
  detailsLoading: Record<string, boolean>;
}

const initialState: ApiLogsState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  filters: DEFAULT_LOGS_FILTERS,
  details: {},
  detailsLoading: {},
};

export const fetchApiLogs = createAsyncThunk(
  'apiLogs/fetch',
  async (filters: ApiLogsFilters, { rejectWithValue }) => {
    const params = new URLSearchParams();
    if (filters.method)                  params.set('method', filters.method);
    if (filters.path)                    params.set('path', filters.path);
    if (filters.status_code)             params.set('status_code', filters.status_code);
    if (filters.is_error !== null)       params.set('is_error', String(filters.is_error));
    if (filters.date_from)               params.set('date_from', new Date(filters.date_from).toISOString());
    if (filters.date_to)                 params.set('date_to', new Date(filters.date_to).toISOString());
    params.set('limit',  String(filters.limit));
    params.set('offset', String(filters.offset));

    const res = await GetData<ApiLogsResponse>({
      url: `${ApiRoutes.API_LOGS}?${params.toString()}`,
      protected: true,
    });
    if (!res.ok || !res.data) return rejectWithValue(res.error ?? 'Erreur chargement logs');
    return res.data;
  },
);

export const fetchApiLogDetails = createAsyncThunk(
  'apiLogs/fetchDetails',
  async (logId: string, { rejectWithValue, getState }) => {
    const state = getState() as { apiLogs: ApiLogsState };
    if (state.apiLogs.details[logId] !== undefined) return { logId, details: state.apiLogs.details[logId] };

    const res = await GetData<ApiLogDetails>({
      url: ApiRoutes.API_LOG_DETAILS(logId),
      protected: true,
    });
    if (!res.ok || !res.data) return rejectWithValue(res.error ?? 'Erreur chargement détails');
    return { logId, details: res.data };
  },
);

const apiLogsSlice = createSlice({
  name: 'apiLogs',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Partial<ApiLogsFilters>>) {
      state.filters = { ...state.filters, ...action.payload, offset: 0 };
    },
    setOffset(state, action: PayloadAction<number>) {
      state.filters = { ...state.filters, offset: action.payload };
    },
    resetFilters(state) {
      state.filters = DEFAULT_LOGS_FILTERS;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchApiLogs.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApiLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.items   = action.payload.items;
        state.total   = action.payload.total;
      })
      .addCase(fetchApiLogs.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload as string;
      })
      .addCase(fetchApiLogDetails.pending, (state, action) => {
        state.detailsLoading[action.meta.arg] = true;
      })
      .addCase(fetchApiLogDetails.fulfilled, (state, action) => {
        state.detailsLoading[action.payload.logId] = false;
        state.details[action.payload.logId]        = action.payload.details;
      })
      .addCase(fetchApiLogDetails.rejected, (state, action) => {
        state.detailsLoading[action.meta.arg] = false;
      });
  },
});

export const { setFilters, setOffset, resetFilters } = apiLogsSlice.actions;
export default apiLogsSlice.reducer;
