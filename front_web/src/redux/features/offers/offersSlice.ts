import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PostData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type {
  TransportOfferListItem,
  TransportOfferDetail,
  TransportOfferValidateResponse,
  TransportOfferConfirmResponse,
  TransportOfferFormResponse,
  OfferFormPatchPayload,
} from '@/types/offer_type';

// ── State ──────────────────────────────────────────────────────────────────────

interface OffersState {
  list:         TransportOfferListItem[];
  loading:      boolean;
  error:        string | null;

  detail:        TransportOfferDetail | null;
  detailLoading: boolean;
  detailError:   string | null;

  validating:    boolean;
  validateError: string | null;

  confirming:    boolean;
  confirmError:  string | null;

  cancelling:    boolean;
  cancelError:   string | null;

  updating:      boolean;
  updateError:   string | null;
}

const initialState: OffersState = {
  list:          [],
  loading:       false,
  error:         null,
  detail:        null,
  detailLoading: false,
  detailError:   null,
  validating:    false,
  validateError: null,
  confirming:    false,
  confirmError:  null,
  cancelling:    false,
  cancelError:   null,
  updating:      false,
  updateError:   null,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

/** GET /api/v1/transport/offers/ */
export const fetchOffers = createAsyncThunk(
  'offers/fetchAll',
  async (_, { rejectWithValue }) => {
    const res = await GetData<TransportOfferListItem[]>({
      url: ApiRoutes.TRANSPORT_OFFERS_LIST,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les offres');
    return res.data ?? [];
  },
);

/** GET /api/v1/transport/offers/{offer_id} */
export const fetchOfferDetail = createAsyncThunk(
  'offers/fetchDetail',
  async (offerId: string, { rejectWithValue }) => {
    const res = await GetData<TransportOfferDetail>({
      url: ApiRoutes.TRANSPORT_OFFERS_GET(offerId),
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger l\'offre');
    return res.data!;
  },
);

/** POST /api/v1/transport/offers/{offer_id}/validate
 *  Prérequis : statut generated. generated → validated (ÉTAPE 1).
 *  Ne crée rien dans Odoo. Appeler confirm ensuite. */
export const validateOffer = createAsyncThunk(
  'offers/validate',
  async (offerId: string, { rejectWithValue }) => {
    const res = await PostData<TransportOfferValidateResponse, Record<string, never>>({
      url: ApiRoutes.TRANSPORT_OFFERS_VALIDATE(offerId),
      data: {},
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la validation');
    return res.data!;
  },
);

/** POST /api/v1/transport/offers/{offer_id}/confirm
 *  Prérequis : statut validated (ÉTAPE 2). Crée le dossier transport dans Odoo. */
export const confirmOffer = createAsyncThunk(
  'offers/confirm',
  async (offerId: string, { rejectWithValue }) => {
    const res = await PostData<TransportOfferConfirmResponse, Record<string, never>>({
      url: ApiRoutes.TRANSPORT_OFFERS_CONFIRM(offerId),
      data: {},
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Erreur lors de la confirmation Odoo');
    return res.data!;
  },
);

/** PATCH /api/v1/transport/offers/{offer_id}/form
 *  Modifie les champs de l'offre (fusion partielle).
 *  Si l'offre avait un doc généré/validé, le statut repasse à completed.
 *  Les offres confirmed ou cancelled retournent 409. */
export const updateOfferForm = createAsyncThunk(
  'offers/updateForm',
  async (
    { id, payload }: { id: string; payload: OfferFormPatchPayload },
    { rejectWithValue },
  ) => {
    const res = await PatchData<TransportOfferFormResponse>({
      url: ApiRoutes.TRANSPORT_OFFERS_FORM(id),
      data: payload as Record<string, unknown>,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Erreur lors de la modification de l'offre");
    return res.data!;
  },
);

/** POST /api/v1/transport/offers/{offer_id}/cancel */
export const cancelOffer = createAsyncThunk(
  'offers/cancel',
  async (offerId: string, { rejectWithValue }) => {
    const res = await PostData<TransportOfferValidateResponse, Record<string, never>>({
      url: ApiRoutes.TRANSPORT_OFFERS_CANCEL(offerId),
      data: {},
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? "Erreur lors de l'annulation");
    return res.data!;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    clearOfferErrors(state) {
      state.error        = null;
      state.detailError  = null;
      state.validateError = null;
      state.confirmError  = null;
      state.cancelError   = null;
    },
    clearDetail(state) {
      state.detail      = null;
      state.detailError = null;
    },
    clearUpdateError(state) {
      state.updateError = null;
    },
  },
  extraReducers(builder) {
    builder

      // ── fetchOffers ────────────────────────────────────────────────────────
      .addCase(fetchOffers.pending, state => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.loading = false;
        state.list    = action.payload;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload as string;
      })

      // ── fetchOfferDetail ───────────────────────────────────────────────────
      .addCase(fetchOfferDetail.pending, state => {
        state.detailLoading = true;
        state.detailError   = null;
        // On ne remet PAS detail à null pour éviter un flash de skeleton
        // lors des re-fetches (après validate/confirm)
      })
      .addCase(fetchOfferDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detail        = action.payload;
      })
      .addCase(fetchOfferDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError   = action.payload as string;
      })

      // ── validateOffer ──────────────────────────────────────────────────────
      .addCase(validateOffer.pending, state => {
        state.validating    = true;
        state.validateError = null;
      })
      .addCase(validateOffer.fulfilled, (state, action) => {
        state.validating = false;
        const { id, status, odoo_shipment_id, odoo_shipment_name, created_at, confirmed_at } = action.payload;
        const idx = state.list.findIndex(o => o.id === id);
        if (idx !== -1) {
          state.list[idx] = {
            ...state.list[idx],
            status,
            odoo_shipment_id:   odoo_shipment_id ?? null,
            odoo_shipment_name: odoo_shipment_name ?? null,
            created_at,
            confirmed_at:       confirmed_at ?? null,
          };
        }
      })
      .addCase(validateOffer.rejected, (state, action) => {
        state.validating    = false;
        state.validateError = action.payload as string;
      })

      // ── confirmOffer ───────────────────────────────────────────────────────
      .addCase(confirmOffer.pending, state => {
        state.confirming   = true;
        state.confirmError = null;
      })
      .addCase(confirmOffer.fulfilled, (state, action) => {
        state.confirming = false;
        const { offer_id, status, odoo_shipment_id, odoo_shipment_name, confirmed_at } = action.payload;
        const idx = state.list.findIndex(o => o.id === offer_id);
        if (idx !== -1) {
          state.list[idx] = {
            ...state.list[idx],
            status,
            odoo_shipment_id:   odoo_shipment_id ?? null,
            odoo_shipment_name: odoo_shipment_name ?? null,
            confirmed_at,
          };
        }
      })
      .addCase(confirmOffer.rejected, (state, action) => {
        state.confirming   = false;
        state.confirmError = action.payload as string;
      })

      // ── cancelOffer ────────────────────────────────────────────────────────
      .addCase(cancelOffer.pending, state => {
        state.cancelling  = true;
        state.cancelError = null;
      })
      .addCase(cancelOffer.fulfilled, (state, action) => {
        state.cancelling = false;
        const { id, status, odoo_shipment_id, odoo_shipment_name, created_at, confirmed_at } = action.payload;
        const idx = state.list.findIndex(o => o.id === id);
        if (idx !== -1) {
          state.list[idx] = {
            ...state.list[idx],
            status,
            odoo_shipment_id:   odoo_shipment_id ?? null,
            odoo_shipment_name: odoo_shipment_name ?? null,
            created_at,
            confirmed_at:       confirmed_at ?? null,
          };
        }
      })
      .addCase(cancelOffer.rejected, (state, action) => {
        state.cancelling  = false;
        state.cancelError = action.payload as string;
      })

      // ── updateOfferForm ────────────────────────────────────────────────────
      .addCase(updateOfferForm.pending, state => {
        state.updating    = true;
        state.updateError = null;
      })
      .addCase(updateOfferForm.fulfilled, (state, action) => {
        state.updating = false;
        const r = action.payload;
        // Met à jour l'item dans la liste
        const idx = state.list.findIndex(o => o.id === r.id);
        if (idx !== -1) {
          state.list[idx] = {
            ...state.list[idx],
            status:             r.status,
            title:              r.title,
            reference:          r.reference,
            date:               r.date,
            validity_days:      r.validity_days,
            route:              r.route,
            amount_ttc:         r.amount_ttc,
            odoo_shipment_id:   r.odoo_shipment_id,
            odoo_shipment_name: r.odoo_shipment_name,
            created_at:         r.created_at,
            confirmed_at:       r.confirmed_at,
          };
        }
      })
      .addCase(updateOfferForm.rejected, (state, action) => {
        state.updating    = false;
        state.updateError = action.payload as string;
      });
  },
});

export const { clearOfferErrors, clearDetail, clearUpdateError } = offersSlice.actions;
export default offersSlice.reducer;
