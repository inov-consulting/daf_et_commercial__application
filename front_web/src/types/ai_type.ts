// ── AI Models & Config ────────────────────────────────────────────────────────

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  is_embedding: boolean;
  is_active: boolean;
  updated_at: string;
}

/** Réponse de GET /api/v1/ai/models — clé = nom du provider */
export type AiModelsResponse = Record<string, AiModel[]>;

export interface AiConfig {
  id: string;
  default_model: AiModel | null;
  default_embedding_model: AiModel | null;
  compte_rendu_template: string;
  updated_at: string;
}

export interface AddAiModelBody {
  name: string;
  provider: string;
  is_embedding: boolean;
}

export interface UpdateGenerationBody {
  model_id: string;
}

export interface UpdateEmbeddingBody {
  model_id: string;
}

export interface UpdateTemplateBody {
  compte_rendu_template: string;
}
