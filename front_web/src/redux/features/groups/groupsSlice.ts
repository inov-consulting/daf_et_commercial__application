import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

export type ApiGroup = { id: string; name: string; path: string };

interface GroupsState {
  list: ApiGroup[];
  loading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  list: [],
  loading: false,
  error: null,
};

export const fetchGroups = createAsyncThunk(
  'groups/fetch',
  async (_, { rejectWithValue }) => {
    const res = await GetData<ApiGroup[]>({ url: ApiRoutes.GROUP_LIST, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les groupes');
    return res.data!;
  },
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchGroups.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default groupsSlice.reducer;
