import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type {
  DafAgentStatus, DafRun, DafRunDetail,
  DafSnapshot, DafProposedAction, DafDecideBody,
} from '@/types/daf_type';

/* ── State ─────────────────────────────────────────────────────────────── */

interface DafState {
  agentStatus:       DafAgentStatus | null;
  agentStatusLoading: boolean;
  agentStatusError:  string | null;

  runs:         DafRun[];
  runsLoading:  boolean;
  runsError:    string | null;

  currentRun:        DafRunDetail | null;
  currentRunLoading: boolean;
  currentRunError:   string | null;

  latestSnapshot:        DafSnapshot | null;
  latestSnapshotLoading: boolean;
  latestSnapshotError:   string | null;

  snapshots:        DafSnapshot[];
  snapshotsLoading: boolean;
  snapshotsError:   string | null;

  proposedActions:        DafProposedAction[];
  proposedActionsLoading: boolean;
  proposedActionsError:   string | null;

  decidingId:   string | null;
  decideError:  string | null;

  triggering:   boolean;
  triggerError: string | null;
}

const initialState: DafState = {
  agentStatus:       null,
  agentStatusLoading: false,
  agentStatusError:  null,

  runs:         [],
  runsLoading:  false,
  runsError:    null,

  currentRun:        null,
  currentRunLoading: false,
  currentRunError:   null,

  latestSnapshot:        null,
  latestSnapshotLoading: false,
  latestSnapshotError:   null,

  snapshots:        [],
  snapshotsLoading: false,
  snapshotsError:   null,

  proposedActions:        [],
  proposedActionsLoading: false,
  proposedActionsError:   null,

  decidingId:   null,
  decideError:  null,

  triggering:   false,
  triggerError: null,
};

/* ── Thunks ────────────────────────────────────────────────────────────── */

export const fetchAgentStatus = createAsyncThunk(
  'daf/fetchAgentStatus',
  async (_, { rejectWithValue }) => {
    const res = await GetData<DafAgentStatus>({ url: ApiRoutes.DAF_AGENT_STATUS, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur agent status');
    return res.data!;
  },
);

export const triggerAgent = createAsyncThunk(
  'daf/triggerAgent',
  async (_, { rejectWithValue }) => {
    const res = await PostData({ url: ApiRoutes.DAF_AGENT_TRIGGER, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur déclenchement agent');
    return res.data;
  },
);

export const fetchRuns = createAsyncThunk(
  'daf/fetchRuns',
  async (limit: number = 20, { rejectWithValue }) => {
    const res = await GetData<DafRun[]>({
      url: `${ApiRoutes.DAF_RUNS}?limit=${limit}`,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur chargement runs');
    return res.data ?? [];
  },
);

export const fetchRun = createAsyncThunk(
  'daf/fetchRun',
  async (runId: string, { rejectWithValue }) => {
    const res = await GetData<DafRunDetail>({ url: ApiRoutes.DAF_RUN(runId), protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur chargement run');
    return res.data!;
  },
);

export const fetchLatestSnapshot = createAsyncThunk(
  'daf/fetchLatestSnapshot',
  async (_, { rejectWithValue }) => {
    const res = await GetData<DafSnapshot>({ url: ApiRoutes.DAF_SNAPSHOTS_LATEST, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur chargement snapshot');
    return res.data!;
  },
);

export const fetchSnapshots = createAsyncThunk(
  'daf/fetchSnapshots',
  async (limit: number = 10, { rejectWithValue }) => {
    const res = await GetData<DafSnapshot[]>({
      url: `${ApiRoutes.DAF_SNAPSHOTS}?limit=${limit}`,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur chargement snapshots');
    return res.data ?? [];
  },
);

export const fetchProposedActions = createAsyncThunk(
  'daf/fetchProposedActions',
  async (
    params: { status?: string; priority?: string; limit?: number } = {},
    { rejectWithValue }
  ) => {
    const qs = new URLSearchParams();
    if (params.status)   qs.set('status',   params.status);
    if (params.priority) qs.set('priority', params.priority);
    if (params.limit)    qs.set('limit',    String(params.limit));
    const url = `${ApiRoutes.DAF_PROPOSED_ACTIONS}${qs.toString() ? `?${qs}` : ''}`;
    const res = await GetData<DafProposedAction[]>({ url, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur chargement actions');
    return res.data ?? [];
  },
);

export const approveAction = createAsyncThunk(
  'daf/approveAction',
  async ({ actionId, comment }: { actionId: string; comment?: string }, { rejectWithValue }) => {
    const res = await PostData<DafProposedAction, DafDecideBody>({
      url: ApiRoutes.DAF_APPROVE_ACTION(actionId),
      data: { comment },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur approbation');
    return res.data!;
  },
);

export const rejectAction = createAsyncThunk(
  'daf/rejectAction',
  async ({ actionId, comment }: { actionId: string; comment?: string }, { rejectWithValue }) => {
    const res = await PostData<DafProposedAction, DafDecideBody>({
      url: ApiRoutes.DAF_REJECT_ACTION(actionId),
      data: { comment },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur rejet');
    return res.data!;
  },
);

/* ── Slice ─────────────────────────────────────────────────────────────── */

const dafSlice = createSlice({
  name: 'daf',
  initialState,
  reducers: {
    clearDecideError(state) { state.decideError = null; },
    clearTriggerError(state) { state.triggerError = null; },
  },
  extraReducers: (builder) => {
    /* fetchAgentStatus */
    builder
      .addCase(fetchAgentStatus.pending,   (s) => { s.agentStatusLoading = true; s.agentStatusError = null; })
      .addCase(fetchAgentStatus.fulfilled, (s, a) => { s.agentStatusLoading = false; s.agentStatus = a.payload; })
      .addCase(fetchAgentStatus.rejected,  (s, a) => { s.agentStatusLoading = false; s.agentStatusError = a.payload as string; });

    /* triggerAgent */
    builder
      .addCase(triggerAgent.pending,   (s) => { s.triggering = true; s.triggerError = null; })
      .addCase(triggerAgent.fulfilled, (s) => { s.triggering = false; })
      .addCase(triggerAgent.rejected,  (s, a) => { s.triggering = false; s.triggerError = a.payload as string; });

    /* fetchRuns */
    builder
      .addCase(fetchRuns.pending,   (s) => { s.runsLoading = true; s.runsError = null; })
      .addCase(fetchRuns.fulfilled, (s, a) => { s.runsLoading = false; s.runs = a.payload; })
      .addCase(fetchRuns.rejected,  (s, a) => { s.runsLoading = false; s.runsError = a.payload as string; });

    /* fetchRun */
    builder
      .addCase(fetchRun.pending,   (s) => { s.currentRunLoading = true; s.currentRunError = null; })
      .addCase(fetchRun.fulfilled, (s, a) => { s.currentRunLoading = false; s.currentRun = a.payload; })
      .addCase(fetchRun.rejected,  (s, a) => { s.currentRunLoading = false; s.currentRunError = a.payload as string; });

    /* fetchLatestSnapshot */
    builder
      .addCase(fetchLatestSnapshot.pending,   (s) => { s.latestSnapshotLoading = true; s.latestSnapshotError = null; })
      .addCase(fetchLatestSnapshot.fulfilled, (s, a) => { s.latestSnapshotLoading = false; s.latestSnapshot = a.payload; })
      .addCase(fetchLatestSnapshot.rejected,  (s, a) => { s.latestSnapshotLoading = false; s.latestSnapshotError = a.payload as string; });

    /* fetchSnapshots */
    builder
      .addCase(fetchSnapshots.pending,   (s) => { s.snapshotsLoading = true; s.snapshotsError = null; })
      .addCase(fetchSnapshots.fulfilled, (s, a) => { s.snapshotsLoading = false; s.snapshots = a.payload; })
      .addCase(fetchSnapshots.rejected,  (s, a) => { s.snapshotsLoading = false; s.snapshotsError = a.payload as string; });

    /* fetchProposedActions */
    builder
      .addCase(fetchProposedActions.pending,   (s) => { s.proposedActionsLoading = true; s.proposedActionsError = null; })
      .addCase(fetchProposedActions.fulfilled, (s, a) => { s.proposedActionsLoading = false; s.proposedActions = a.payload; })
      .addCase(fetchProposedActions.rejected,  (s, a) => { s.proposedActionsLoading = false; s.proposedActionsError = a.payload as string; });

    /* approveAction */
    builder
      .addCase(approveAction.pending,   (s, a) => { s.decidingId = a.meta.arg.actionId; s.decideError = null; })
      .addCase(approveAction.fulfilled, (s, a) => {
        s.decidingId = null;
        const idx = s.proposedActions.findIndex(x => x.id === a.payload.id);
        if (idx !== -1) s.proposedActions[idx] = a.payload;
      })
      .addCase(approveAction.rejected,  (s, a) => { s.decidingId = null; s.decideError = a.payload as string; });

    /* rejectAction */
    builder
      .addCase(rejectAction.pending,   (s, a) => { s.decidingId = a.meta.arg.actionId; s.decideError = null; })
      .addCase(rejectAction.fulfilled, (s, a) => {
        s.decidingId = null;
        const idx = s.proposedActions.findIndex(x => x.id === a.payload.id);
        if (idx !== -1) s.proposedActions[idx] = a.payload;
      })
      .addCase(rejectAction.rejected,  (s, a) => { s.decidingId = null; s.decideError = a.payload as string; });
  },
});

export const { clearDecideError, clearTriggerError } = dafSlice.actions;
export default dafSlice.reducer;
