'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchAiModels,
  fetchAiConfig,
  addAiModel,
  updateGenerationModel,
  updateEmbeddingModel,
  updateCrTemplate,
} from '@/redux/features/ai/aiSlice';
import type { AiModel } from '@/types/ai_type';
import {
  BrainIcon,
  PlusIcon,
  CircleNotchIcon,
  CheckIcon,
  FloppyDiskIcon,
  CaretDownIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
} from '@phosphor-icons/react';

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai:    'OpenAI',
  mistral:   'Mistral',
  cohere:    'Cohere',
};

function providerLabel(p: string) {
  return PROVIDER_LABELS[p.toLowerCase()] ?? p;
}

function providerColor(p: string): string {
  const map: Record<string, string> = {
    anthropic: '#D97706',
    openai:    '#059669',
    mistral:   '#5829A8',
    cohere:    '#085499',
  };
  return map[p.toLowerCase()] ?? '#435869';
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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
  const [localId, setLocalId] = useState(selectedId ?? '');

  useEffect(() => {
    setLocalId(selectedId ?? '');
  }, [selectedId]);

  const dirty = localId !== (selectedId ?? '');

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-[#7691A8] uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <select
            value={localId}
            onChange={e => setLocalId(e.target.value)}
            className="w-full h-9 pl-3 pr-8 text-[13px] text-[#2E3D4C] bg-white border border-[#DDE5EF] rounded-lg appearance-none focus:outline-none focus:border-[#1B6B45] focus:ring-1 focus:ring-[#1B6B45]/20 cursor-pointer disabled:opacity-60"
            disabled={saving || models.length === 0}
          >
            <option value="" disabled>Sélectionner…</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({providerLabel(m.provider)})
              </option>
            ))}
          </select>
          <CaretDownIcon size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EB0C4] pointer-events-none" />
        </div>
        <button
          onClick={() => onChange(localId)}
          disabled={!dirty || saving || !localId}
          className="h-9 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all
            bg-[#1B6B45] text-white hover:bg-[#145236]
            disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {saving
            ? <CircleNotchIcon size={13} className="animate-spin" />
            : <FloppyDiskIcon size={13} />
          }
          <span>Appliquer</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

interface AiModelsSectionProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function AiModelsSection({ showToast }: AiModelsSectionProps) {
  const dispatch = useAppDispatch();

  const models          = useAppSelector(s => s.ai.models);
  const modelsLoading   = useAppSelector(s => s.ai.modelsLoading);
  const modelsError     = useAppSelector(s => s.ai.modelsError);
  const config          = useAppSelector(s => s.ai.config);
  const configLoading   = useAppSelector(s => s.ai.configLoading);
  const configError     = useAppSelector(s => s.ai.configError);
  const savingGen       = useAppSelector(s => s.ai.savingGeneration);
  const savingEmb       = useAppSelector(s => s.ai.savingEmbedding);
  const savingTpl       = useAppSelector(s => s.ai.savingTemplate);
  const addingModel     = useAppSelector(s => s.ai.addingModel);

  // Add model form local state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName,     setAddName]     = useState('');
  const [addProvider, setAddProvider] = useState('anthropic');
  const [addIsEmb,    setAddIsEmb]    = useState(false);

  // Template local state (tracks edits before save)
  const [template, setTemplate] = useState('');

  useEffect(() => {
    dispatch(fetchAiModels());
    dispatch(fetchAiConfig());
  }, [dispatch]);

  // Sync template textarea when config loads
  useEffect(() => {
    if (config) setTemplate(config.compte_rendu_template ?? '');
  }, [config]);

  async function handleChangeGeneration(modelId: string) {
    const res = await dispatch(updateGenerationModel({ model_id: modelId }));
    if (updateGenerationModel.fulfilled.match(res)) {
      showToast('Modèle de génération mis à jour', 'success');
    } else {
      showToast((res.payload as string) ?? 'Erreur', 'error');
    }
  }

  async function handleChangeEmbedding(modelId: string) {
    const res = await dispatch(updateEmbeddingModel({ model_id: modelId }));
    if (updateEmbeddingModel.fulfilled.match(res)) {
      showToast("Modèle d'embedding mis à jour", 'success');
    } else {
      showToast((res.payload as string) ?? 'Erreur', 'error');
    }
  }

  async function handleSaveTemplate() {
    const res = await dispatch(updateCrTemplate({ compte_rendu_template: template }));
    if (updateCrTemplate.fulfilled.match(res)) {
      showToast('Template enregistré', 'success');
    } else {
      showToast((res.payload as string) ?? 'Erreur', 'error');
    }
  }

  async function handleAddModel() {
    if (!addName.trim()) return;
    const res = await dispatch(addAiModel({ name: addName.trim(), provider: addProvider, is_embedding: addIsEmb }));
    if (addAiModel.fulfilled.match(res)) {
      showToast(`Modèle "${addName.trim()}" ajouté`, 'success');
      setAddName('');
      setAddProvider('anthropic');
      setAddIsEmb(false);
      setShowAddForm(false);
    } else {
      showToast((res.payload as string) ?? 'Erreur', 'error');
    }
  }

  const loading = modelsLoading || configLoading;
  const error   = modelsError   || configError;

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
        <button onClick={reload} className="ml-auto text-[12px] font-medium hover:underline flex items-center gap-1.5">
          <ArrowsClockwiseIcon size={13} /> Réessayer
        </button>
      </div>
    );
  }

  const allModels = Object.values(models).flat();
  const genModels = allModels.filter(m => !m.is_embedding);
  const embModels = allModels.filter(m => m.is_embedding);
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
            Dernière mise à jour : {new Date(config.updated_at).toLocaleString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </SectionCard>

      {/* Model catalog */}
      <SectionCard title="Catalogue de modèles">
        {providers.length === 0 ? (
          <p className="text-[13px] text-[#9EB0C4] py-2">Aucun modèle enregistré.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {providers.map(provider => (
              <div key={provider}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color:       providerColor(provider),
                      background:  `${providerColor(provider)}14`,
                      borderColor: `${providerColor(provider)}30`,
                    }}
                  >
                    {providerLabel(provider)}
                  </span>
                  <span className="text-[11px] text-[#9EB0C4]">
                    {models[provider].length} modèle{models[provider].length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {models[provider].map(m => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#F7F9FB] border border-[#EEF2F7]"
                    >
                      <span className="text-[13px] font-medium text-[#2E3D4C] truncate">{m.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF2F7] text-[#7691A8] border border-[#DDE5EF]">
                          {m.is_embedding ? 'Embedding' : 'Génération'}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-[#10B981]' : 'bg-[#9CA3AF]'}`} />
                          <span className={`text-[11px] font-medium ${m.is_active ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>
                            {m.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add model */}
        <div className="mt-4 pt-4 border-t border-[#EEF2F7]">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1B6B45] hover:text-[#145236] transition-colors"
            >
              <PlusIcon size={14} />
              Ajouter un modèle
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-semibold text-[#435869]">Nouveau modèle</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Nom du modèle (ex: claude-haiku-4-5)"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  className="flex-1 h-9 px-3 text-[13px] bg-white border border-[#DDE5EF] rounded-lg focus:outline-none focus:border-[#1B6B45] focus:ring-1 focus:ring-[#1B6B45]/20"
                />
                <div className="relative">
                  <select
                    value={addProvider}
                    onChange={e => setAddProvider(e.target.value)}
                    className="h-9 pl-3 pr-8 text-[13px] text-[#2E3D4C] bg-white border border-[#DDE5EF] rounded-lg appearance-none focus:outline-none focus:border-[#1B6B45]"
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                    <option value="mistral">Mistral</option>
                    <option value="cohere">Cohere</option>
                  </select>
                  <CaretDownIcon size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EB0C4] pointer-events-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <button
                  type="button"
                  role="switch"
                  aria-checked={addIsEmb}
                  onClick={() => setAddIsEmb(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${addIsEmb ? 'bg-[#1B6B45]' : 'bg-[#DDE5EF]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${addIsEmb ? 'translate-x-4' : ''}`} />
                </button>
                <span className="text-[13px] text-[#2E3D4C]">Modèle d'embedding</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddModel}
                  disabled={addingModel || !addName.trim()}
                  className="h-9 px-4 rounded-lg text-[12px] font-semibold bg-[#1B6B45] text-white hover:bg-[#145236] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
                >
                  {addingModel ? <CircleNotchIcon size={13} className="animate-spin" /> : <CheckIcon size={13} />}
                  Ajouter
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddName(''); }}
                  className="h-9 px-4 rounded-lg text-[12px] font-semibold text-[#435869] bg-[#EEF2F7] hover:bg-[#DDE5EF] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* CR Template */}
      <SectionCard title="Template de génération des comptes-rendus">
        <p className="text-[12px] text-[#7691A8] mb-3">
          Ce template Markdown est utilisé par l'agent CR pour structurer les comptes-rendus générés.
        </p>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={12}
          placeholder={'# Compte-rendu\n## Participants\n…'}
          className="w-full px-3 py-2.5 text-[13px] font-mono text-[#2E3D4C] bg-[#F7F9FB] border border-[#DDE5EF] rounded-lg focus:outline-none focus:border-[#1B6B45] focus:ring-1 focus:ring-[#1B6B45]/20 resize-y"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-[#9EB0C4]">{template.length} caractères</span>
          <button
            onClick={handleSaveTemplate}
            disabled={savingTpl || template === (config?.compte_rendu_template ?? '')}
            className="h-9 px-4 rounded-lg text-[12px] font-semibold flex items-center gap-1.5
              bg-[#1B6B45] text-white hover:bg-[#145236]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {savingTpl
              ? <CircleNotchIcon size={13} className="animate-spin" />
              : <FloppyDiskIcon size={13} />
            }
            Enregistrer le template
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
