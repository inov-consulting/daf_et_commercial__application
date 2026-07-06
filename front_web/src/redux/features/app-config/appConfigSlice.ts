import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GetData, PatchData, PutData, DeleteData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { AppConfig, KpiDefinition, KpiGroupConfig } from '@/types/app_config_type';


interface AppConfigState {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  kpiAvailable: KpiDefinition[];
  kpiGroups: KpiGroupConfig[];
  kpiLoading: boolean;
  kpiError: string | null;
}

const initialState: AppConfigState = {
  config: null,
  loading: false,
  error: null,
  saving: false,
  saveError: null,
  kpiAvailable: [],
  kpiGroups: [],
  kpiLoading: false,
  kpiError: null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchAppConfig = createAsyncThunk(
  'appConfig/fetch',
  async (_, { rejectWithValue }) => {
    const res = await GetData<AppConfig>({ url: ApiRoutes.CONFIG_APP, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger la configuration');
    return res.data!;
  },
);

export const updateValidators = createAsyncThunk(
  'appConfig/updateValidators',
  async (
    payload: { offer_validator_user_id: string | null; cr_validator_user_id: string | null },
    { rejectWithValue },
  ) => {
    const res = await PatchData<AppConfig, { validators: typeof payload }>({
      url: ApiRoutes.CONFIG_APP_VALIDATORS,
      data: { validators: payload },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la mise à jour des validateurs');
    return res.data!;
  },
);

export const updateSmtp = createAsyncThunk(
  'appConfig/updateSmtp',
  async (smtp: AppConfig['smtp'], { rejectWithValue }) => {
    const res = await PatchData<AppConfig, { smtp: AppConfig['smtp'] }>({
      url: ApiRoutes.CONFIG_APP_SMTP,
      data: { smtp },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la mise à jour SMTP');
    return res.data!;
  },
);

export const fetchKpiAvailable = createAsyncThunk(
  'appConfig/fetchKpiAvailable',
  async (_, { rejectWithValue }) => {
    const res = await GetData<KpiDefinition[]>({ url: ApiRoutes.CONFIG_KPI_AVAILABLE, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les KPIs disponibles');
    return res.data!;
  },
);

export const fetchKpiGroups = createAsyncThunk(
  'appConfig/fetchKpiGroups',
  async (_, { rejectWithValue }) => {
    const res = await GetData<KpiGroupConfig[]>({ url: ApiRoutes.CONFIG_KPI_GROUPS, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les groupes KPI');
    return res.data!;
  },
);

export const setGroupKpiAccess = createAsyncThunk(
  'appConfig/setGroupKpiAccess',
  async (
    payload: { group_id: string; group_name: string; kpi_keys: string[] },
    { rejectWithValue },
  ) => {
    const { group_id, ...body } = payload;
    const res = await PutData<KpiGroupConfig, Omit<typeof payload, 'group_id'>>({
      url: ApiRoutes.CONFIG_KPI_GROUP(group_id),
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la mise à jour du groupe KPI');
    return res.data!;
  },
);

export const deleteGroupKpiAccess = createAsyncThunk(
  'appConfig/deleteGroupKpiAccess',
  async (groupId: string, { rejectWithValue }) => {
    const res = await DeleteData({ url: ApiRoutes.CONFIG_KPI_GROUP(groupId), protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la suppression du groupe KPI');
    return groupId;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────

const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    clearSaveError(state) {
      state.saveError = null;
    },
  },
  extraReducers(builder) {
    builder
      // fetchAppConfig
      .addCase(fetchAppConfig.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchAppConfig.fulfilled, (state, action: PayloadAction<AppConfig>) => {
        state.loading = false;
        state.config = action.payload;
      })
      .addCase(fetchAppConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateValidators
      .addCase(updateValidators.pending, state => { state.saving = true; state.saveError = null; })
      .addCase(updateValidators.fulfilled, (state, action: PayloadAction<AppConfig>) => {
        state.saving = false;
        state.config = action.payload;
      })
      .addCase(updateValidators.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload as string;
      })
      // updateSmtp
      .addCase(updateSmtp.pending, state => { state.saving = true; state.saveError = null; })
      .addCase(updateSmtp.fulfilled, (state, action: PayloadAction<AppConfig>) => {
        state.saving = false;
        state.config = action.payload;
      })
      .addCase(updateSmtp.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload as string;
      })
      // fetchKpiAvailable
      .addCase(fetchKpiAvailable.pending, state => { state.kpiLoading = true; state.kpiError = null; })
      .addCase(fetchKpiAvailable.fulfilled, (state, action: PayloadAction<KpiDefinition[]>) => {
        state.kpiLoading = false;
        state.kpiAvailable = action.payload;
      })
      .addCase(fetchKpiAvailable.rejected, (state, action) => {
        state.kpiLoading = false;
        state.kpiError = action.payload as string;
      })
      // fetchKpiGroups
      .addCase(fetchKpiGroups.pending, state => { state.kpiLoading = true; })
      .addCase(fetchKpiGroups.fulfilled, (state, action: PayloadAction<KpiGroupConfig[]>) => {
        state.kpiLoading = false;
        state.kpiGroups = action.payload;
      })
      .addCase(fetchKpiGroups.rejected, (state, action) => {
        state.kpiLoading = false;
        state.kpiError = action.payload as string;
      })
      // setGroupKpiAccess
      .addCase(setGroupKpiAccess.fulfilled, (state, action: PayloadAction<KpiGroupConfig>) => {
        const idx = state.kpiGroups.findIndex(g => g.group_id === action.payload.group_id);
        if (idx !== -1) state.kpiGroups[idx] = action.payload;
        else state.kpiGroups.push(action.payload);
      })
      // deleteGroupKpiAccess
      .addCase(deleteGroupKpiAccess.fulfilled, (state, action: PayloadAction<string>) => {
        state.kpiGroups = state.kpiGroups.filter(g => g.group_id !== action.payload);
      });
  },
});

export const { clearSaveError } = appConfigSlice.actions;
export default appConfigSlice.reducer;
