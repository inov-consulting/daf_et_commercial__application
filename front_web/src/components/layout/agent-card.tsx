'use client';

import { useState } from 'react';

interface AgentCardProps {
    name: string;
    description: string;
    icon: string;
    color: string;
    activeSince: string;
    isActive: boolean;
    model: string;
    modelOptions: string[];
    latencyThreshold: number;
    triggerMode: 'auto' | 'manual';
    retryCount?: number;
    template?: string;
    templateOptions?: string[];
    currency?: string;
    currencyOptions?: string[];
    vat?: string;
    vatOptions?: string[];
    time?: string;
    recipients?: Array<{ name: string; email: string; selected: boolean }>;
    dataSources?: string[];
    onToggle: (active: boolean) => void;
    onModelChange: (model: string) => void;
    onThresholdChange: (threshold: number) => void;
    onTriggerChange: (mode: 'auto' | 'manual') => void;
    onRetryChange?: (count: number) => void;
    showWarning?: boolean;
    warningTitle?: string;
    warningSub?: string;
    warningBadge?: string;
}

export function AgentCard({
    name,
    description,
    icon,
    color,
    activeSince,
    isActive: initialActive,
    model,
    modelOptions,
    latencyThreshold,
    triggerMode,
    retryCount = 3,
    template,
    templateOptions = [],
    currency,
    currencyOptions = [],
    vat,
    vatOptions = [],
    time,
    recipients = [],
    dataSources = [],
    onToggle,
    onModelChange,
    onThresholdChange,
    onTriggerChange,
    onRetryChange,
    showWarning = false,
    warningTitle = '',
    warningSub = '',
    warningBadge = '',
}: AgentCardProps) {
    const [isActive, setIsActive] = useState(initialActive);

    const handleToggle = () => {
        const newState = !isActive;
        setIsActive(newState);
        onToggle(newState);
    };

    return (
        <div className="bg-white rounded-xl border border-[#DDE5EF] shadow-sm overflow-hidden">
            {/* Stripe */}
            <div className={`h-[3px] w-full bg-[${color}]`} />

            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEF2F7]">
                <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-white text-sm"
                    style={{ backgroundColor: color }}
                >
                    {icon}
                </div>
                <div>
                    <div className="font-inter text-sm font-semibold text-[#1B2633]">{name}</div>
                    <div className="font-inter text-[11px] text-[#7691A8] mt-px">Actif depuis {activeSince}</div>
                </div>

                {/* Toggle */}
                <div className="ml-auto flex items-center gap-2">
                    <span className="font-inter text-[11px] text-[#7691A8]">
                        {isActive ? 'Actif' : 'Inactif'}
                    </span>
                    <label className="relative w-9 h-5 flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={handleToggle}
                            className="opacity-0 w-0 h-0 absolute"
                        />
                        <div className={`
              absolute inset-0 rounded-[10px] cursor-pointer transition-colors duration-200
              ${isActive ? 'bg-primary' : 'bg-[#C8D5E0]'}
            `} />
                        <div className={`
              absolute left-[3px] top-[3px] w-[14px] h-[14px] rounded-full bg-white
              transition-transform duration-200 pointer-events-none
              ${isActive ? 'translate-x-4' : ''}
            `} />
                    </label>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                {/* Model */}
                <div>
                    <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Modèle</div>
                    <select
                        value={model}
                        onChange={(e) => onModelChange(e.target.value)}
                        className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-jetbrains-mono text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
                    >
                        {modelOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <div className="font-inter text-[11px] text-[#9EB0C4] mt-1">{description}</div>
                </div>

                <div className="h-px bg-[#EEF2F7]" />

                {/* Latency Slider */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="font-inter text-xs font-medium text-[#435869]">Seuil d&apos;alerte latence</span>
                        <span className="font-jetbrains-mono text-xs font-semibold text-primary">
                            {latencyThreshold}s
                        </span>
                    </div>
                    <div className="relative pb-[18px]">
                        <input
                            type="range"
                            min="1"
                            max="15"
                            value={latencyThreshold}
                            onChange={(e) => onThresholdChange(parseInt(e.target.value))}
                            className="w-full h-1 appearance-none bg-[#DDE5EF] rounded outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        />
                        <div className="flex justify-between absolute bottom-0 left-0 right-0">
                            <span className="font-inter text-[10px] text-[#9EB0C4]">1s</span>
                            <span className="font-inter text-[10px] text-[#9EB0C4]">5s</span>
                            <span className="font-inter text-[10px] text-[#9EB0C4]">10s</span>
                            <span className="font-inter text-[10px] text-[#9EB0C4]">15s</span>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-[#EEF2F7]" />

                {/* Trigger Mode */}
                <div>
                    <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">
                        Condition de déclenchement
                    </div>
                    <div className="flex flex-col gap-2">
                        {['auto', 'manual'].map((mode) => (
                            <label key={mode} className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={`trigger-${name}`}
                                    checked={triggerMode === mode}
                                    onChange={() => onTriggerChange(mode as 'auto' | 'manual')}
                                    className="hidden"
                                />
                                <div className={`
                  w-3.5 h-3.5 rounded-full border-[1.5px] flex-shrink-0 mt-px
                  flex items-center justify-center transition-colors duration-150
                  ${triggerMode === mode ? 'border-primary' : 'border-[#C8D5E0]'}
                `}>
                                    {triggerMode === mode && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </div>
                                <span className="font-inter text-xs text-[#435869] leading-5">
                                    {mode === 'auto' ? 'Automatique — photo carte de visite détectée' : 'Manuel — validation utilisateur requise avant traitement'}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Retry Count (optional) */}
                {onRetryChange && (
                    <>
                        <div className="h-px bg-[#EEF2F7]" />
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="font-inter text-xs font-medium text-[#435869]">Délai de retraitement</span>
                                <span className="font-inter text-[11px] text-[#7691A8]">3 tentatives max</span>
                            </div>
                            <div className="flex items-center gap-0 mt-1.5">
                                <button
                                    onClick={() => retryCount > 1 && onRetryChange(retryCount - 1)}
                                    className="w-7 h-7 border border-[#DDE5EF] bg-white text-[#435869] flex items-center justify-center rounded-l-md hover:bg-[#F7F9FC] transition-colors"
                                >
                                    −
                                </button>
                                <div className="w-9 h-7 border-t border-b border-[#DDE5EF] text-center font-jetbrains-mono text-[13px] font-semibold text-[#2E3D4C] leading-7">
                                    {retryCount}
                                </div>
                                <button
                                    onClick={() => retryCount < 10 && onRetryChange(retryCount + 1)}
                                    className="w-7 h-7 border border-[#DDE5EF] bg-white text-[#435869] flex items-center justify-center rounded-r-md hover:bg-[#F7F9FC] transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Template (optional) */}
                {template && templateOptions.length > 0 && (
                    <>
                        <div className="h-px bg-[#EEF2F7]" />
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="font-inter text-xs font-medium text-[#435869]">Template par défaut</span>
                                <button
                                    onClick={() => {/* Gérer templates */ }}
                                    className="font-inter text-xs font-medium text-primary hover:underline"
                                >
                                    Gérer les templates →
                                </button>
                            </div>
                            <select
                                value={template}
                                onChange={(e) => {/* handle template change */ }}
                                className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
                            >
                                {templateOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {/* Currency/VAT (optional) */}
                {currency && currencyOptions.length > 0 && (
                    <>
                        <div className="h-px bg-[#EEF2F7]" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">Devise</div>
                                <select
                                    value={currency}
                                    onChange={(e) => {/* handle currency change */ }}
                                    className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
                                >
                                    {currencyOptions.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">TVA applicable</div>
                                <select
                                    value={vat}
                                    onChange={(e) => {/* handle vat change */ }}
                                    className="w-full h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-xs appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1%201L5%205L9%201%22%20stroke%3D%22%239EB0C4%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
                                >
                                    {vatOptions.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </>
                )}

                {/* Time (optional) */}
                {time && (
                    <>
                        <div className="h-px bg-[#EEF2F7]" />
                        <div>
                            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">
                                Synthèse quotidienne à
                            </div>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => {/* handle time change */ }}
                                className="w-[120px] h-9 px-2.5 border border-[#DDE5EF] rounded-lg bg-white text-[#2E3D4C] font-inter text-xs focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,118,73,0.1)]"
                            />
                        </div>
                    </>
                )}

                {/* Recipients (optional) */}
                {recipients.length > 0 && (
                    <>
                        <div className="h-px bg-[#EEF2F7]" />
                        <div>
                            <div className="font-inter text-xs font-medium text-[#435869] mb-1.5">
                                Envoyer la synthèse à
                            </div>
                            <div className="flex flex-col gap-2">
                                {recipients.map((recipient, index) => (
                                    <label key={index} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={recipient.selected}
                                            onChange={() => {/* handle recipient toggle */ }}
                                            className="hidden"
                                        />
                                        <div className={`
                      w-3.5 h-3.5 rounded border-[1.5px] flex-shrink-0
                      flex items-center justify-center transition-all duration-150
                      ${recipient.selected ? 'bg-primary border-primary' : 'border-[#C8D5E0]'}
                    `}>
                                            {recipient.selected && (
                                                <span className="text-[9px] text-white">✓</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-inter text-xs text-[#435869]">{recipient.name}</div>
                                            <div className="font-inter text-[11px] text-[#9EB0C4]">{recipient.email}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Data Sources (optional) */}
                {dataSources.length > 0 && (
                    <>
                        <div className="h-px bg-[#EEF2F7]" />
                        <div>
                            <div className="font-inter text-xs font-medium text-[#435869] mb-2">
                                Données analysées
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {dataSources.map((source, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border border-[#DDE5EF] bg-white font-inter text-[11px] font-medium text-[#435869] cursor-pointer hover:bg-[#EEF2F7]"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        {source}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Warning Banner */}
                {showWarning && (
                    <div className="flex items-start gap-2 px-3 py-2.5 mt-3 bg-[#FDF7E4] border border-[#D9B96A] rounded-lg">
                        <span className="text-[13px] text-[#8C6E24] flex-shrink-0 mt-px">⚠</span>
                        <div>
                            <div className="font-inter text-[11px] font-semibold text-[#7A5C1E]">
                                {warningTitle}
                                {warningBadge && (
                                    <span className="inline-flex items-center h-4 px-1.5 ml-1 bg-[#FEF2F2] border border-[#FECACA] rounded font-jetbrains-mono text-[9px] font-semibold text-[#EF4444]">
                                        {warningBadge}
                                    </span>
                                )}
                            </div>
                            <div className="font-inter text-[11px] text-[#8C6E24] mt-0.5">{warningSub}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}