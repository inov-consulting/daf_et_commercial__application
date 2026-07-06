import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { KpiItem, KpiCatalogResponse, KpiDetailParams } from '@/types/kpi_type';

// ── State ──────────────────────────────────────────────────────────────────────

interface KpiState {
  // Catalogue complet (tous les KPIs avec chart data en une requête)
  catalog:        KpiItem[];
  catalogLoading: boolean;
  catalogError:   string | null;

  // Items affichés sur la page catalogue (filtrés par date ou = catalog)
  displayed:      KpiItem[];
  filterLoading:  boolean;

  // KPI sélectionné pour la vue détail
  selectedKpi:       KpiItem | null;
  kpiDetailLoading:  boolean;
  kpiDetailError:    string | null;
}

const initialState: KpiState = {
  catalog:          [],
  catalogLoading:   false,
  catalogError:     null,
  displayed:        [],
  filterLoading:    false,
  selectedKpi:      null,
  kpiDetailLoading: false,
  kpiDetailError:   null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

/** GET /api/v1/kpi/catalog — charge tous les KPIs en un appel */
export const fetchKpiCatalog = createAsyncThunk(
  'kpi/fetchCatalog',
  async (_, { rejectWithValue }) => {
    const res = await GetData<KpiCatalogResponse>({
      url: ApiRoutes.KPI_CATALOG,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les KPIs');
    return res.data?.items ?? [];
  },
);

/** GET /api/v1/kpi/{key}?date_from=...&date_to=... — charge le détail d'un KPI */
export const fetchKpiDetail = createAsyncThunk(
  'kpi/fetchDetail',
  async ({ key, date_from, date_to }: KpiDetailParams, { rejectWithValue }) => {
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to)   params.set('date_to',   date_to);
    const qs  = params.toString();
    const url = ApiRoutes.KPI_DETAIL(key) + (qs ? `?${qs}` : '');

    const res = await GetData<KpiItem>({ url, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger le KPI');
    return res.data!;
  },
);

/** Recharge tous les KPIs du catalogue avec un filtre date en parallèle */
export const fetchKpiCatalogWithFilter = createAsyncThunk(
  'kpi/fetchCatalogWithFilter',
  async (
    { keys, date_from, date_to }: { keys: string[]; date_from: string; date_to: string },
    { rejectWithValue },
  ) => {
    const results = await Promise.all(
      keys.map(async key => {
        const params = new URLSearchParams({ date_from, date_to });
        const url = `${ApiRoutes.KPI_DETAIL(key)}?${params}`;
        const res = await GetData<KpiItem>({ url, protected: true });
        return res.ok && res.data ? res.data : null;
      }),
    );
    if (results.every(r => r === null)) {
      return rejectWithValue('Aucun KPI chargé avec ce filtre');
    }
    return results.filter(Boolean) as KpiItem[];
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const kpiSlice = createSlice({
  name: 'kpi',
  initialState,
  reducers: {
    resetFilter(state) {
      state.displayed = state.catalog;
    },
    clearSelectedKpi(state) {
      state.selectedKpi     = null;
      state.kpiDetailError  = null;
    },
  },
  extraReducers(builder) {
    builder
      // ── Catalogue complet ────────────────────────────────────────────────────
      .addCase(fetchKpiCatalog.pending, state => {
        state.catalogLoading = true;
        state.catalogError   = null;
      })
      .addCase(fetchKpiCatalog.fulfilled, (state, { payload }) => {
        state.catalogLoading = false;
        state.catalog        = payload;
        state.displayed      = payload;
      })
      .addCase(fetchKpiCatalog.rejected, (state, { payload }) => {
        state.catalogLoading = false;
        state.catalogError   = payload as string;
      })

      // ── Filtre date global ───────────────────────────────────────────────────
      .addCase(fetchKpiCatalogWithFilter.pending, state => {
        state.filterLoading = true;
      })
      .addCase(fetchKpiCatalogWithFilter.fulfilled, (state, { payload }) => {
        state.filterLoading = false;
        state.displayed     = payload;
      })
      .addCase(fetchKpiCatalogWithFilter.rejected, state => {
        state.filterLoading = false;
      })

      // ── Détail KPI individuel ────────────────────────────────────────────────
      .addCase(fetchKpiDetail.pending, state => {
        state.kpiDetailLoading = true;
        state.kpiDetailError   = null;
      })
      .addCase(fetchKpiDetail.fulfilled, (state, { payload }) => {
        state.kpiDetailLoading = false;
        state.selectedKpi      = payload;
        // Mise à jour dans displayed si présent
        const idx = state.displayed.findIndex(k => k.key === payload.key);
        if (idx >= 0) state.displayed[idx] = payload;
      })
      .addCase(fetchKpiDetail.rejected, (state, { payload }) => {
        state.kpiDetailLoading = false;
        state.kpiDetailError   = payload as string;
      });
  },
});

export const { resetFilter, clearSelectedKpi } = kpiSlice.actions;
export default kpiSlice.reducer;
