"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import {
  fetchAiModels,
  fetchAiConfig,
  addAiModel,
  updateGenerationModel,
  updateEmbeddingModel,
  updateCrTemplate,
} from "@/redux/features/ai/aiSlice";
import type { AiModel } from "@/types/ai_type";
import {
  BrainIcon,
  PlusIcon,
  CircleNotchIcon,
  CheckIcon,
  FloppyDiskIcon,
  CaretDownIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
  CubeIcon,
} from "@phosphor-icons/react";

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  DeepSeek: "DeepSeek",
};

function providerLabel(p: string) {
  return PROVIDER_LABELS[p.toLowerCase()] ?? p;
}

function providerColor(p: string): string {
  const map: Record<string, string> = {
    anthropic: "#D97706",
    openai: "#0E86E8",
    DeepSeek: "#085499",
  };
  return map[p.toLowerCase()] ?? "#435869";
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#DDE5EF] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#DDE5EF] bg-[#F7F9FB]">
        <h3 className="text-[13px] font-semibold text-[#2E3D4C]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ModelSelect({
  label,
  models,
  selectedId,
  saving,
  onChange,
}: {
  label: string;
  models: AiModel[];
  selectedId: string | undefined;
  saving: boolean;
  onChange: (id: string) => void;
}) {
  const [localId, setLocalId] = useState(selectedId ?? "");

  useEffect(() => {
    setLocalId(selectedId ?? "");
  }, [selectedId]);

  const dirty = localId !== (selectedId ?? "");

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-[#7691A8] uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <select
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            className="w-full h-9 pl-3 pr-8 text-[13px] text-[#2E3D4C] bg-white border border-[#DDE5EF] rounded-lg appearance-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer disabled:opacity-60"
            disabled={saving || models.length === 0}
          >
            <option value="" disabled>
              Sélectionner…
            </option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({providerLabel(m.provider)})
              </option>
            ))}
          </select>
          <CaretDownIcon
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EB0C4] pointer-events-none"
          />
        </div>
        <button
          onClick={() => onChange(localId)}
          disabled={!dirty || saving || !localId}
          className="h-9 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all
            bg-primary text-white hover:bg-[#145236]
            disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {saving ? (
            <CircleNotchIcon size={13} className="animate-spin" />
          ) : (
            <FloppyDiskIcon size={13} />
          )}
          <span>Appliquer</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

interface AiModelsSectionProps {
  showToast: (
    message: string,
    type?: "success" | "error" | "warning" | "info",
  ) => void;
}

export function AiModelsSection({ showToast }: AiModelsSectionProps) {
  const dispatch = useAppDispatch();

  const models = useAppSelector((s) => s.ai.models);
  const modelsLoading = useAppSelector((s) => s.ai.modelsLoading);
  const modelsError = useAppSelector((s) => s.ai.modelsError);
  const config = useAppSelector((s) => s.ai.config);
  const configLoading = useAppSelector((s) => s.ai.configLoading);
  const configError = useAppSelector((s) => s.ai.configError);
  const savingGen = useAppSelector((s) => s.ai.savingGeneration);
  const savingEmb = useAppSelector((s) => s.ai.savingEmbedding);
  const savingTpl = useAppSelector((s) => s.ai.savingTemplate);
  const addingModel = useAppSelector((s) => s.ai.addingModel);

  // Add model form local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addProvider, setAddProvider] = useState("anthropic");
  const [addIsEmb, setAddIsEmb] = useState(false);

  // Template local state (tracks edits before save)
  const [template, setTemplate] = useState("");

  useEffect(() => {
    dispatch(fetchAiModels());
    dispatch(fetchAiConfig());
  }, [dispatch]);

  // Sync template textarea when config loads
  useEffect(() => {
    if (config) setTemplate(config.compte_rendu_template ?? "");
  }, [config]);

  async function handleChangeGeneration(modelId: string) {
    const res = await dispatch(updateGenerationModel({ model_id: modelId }));
    if (updateGenerationModel.fulfilled.match(res)) {
      showToast("Modèle de génération mis à jour", "success");
    } else {
      showToast((res.payload as string) ?? "Erreur", "error");
    }
  }

  async function handleChangeEmbedding(modelId: string) {
    const res = await dispatch(updateEmbeddingModel({ model_id: modelId }));
    if (updateEmbeddingModel.fulfilled.match(res)) {
      showToast("Modèle d'embedding mis à jour", "success");
    } else {
      showToast((res.payload as string) ?? "Erreur", "error");
    }
  }

  async function handleSaveTemplate() {
    const res = await dispatch(
      updateCrTemplate({ compte_rendu_template: template }),
    );
    if (updateCrTemplate.fulfilled.match(res)) {
      showToast("Template enregistré", "success");
    } else {
      showToast((res.payload as string) ?? "Erreur", "error");
    }
  }

  async function handleAddModel() {
    if (!addName.trim()) return;
    const res = await dispatch(
      addAiModel({
        name: addName.trim(),
        provider: addProvider,
        is_embedding: addIsEmb,
      }),
    );
    if (addAiModel.fulfilled.match(res)) {
      showToast(`Modèle "${addName.trim()}" ajouté`, "success");
      setAddName("");
      setAddProvider("anthropic");
      setAddIsEmb(false);
      setShowAddForm(false);
    } else {
      showToast((res.payload as string) ?? "Erreur", "error");
    }
  }

  const loading = modelsLoading || configLoading;
  const error = modelsError || configError;

  function reload() {
    dispatch(fetchAiModels());
    dispatch(fetchAiConfig());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-[#7691A8]">
        <CircleNotchIcon size={18} className="animate-spin" />
        <span className="text-[13px]">Chargement de la configuration IA…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <WarningCircleIcon size={18} className="flex-shrink-0" />
        <span className="text-[13px]">{error}</span>
        <button
          onClick={reload}
          className="ml-auto text-[12px] font-medium hover:underline flex items-center gap-1.5"
        >
          <ArrowsClockwiseIcon size={13} /> Réessayer
        </button>
      </div>
    );
  }

  const allModels = Object.values(models).flat();
  const genModels = allModels.filter((m) => !m.is_embedding);
  const embModels = allModels.filter((m) => m.is_embedding);
  const providers = Object.keys(models);

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#DDE5EF]" />
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7691A8] uppercase tracking-wider">
          <BrainIcon size={13} />
          Modèles & Configuration IA
        </div>
        <div className="h-px flex-1 bg-[#DDE5EF]" />
      </div>

      {/* Active config */}
      <SectionCard title="Configuration active">
        <div className="flex flex-col sm:flex-row gap-4">
          <ModelSelect
            label="Modèle de génération"
            models={genModels}
            selectedId={config?.default_model?.id}
            saving={savingGen}
            onChange={handleChangeGeneration}
          />
          <div className="hidden sm:block w-px bg-[#DDE5EF] self-stretch" />
          <ModelSelect
            label="Modèle d'embedding"
            models={embModels}
            selectedId={config?.default_embedding_model?.id}
            saving={savingEmb}
            onChange={handleChangeEmbedding}
          />
        </div>
        {config && (
          <p className="mt-3 text-[11px] text-[#9EB0C4]">
            Dernière mise à jour :{" "}
            {new Date(config.updated_at).toLocaleString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </SectionCard>

      {/* Model catalog */}
      <SectionCard title="Catalogue de modèles">
        {providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#F7F9FB] border border-[#EEF2F7] flex items-center justify-center mb-2.5">
              <CubeIcon size={18} className="text-[#9EB0C4]" />
            </div>
            <p className="text-[12px] text-[#9EB0C4]">
              Aucun modèle enregistré
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {providers.map((provider) => (
              <div key={provider} className="group">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded"
                    style={{
                      color: providerColor(provider),
                      background: `${providerColor(provider)}12`,
                      borderColor: `${providerColor(provider)}25`,
                    }}
                  >
                    {providerLabel(provider)}
                  </span>
                  <span className="text-[10px] text-[#9EB0C4] font-medium tabular-nums">
                    {models[provider].length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {models[provider].map((m) => (
                    <div
                      key={m.id}
                      className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all duration-150
                  ${
                    m.is_active
                      ? "bg-white border border-[#DDE5EF] hover:border-[#10B981]/30 hover:shadow-sm"
                      : "bg-[#F7F9FB] border border-[#EEF2F7] opacity-60 hover:opacity-80"
                  }
                `}
                      title={`${m.name} · ${m.is_embedding ? "Embedding" : "Génération"} · ${m.is_active ? "Actif" : "Inactif"}`}
                    >
                      {/* Point de statut */}
                      <span
                        className={`relative flex h-1.5 w-1.5 flex-shrink-0`}
                      >
                        <span
                          className={`absolute inset-0 rounded-full ${m.is_active ? "bg-[#10B981] animate-pulse" : "bg-[#9CA3AF]"}`}
                        />
                        {m.is_active && (
                          <span className="absolute inset-0 rounded-full bg-[#10B981] animate-ping opacity-30" />
                        )}
                      </span>

                      {/* Nom du modèle */}
                      <span
                        className={`font-medium max-w-[160px] truncate ${m.is_active ? "text-[#2E3D4C]" : "text-[#9EB0C4]"}`}
                      >
                        {m.name}
                      </span>

                      {/* Badge type */}
                      <span
                        className={`
                  text-[9px] font-semibold px-1 py-px rounded flex-shrink-0
                  ${
                    m.is_embedding
                      ? "bg-purple-50 text-purple-600 border border-purple-200"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                  }
                `}
                      >
                        {m.is_embedding ? "EMB" : "GEN"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un modèle */}
        <div className="mt-3 pt-3 border-t border-[#EEF2F7]">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-[#145236] transition-colors group"
            >
              <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <PlusIcon size={11} weight="bold" className="text-primary" />
              </span>
              Ajouter un modèle
            </button>
          ) : (
            <div className="bg-[#F7F9FB] border border-[#EEF2F7] rounded-xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#7691A8] bg-white px-1.5 py-0.5 rounded border border-[#DDE5EF]">
                  Nouveau
                </span>
                <span className="text-[10px] text-[#9EB0C4]">
                  Configurer un modèle
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Nom du modèle"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-3 text-[12px] bg-white border border-[#DDE5EF] rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-[#9EB0C4]"
                  />
                </div>
                <div className="relative">
                  <select
                    value={addProvider}
                    onChange={(e) => setAddProvider(e.target.value)}
                    className="h-8 pl-2.5 pr-7 text-[12px] text-[#2E3D4C] bg-white border border-[#DDE5EF] rounded-lg appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer"
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                  <CaretDownIcon
                    size={10}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9EB0C4] pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={addIsEmb}
                    onClick={() => setAddIsEmb((v) => !v)}
                    className={`
                relative w-8 h-[18px] rounded-full transition-all duration-200
                ${addIsEmb ? "bg-primary" : "bg-[#DDE5EF]"}
                focus:outline-none focus:ring-2 focus:ring-primary/20
              `}
                  >
                    <span
                      className={`
                absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm
                transition-all duration-200
                ${addIsEmb ? "translate-x-[14px]" : "translate-x-0"}
              `}
                    />
                  </button>
                  <span
                    className={`text-[11px] font-medium transition-colors ${addIsEmb ? "text-primary" : "text-[#7691A8]"}`}
                  >
                    Embedding
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setAddName("");
                    }}
                    className="h-8 px-3 rounded-lg text-[11px] font-medium text-[#7691A8] hover:text-[#435869] hover:bg-white transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAddModel}
                    disabled={addingModel || !addName.trim()}
                    className="h-8 px-3.5 rounded-lg text-[11px] font-semibold bg-primary text-white hover:bg-[#145236] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    {addingModel ? (
                      <CircleNotchIcon size={12} className="animate-spin" />
                    ) : (
                      <CheckIcon size={12} weight="bold" />
                    )}
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* CR Template */}
      <SectionCard title="Template de génération des comptes-rendus">
        <p className="text-[12px] text-[#7691A8] mb-3">
          Ce template Markdown est utilisé par l&apos;agent CR pour structurer
          les comptes-rendus générés.
        </p>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={12}
          placeholder={"# Compte-rendu\n## Participants\n…"}
          className="w-full px-3 py-2.5 text-[13px] font-mono text-[#2E3D4C] bg-[#F7F9FB] border border-[#DDE5EF] rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-y"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-[#9EB0C4]">
            {template.length} caractères
          </span>
          <button
            onClick={handleSaveTemplate}
            disabled={
              savingTpl || template === (config?.compte_rendu_template ?? "")
            }
            className="h-9 px-4 rounded-lg text-[12px] font-semibold flex items-center gap-1.5
              bg-primary text-white hover:bg-[#145236]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {savingTpl ? (
              <CircleNotchIcon size={13} className="animate-spin" />
            ) : (
              <FloppyDiskIcon size={13} />
            )}
            Enregistrer le template
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
