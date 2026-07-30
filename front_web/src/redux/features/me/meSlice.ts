import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type { ApiUser } from '@/types/user_type';

interface MeState {
  me: ApiUser | null;
  loading: boolean;
  error: string | null;
  // changePassword
  changingPassword: boolean;
  changePasswordError: string | null;
}

const initialState: MeState = {
  me: null,
  loading: false,
  error: null,
  changingPassword: false,
  changePasswordError: null,
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

type ChangePasswordPayload = { current_password: string; new_password: string };

export const changePassword = createAsyncThunk(
  'me/changePassword',
  async (payload: ChangePasswordPayload, { rejectWithValue }) => {
    const res = await PatchData<void, ChangePasswordPayload>({
      url: ApiRoutes.USERS_ME_PASSWORD,
      data: payload,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors du changement de mot de passe');
    return true;
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
    clearChangePasswordError(state) {
      state.changePasswordError = null;
    },
    // Met à jour me localement après upload avatar / updateUser sans re-fetch
    patchMe(state, action: import('@reduxjs/toolkit').PayloadAction<Partial<ApiUser>>) {
      if (state.me) Object.assign(state.me, action.payload);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchMe.pending, state => { state.loading = true; state.error = null; })
      .addCase(fetchMe.fulfilled, (state, action) => { state.loading = false; state.me = action.payload; })
      .addCase(fetchMe.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(changePassword.pending, state => { state.changingPassword = true; state.changePasswordError = null; })
      .addCase(changePassword.fulfilled, state => { state.changingPassword = false; })
      .addCase(changePassword.rejected, (state, action) => {
        state.changingPassword = false;
        state.changePasswordError = action.payload as string;
      });
  },
});

export const { clearMe, clearChangePasswordError, patchMe } = meSlice.actions;
export default meSlice.reducer;
