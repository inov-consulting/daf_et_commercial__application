import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ApiUser } from '@/types/user_type';

interface MeState {
  me: ApiUser | null;
  loading: boolean;
  error: string | null;
}

const initialState: MeState = {
  me: null,
  loading: false,
  error: null,
};

export const fetchMe = createAsyncThunk(
  'me/fetch',
  async (_, { rejectWithValue }) => {
    const res = await GetData<ApiUser>({
      url: ApiRoutes.USERS_ME,
      protected: true,
    });
    
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de récupérer le profil');
    return res.data!;
  },
);

const meSlice = createSlice({
  name: 'me',
  initialState,
  reducers: {
    clearMe(state) {
      state.me = null;
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchMe.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.me = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearMe } = meSlice.actions;
export default meSlice.reducer;
