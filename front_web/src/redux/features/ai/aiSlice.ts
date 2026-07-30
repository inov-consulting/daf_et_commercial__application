import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GetData, PostData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import type {
  AiModel,
  AiModelsResponse,
  AiConfig,
  AddAiModelBody,
  UpdateGenerationBody,
  UpdateEmbeddingBody,
  UpdateTemplateBody,
} from '@/types/ai_type';

// ── State ──────────────────────────────────────────────────────────────────────

interface AiState {
  models:         AiModelsResponse;
  modelsLoading:  boolean;
  modelsError:    string | null;

  config:         AiConfig | null;
  configLoading:  boolean;
  configError:    string | null;

  savingGeneration: boolean;
  savingEmbedding:  boolean;
  savingTemplate:   boolean;
  addingModel:      boolean;
}

const initialState: AiState = {
  models:           {},
  modelsLoading:    false,
  modelsError:      null,

  config:           null,
  configLoading:    false,
  configError:      null,

  savingGeneration: false,
  savingEmbedding:  false,
  savingTemplate:   false,
  addingModel:      false,
};

// ── Thunks ─────────────────────────────────────────────────────────────────────

/** GET /api/v1/ai/models */
export const fetchAiModels = createAsyncThunk(
  'ai/fetchModels',
  async (_, { rejectWithValue }) => {
    const res = await GetData<AiModelsResponse>({ url: ApiRoutes.AI_MODELS, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger les modèles IA');
    return res.data ?? {};
  },
);

/** GET /api/v1/ai/config */
export const fetchAiConfig = createAsyncThunk(
  'ai/fetchConfig',
  async (_, { rejectWithValue }) => {
    const res = await GetData<AiConfig>({ url: ApiRoutes.AI_CONFIG, protected: true });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de charger la config IA');
    return res.data!;
  },
);

/** POST /api/v1/ai/models */
export const addAiModel = createAsyncThunk(
  'ai/addModel',
  async (body: AddAiModelBody, { rejectWithValue }) => {
    const res = await PostData<AiModel, AddAiModelBody>({
      url: ApiRoutes.AI_MODELS,
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible d\'ajouter le modèle');
    return res.data!;
  },
);

/** PATCH /api/v1/ai/config/generation */
export const updateGenerationModel = createAsyncThunk(
  'ai/updateGeneration',
  async (body: UpdateGenerationBody, { rejectWithValue }) => {
    const res = await PatchData<AiConfig, UpdateGenerationBody>({
      url: ApiRoutes.AI_CONFIG_GENERATION,
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de mettre à jour le modèle de génération');
    return res.data!;
  },
);

/** PATCH /api/v1/ai/config/embedding */
export const updateEmbeddingModel = createAsyncThunk(
  'ai/updateEmbedding',
  async (body: UpdateEmbeddingBody, { rejectWithValue }) => {
    const res = await PatchData<AiConfig, UpdateEmbeddingBody>({
      url: ApiRoutes.AI_CONFIG_EMBEDDING,
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de mettre à jour le modèle d\'embedding');
    return res.data!;
  },
);

/** PATCH /api/v1/ai/config/template */
export const updateCrTemplate = createAsyncThunk(
  'ai/updateTemplate',
  async (body: UpdateTemplateBody, { rejectWithValue }) => {
    const res = await PatchData<AiConfig, UpdateTemplateBody>({
      url: ApiRoutes.AI_CONFIG_TEMPLATE,
      data: body,
      protected: true,
    });
    if (!res.ok) return rejectWithValue(res.error ?? 'Impossible de mettre à jour le template');
    return res.data!;
  },
);

// ── Slice ──────────────────────────────────────────────────────────────────────

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      // ── fetchAiModels ────────────────────────────────────────────────────────
      .addCase(fetchAiModels.pending, state => {
        state.modelsLoading = true;
        state.modelsError   = null;
      })
      .addCase(fetchAiModels.fulfilled, (state, { payload }) => {
        state.modelsLoading = false;
        state.models        = payload;
      })
      .addCase(fetchAiModels.rejected, (state, { payload }) => {
        state.modelsLoading = false;
        state.modelsError   = payload as string;
      })

      // ── fetchAiConfig ────────────────────────────────────────────────────────
      .addCase(fetchAiConfig.pending, state => {
        state.configLoading = true;
        state.configError   = null;
      })
      .addCase(fetchAiConfig.fulfilled, (state, { payload }) => {
        state.configLoading = false;
        state.config        = payload;
      })
      .addCase(fetchAiConfig.rejected, (state, { payload }) => {
        state.configLoading = false;
        state.configError   = payload as string;
      })

      // ── addAiModel ───────────────────────────────────────────────────────────
      .addCase(addAiModel.pending, state => {
        state.addingModel = true;
      })
      .addCase(addAiModel.fulfilled, (state, { payload }) => {
        state.addingModel = false;
        const provider = payload.provider;
        if (!state.models[provider]) state.models[provider] = [];
        state.models[provider] = [...state.models[provider], payload];
      })
      .addCase(addAiModel.rejected, state => {
        state.addingModel = false;
      })

      // ── updateGenerationModel ────────────────────────────────────────────────
      .addCase(updateGenerationModel.pending, state => {
        state.savingGeneration = true;
      })
      .addCase(updateGenerationModel.fulfilled, (state, { payload }) => {
        state.savingGeneration = false;
        state.config           = payload;
      })
      .addCase(updateGenerationModel.rejected, state => {
        state.savingGeneration = false;
      })

      // ── updateEmbeddingModel ─────────────────────────────────────────────────
      .addCase(updateEmbeddingModel.pending, state => {
        state.savingEmbedding = true;
      })
      .addCase(updateEmbeddingModel.fulfilled, (state, { payload }) => {
        state.savingEmbedding = false;
        state.config          = payload;
      })
      .addCase(updateEmbeddingModel.rejected, state => {
        state.savingEmbedding = false;
      })

      // ── updateCrTemplate ─────────────────────────────────────────────────────
      .addCase(updateCrTemplate.pending, state => {
        state.savingTemplate = true;
      })
      .addCase(updateCrTemplate.fulfilled, (state, { payload }) => {
        state.savingTemplate = false;
        state.config         = payload;
      })
      .addCase(updateCrTemplate.rejected, state => {
        state.savingTemplate = false;
      });
  },
});

export default aiSlice.reducer;
