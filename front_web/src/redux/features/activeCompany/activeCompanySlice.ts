import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ActiveCompanyState {
  selectedId: string;
}

const initialState: ActiveCompanyState = {
  selectedId: '',
};

const activeCompanySlice = createSlice({
  name: 'activeCompany',
  initialState,
  reducers: {
    setActiveCompany(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
    },
  },
});

export const { setActiveCompany } = activeCompanySlice.actions;
export default activeCompanySlice.reducer;
