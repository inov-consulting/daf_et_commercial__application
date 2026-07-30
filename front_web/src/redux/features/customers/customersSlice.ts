import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CustomerItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface CustomersState {
  items: CustomerItem[];
  loading: boolean;
  error: string | null;
  search: string;
}

const initialState: CustomersState = {
  items: [],
  loading: false,
  error: null,
  search: '',
};

// ── Thunk ──────────────────────────────────────────────────────────────────

export const fetchCustomers = createAsyncThunk(
  'customers/fetch',
  async (search: string, { rejectWithValue }) => {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);

    const res = await GetData<CustomerItem[]>({
      url: `${ApiRoutes.TRANSPORT_OFFERS_CUSTOMERS}?${qs}`,
      protected: true,
    });

    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les clients');
    return { items: res.data ?? [], search };
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    resetCustomers(state) {
      state.items = [];
      state.error = null;
      state.search = '';
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCustomers.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.search = action.payload.search;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetCustomers } = customersSlice.actions;
export default customersSlice.reducer;
