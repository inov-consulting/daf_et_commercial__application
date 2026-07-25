import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PostData, DeleteData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

export type ApiGroup      = { id: string; name: string; path: string };
export type ApiRole       = { id: string; name: string; composite: boolean };
export type ApiPermission = { id: string; name: string; description: string; composite: boolean };

interface GroupsState {
  list: ApiGroup[];
  loading: boolean;
  error: string | null;
  roles: Record<string, ApiRole[]>;
  rolesLoading: Record<string, boolean>;
  permissions: ApiPermission[];
  permissionsLoading: boolean;
  creating: boolean;
  deletingIds: string[];
  assigningIds: string[];
  removingRoles: string[];
}

const initialState: GroupsState = {
  list: [],
  loading: false,
  error: null,
  roles: {},
  rolesLoading: {},
  permissions: [],
  permissionsLoading: false,
  creating: false,
  deletingIds: [],
  assigningIds: [],
  removingRoles: [],
};

export const fetchGroups = createAsyncThunk(
  'groups/fetch',
  async (_, { rejectWithValue }) => {
    const res = await GetData<ApiGroup[]>({ url: ApiRoutes.GROUP_LIST, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les groupes');
    return res.data!;
  },
);

export const createGroup = createAsyncThunk(
  'groups/create',
  async (name: string, { rejectWithValue }) => {
    const res = await PostData<ApiGroup>({ url: ApiRoutes.GROUP_CREATE, data: { name }, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de créer le groupe');
    return res.data!;
  },
);

export const deleteGroup = createAsyncThunk(
  'groups/delete',
  async (groupId: string, { rejectWithValue }) => {
    const res = await DeleteData({ url: ApiRoutes.GROUP_DELETE(groupId), protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de supprimer le groupe');
    return groupId;
  },
);

export const fetchGroupRoles = createAsyncThunk(
  'groups/fetchRoles',
  async (groupId: string, { rejectWithValue }) => {
    const res = await GetData<ApiRole[]>({ url: ApiRoutes.GROUP_ROLES(groupId), protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les rôles');
    return { groupId, roles: res.data! };
  },
);

export const assignGroupRoles = createAsyncThunk(
  'groups/assignRoles',
  async ({ groupId, roleNames }: { groupId: string; roleNames: string[] }, { rejectWithValue, dispatch }) => {
    const res = await PostData({
      url: ApiRoutes.GROUP_ROLES_ASSIGN(groupId),
      data: { role_names: roleNames },
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible d\'assigner les rôles');
    dispatch(fetchGroupRoles(groupId));
    return { groupId, roleNames };
  },
);

export const removeGroupRole = createAsyncThunk(
  'groups/removeRole',
  async ({ groupId, roleName }: { groupId: string; roleName: string }, { rejectWithValue }) => {
    const res = await DeleteData({ url: ApiRoutes.GROUP_ROLE_DELETE(groupId, roleName), protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de retirer le rôle');
    return { groupId, roleName };
  },
);

export const fetchPermissions = createAsyncThunk(
  'groups/fetchPermissions',
  async (_, { rejectWithValue }) => {
    const res = await GetData<ApiPermission[]>({ url: ApiRoutes.PERMISSIONS_LIST, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les permissions');
    return res.data!;
  },
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      // fetchGroups
      .addCase(fetchGroups.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchGroups.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
      .addCase(fetchGroups.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })

      // createGroup
      .addCase(createGroup.pending, state => { state.creating = true; })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.creating = false;
        state.list.push({ ...action.payload, path: `/${action.payload.name}` });
      })
      .addCase(createGroup.rejected, state => { state.creating = false; })

      // deleteGroup
      .addCase(deleteGroup.pending, (state, action) => { state.deletingIds.push(action.meta.arg); })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.deletingIds = state.deletingIds.filter(id => id !== action.payload);
        state.list = state.list.filter(g => g.id !== action.payload);
        delete state.roles[action.payload];
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.deletingIds = state.deletingIds.filter(id => id !== action.meta.arg);
      })

      // fetchGroupRoles
      .addCase(fetchGroupRoles.pending, (state, action) => { state.rolesLoading[action.meta.arg] = true; })
      .addCase(fetchGroupRoles.fulfilled, (state, action) => {
        state.rolesLoading[action.payload.groupId] = false;
        state.roles[action.payload.groupId] = action.payload.roles;
      })
      .addCase(fetchGroupRoles.rejected, (state, action) => { state.rolesLoading[action.meta.arg] = false; })

      // assignGroupRoles
      .addCase(assignGroupRoles.pending, (state, action) => { state.assigningIds.push(action.meta.arg.groupId); })
      .addCase(assignGroupRoles.fulfilled, (state, action) => {
        state.assigningIds = state.assigningIds.filter(id => id !== action.payload.groupId);
      })
      .addCase(assignGroupRoles.rejected, (state, action) => {
        state.assigningIds = state.assigningIds.filter(id => id !== action.meta.arg.groupId);
      })

      // removeGroupRole
      .addCase(removeGroupRole.pending, (state, action) => {
        const key = `${action.meta.arg.groupId}:${action.meta.arg.roleName}`;
        state.removingRoles.push(key);
      })
      .addCase(removeGroupRole.fulfilled, (state, action) => {
        const { groupId, roleName } = action.payload;
        const key = `${groupId}:${roleName}`;
        state.removingRoles = state.removingRoles.filter(r => r !== key);
        if (state.roles[groupId]) {
          state.roles[groupId] = state.roles[groupId].filter(r => r.name !== roleName);
        }
      })
      .addCase(removeGroupRole.rejected, (state, action) => {
        const key = `${action.meta.arg.groupId}:${action.meta.arg.roleName}`;
        state.removingRoles = state.removingRoles.filter(r => r !== key);
      })

      // fetchPermissions
      .addCase(fetchPermissions.pending, state => { state.permissionsLoading = true; })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.permissionsLoading = false;
        state.permissions = action.payload;
      })
      .addCase(fetchPermissions.rejected, state => { state.permissionsLoading = false; });
  },
});

export default groupsSlice.reducer;
