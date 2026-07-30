import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

// ── Types ────────────────────────────────────────────────────────────────────

export type MonitoringStatus = 'ok' | 'warn' | 'crit';

export interface CpuStats {
  percent: number;
  count: number;
  status: MonitoringStatus;
}

export interface MemoryStats {
  total_mb: number;
  used_mb: number;
  available_mb: number;
  percent: number;
  status: MonitoringStatus;
}

export interface NetworkStats {
  send_rate_kbps: number;
  recv_rate_kbps: number;
  bytes_sent_total: number;
  bytes_recv_total: number;
  status: MonitoringStatus;
}

export interface SystemStats {
  timestamp: string;
  status: string;
  cpu: CpuStats;
  memory: MemoryStats;
  network: NetworkStats;
}

export interface ProviderUsage {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface DayHistory {
  day: string;
  providers: Record<string, { calls: number; total_tokens: number; cost_usd: number }>;
}

export interface AiUsage {
  period_days: number;
  summary: {
    total_calls: number;
    total_tokens: number;
    cost_usd: number;
  };
  by_provider: Record<string, ProviderUsage>;
  history: DayHistory[];
}

export interface ProviderBalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface ProviderBalance {
  available: boolean;
  message: string;
  balance_infos: ProviderBalanceInfo[];
}

export interface AiBalance {
  anthropic: ProviderBalance;
  openai: ProviderBalance;
  deepseek: ProviderBalance;
}

// ── State ────────────────────────────────────────────────────────────────────

interface MonitoringState {
  stats:          SystemStats | null;
  statsLoading:   boolean;
  statsError:     string | null;
  aiUsage:        AiUsage | null;
  aiUsageLoading: boolean;
  aiUsageError:   string | null;
  aiBalance:      AiBalance | null;
  aiBalanceLoading: boolean;
  aiBalanceError:   string | null;
}

const initialState: MonitoringState = {
  stats:            null,
  statsLoading:     false,
  statsError:       null,
  aiUsage:          null,
  aiUsageLoading:   false,
  aiUsageError:     null,
  aiBalance:        null,
  aiBalanceLoading: false,
  aiBalanceError:   null,
};

// ── Thunks ───────────────────────────────────────────────────────────────────

export const fetchMonitoringStats = createAsyncThunk(
  'monitoring/fetchStats',
  async (_, { rejectWithValue }) => {
    const res = await GetData<SystemStats>({ url: ApiRoutes.MONITORING_STATS, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les métriques système');
    return res.data!;
  },
);

export const fetchAiUsage = createAsyncThunk(
  'monitoring/fetchAiUsage',
  async (days: number = 30, { rejectWithValue }) => {
    const res = await GetData<AiUsage>({ url: ApiRoutes.MONITORING_AI_USAGE(days), protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger la consommation IA');
    return res.data!;
  },
);

export const fetchAiBalance = createAsyncThunk(
  'monitoring/fetchAiBalance',
  async (_, { rejectWithValue }) => {
    const res = await GetData<AiBalance>({ url: ApiRoutes.MONITORING_AI_BALANCE, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les soldes IA');
    return res.data!;
  },
);

// ── Slice ────────────────────────────────────────────────────────────────────

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchMonitoringStats.pending,   state => { state.statsLoading = true;  state.statsError = null; })
      .addCase(fetchMonitoringStats.fulfilled, (state, action) => { state.statsLoading = false; state.stats = action.payload; })
      .addCase(fetchMonitoringStats.rejected,  (state, action) => { state.statsLoading = false; state.statsError = action.payload as string; })

      .addCase(fetchAiUsage.pending,   state => { state.aiUsageLoading = true;  state.aiUsageError = null; })
      .addCase(fetchAiUsage.fulfilled, (state, action) => { state.aiUsageLoading = false; state.aiUsage = action.payload; })
      .addCase(fetchAiUsage.rejected,  (state, action) => { state.aiUsageLoading = false; state.aiUsageError = action.payload as string; })

      .addCase(fetchAiBalance.pending,   state => { state.aiBalanceLoading = true;  state.aiBalanceError = null; })
      .addCase(fetchAiBalance.fulfilled, (state, action) => { state.aiBalanceLoading = false; state.aiBalance = action.payload; })
      .addCase(fetchAiBalance.rejected,  (state, action) => { state.aiBalanceLoading = false; state.aiBalanceError = action.payload as string; });
  },
});

export default monitoringSlice.reducer;
