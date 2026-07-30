import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { GetData, PostData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ApiUser } from '@/types/user_type';

// ── State ──────────────────────────────────────────────────────────────────

interface UsersState {
  list: ApiUser[];
  total: number;
  // fetchUsers
  loading: boolean;
  error: string | null;
  // createUser
  creating: boolean;
  createError: string | null;
  // updateUser
  updating: boolean;
  updateError: string | null;
  // toggleUserStatus
  togglingStatus: boolean;
  toggleStatusError: string | null;
  // uploadAvatar
  uploadingAvatar: boolean;
  uploadAvatarError: string | null;
}

const initialState: UsersState = {
  list: [],
  total: 0,
  loading: false,
  error: null,
  creating: false,
  createError: null,
  updating: false,
  updateError: null,
  togglingStatus: false,
  toggleStatusError: null,
  uploadingAvatar: false,
  uploadAvatarError: null,
};

// ── Payload types ──────────────────────────────────────────────────────────

type FetchUsersParams = {
  company_id?: string;
  limit?: number;
  offset?: number;
};

type CreateUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  company_ids: string[];
  group_ids: string[];
};

type UpdateUserPayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  company_ids?: string[];
  group_ids?: string[];
  avatar_url?: string;
  is_active?: boolean;
};

// Shape réelle retournée par GET /users
type ListResponse = {
  items: ApiUser[];
  limit: number;
  offset: number;
  count: number;
};

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params: FetchUsersParams | void, { rejectWithValue }) => {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.company_id) qs.set('company_id', p.company_id);
    qs.set('limit', String(p.limit ?? 50));
    qs.set('offset', String(p.offset ?? 0));

    const res = await GetData<ListResponse>({
      url: `${ApiRoutes.USERS_LIST}?${qs}`,
      protected: true,
    });

    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les utilisateurs');

    const data = res.data!;
    return { results: data.items ?? [], total: data.count ?? data.items?.length ?? 0 };
  },
);

export const createUser = createAsyncThunk(
  'users/create',
  async (payload: CreateUserPayload, { rejectWithValue }) => {
    const res = await PostData<ApiUser, CreateUserPayload>({
      url: ApiRoutes.USERS_ADD,
      data: payload,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Erreur lors de la création de l'utilisateur");
    return res.data!;
  },
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, payload }: { id: string; payload: UpdateUserPayload }, { rejectWithValue }) => {
    const res = await PatchData<ApiUser, UpdateUserPayload>({
      url: ApiRoutes.USERS_UPDATE(id),
      data: payload,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la mise à jour');
    return res.data!;
  },
);

// is_active est passé en query param — PATCH /api/v1/users/{id}/status?is_active=...
export const toggleUserStatus = createAsyncThunk(
  'users/toggleStatus',
  async ({ id, isActive }: { id: string; isActive: boolean }, { rejectWithValue }) => {
    const qs = new URLSearchParams({ is_active: String(isActive) });
    const res = await PatchData<ApiUser>({
      url: `${ApiRoutes.USERS_STATUS(id)}?${qs}`,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors du changement de statut');
    return res.data!;
  },
);

// Envoie le fichier image en multipart — POST /api/v1/users/{id}/avatar
export const uploadAvatar = createAsyncThunk(
  'users/uploadAvatar',
  async ({ id, file }: { id: string; file: File }, { rejectWithValue }) => {
    const res = await PostData<ApiUser, { file: File }>({
      url: ApiRoutes.USERS_AVATAR(id),
      data: { file },
      protected: true,
      isMultipart: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Erreur lors de l'upload de l'avatar");
    return res.data!;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    removeUser(state, action: PayloadAction<string>) {
      state.list = state.list.filter(u => u.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    },
    updateUserLocal(state, action: PayloadAction<{ id: string; changes: Partial<ApiUser> }>) {
      const idx = state.list.findIndex(u => u.id === action.payload.id);
      if (idx !== -1) Object.assign(state.list[idx], action.payload.changes);
    },
    clearError(state) {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.toggleStatusError = null;
      state.uploadAvatarError = null;
    },
  },
  extraReducers(builder) {
    builder
      // fetchUsers
      .addCase(fetchUsers.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.results;
        state.total = action.payload.total;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // createUser
      .addCase(createUser.pending, state => { state.creating = true; state.createError = null; })
      .addCase(createUser.fulfilled, (state, action) => {
        state.creating = false;
        state.list.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload as string;
      })
      // updateUser
      .addCase(updateUser.pending, state => { state.updating = true; state.updateError = null; })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updating = false;
        const idx = state.list.findIndex(u => u.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload as string;
      })
      // toggleUserStatus
      .addCase(toggleUserStatus.pending, state => { state.togglingStatus = true; state.toggleStatusError = null; })
      .addCase(toggleUserStatus.fulfilled, (state, action) => {
        state.togglingStatus = false;
        const idx = state.list.findIndex(u => u.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(toggleUserStatus.rejected, (state, action) => {
        state.togglingStatus = false;
        state.toggleStatusError = action.payload as string;
      })
      // uploadAvatar — met à jour me dans usersSlice (si présent) + liste
      .addCase(uploadAvatar.pending, state => { state.uploadingAvatar = true; state.uploadAvatarError = null; })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.uploadingAvatar = false;
        const idx = state.list.findIndex(u => u.id === action.payload.id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.uploadingAvatar = false;
        state.uploadAvatarError = action.payload as string;
      });
  },
});

export const { removeUser, updateUserLocal, clearError } = usersSlice.actions;
export default usersSlice.reducer;
