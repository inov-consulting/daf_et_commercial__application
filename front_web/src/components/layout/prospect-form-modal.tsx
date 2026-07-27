'use client';

import { useState, useEffect, useRef } from 'react';
import { XIcon, MagnifyingGlassIcon, BuildingsIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { SECTOR_STYLES, type ApiProspect, type UpdateProspectBody } from '@/types/prospect_type';
import { GetData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { cn } from '@/lib/utils';
import { COUNTRY_CODES } from '@/data/country-code-data';
import Image from 'next/image';

/* ── Company types ─────────────────────────────────────────────────────── */

interface Company {
  id: string;
  name: string;
  country: string;
  default_currency: string;
  erp_id: number;
}

interface CompanyListResponse {
  items: Company[];
  count: number;
}

/* ── Form state (sans company qui est géré séparément) ─────────────────── */

interface FormFields {
  opportunity_name: string;
  contact_name: string;
  email: string;
  phone: string;
  portalis_sector: string;
  expected_revenue: number | undefined;
  portalis_notes: string;
}

/* ── Props ─────────────────────────────────────────────────────────────── */

export interface ProspectFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ApiProspect;
  saving: boolean;
  serverError?: string | null;
  onClose: () => void;
  onSave: (body: UpdateProspectBody) => void;
}

function splitPhone(raw: string): { code: string; local: string } {
  for (const c of COUNTRY_CODES) {
    if (raw.startsWith(c.code)) {
      return { code: c.code, local: raw.slice(c.code.length).trimStart() };
    }
  }
  return { code: '+221', local: raw };
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function ProspectFormModal({
  open, mode, initial, saving, serverError, onClose, onSave,
}: ProspectFormModalProps) {

  /* ── Companies cache ── */
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  /* ── Combobox state ── */
  const [companyQuery, setCompanyQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Other form fields ── */
  const [form, setForm] = useState<FormFields>({
    opportunity_name: '',
    contact_name: '',
    email: '',
    phone: '',
    portalis_sector: '',
    expected_revenue: undefined,
    portalis_notes: '',
  });
  const [localError, setLocalError]         = useState<string | null>(null);
  const [countryCode, setCountryCode]       = useState('+221');
  const [emailError, setEmailError]         = useState<string | null>(null);
  const [phoneError, setPhoneError]         = useState<string | null>(null);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [codePickerUp, setCodePickerUp]     = useState(false);
  const codePickerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch companies once on mount (modal always stays in DOM) ── */
  useEffect(() => {
    setLoadingCompanies(true);
    GetData<CompanyListResponse>({ url: ApiRoutes.COMPANY_LIST, protected: true })
      .then(res => { if (res.ok && res.data) setCompanies(res.data.items); })
      .finally(() => setLoadingCompanies(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Reset form on open ── */
  useEffect(() => {
    if (!open) return;
    setSelectedCompany(null);
    setCompanyQuery(initial?.company_name ?? '');
    setShowDropdown(false);
    setShowCodePicker(false);
    setLocalError(null);
    setEmailError(null);
    setPhoneError(null);
    const split = splitPhone(initial?.phone ?? '');
    setCountryCode(split.code);
    setForm({
      opportunity_name: initial?.opportunity_name ?? initial?.lead_name ?? '',
      contact_name: initial?.contact_name ?? '',
      email: initial?.email ?? '',
      phone: split.local,
      portalis_sector: initial?.portalis_sector ?? '',
      expected_revenue: initial?.expected_revenue || undefined,
      portalis_notes: initial?.portalis_notes ?? '',
    });
  }, [open, initial]);

  /* ── Close dropdowns on outside click ── */
  useEffect(() => {
    if (!showDropdown) return;
    function handle(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showDropdown]);

  useEffect(() => {
    if (!showCodePicker) return;
    function handle(e: MouseEvent) {
      if (codePickerRef.current && !codePickerRef.current.contains(e.target as Node)) {
        setShowCodePicker(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showCodePicker]);

  /* ── After hooks ── */
  if (!open) return null;

  /* ── Combobox helpers ── */
  const filtered = companies
    .filter(c => !companyQuery || c.name.toLowerCase().includes(companyQuery.toLowerCase()))
    .slice(0, 10);

  function selectCompany(c: Company) {
    setSelectedCompany(c);
    setCompanyQuery(c.name);
    setShowDropdown(false);
    setLocalError(null);
  }

  function clearCompany() {
    setSelectedCompany(null);
    setCompanyQuery('');
    setShowDropdown(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  /* ── Field helper ── */
  function setField<K extends keyof FormFields>(k: K, v: FormFields[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function validateEmail() {
    if (!form.email.trim()) { setEmailError(null); return; }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
    setEmailError(ok ? null : 'Adresse e-mail invalide');
  }

  function validatePhone() {
    if (!form.phone.trim()) { setPhoneError(null); return; }
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 7) { setPhoneError('Numéro trop court (min. 7 chiffres)'); return; }
    if (digits.length > 15) { setPhoneError('Numéro trop long (max. 15 chiffres)'); return; }
    setPhoneError(null);
  }

  /* ── Submit ── */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompany && !companyQuery.trim()) {
      setLocalError("Veuillez sélectionner ou saisir le nom d'une entreprise.");
      return;
    }
    if (mode === 'create' && !form.opportunity_name.trim()) {
      setLocalError("Le nom de l'opportunité est requis.");
      return;
    }
    if (form.expected_revenue !== undefined && form.expected_revenue < 0) {
      setLocalError('Le revenu attendu ne peut pas être négatif.');
      return;
    }

    const emailOk = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim());
    const digits  = form.phone.replace(/\D/g, '');
    const phoneOk = !form.phone.trim() || (digits.length >= 7 && digits.length <= 15);
    if (!emailOk) setEmailError('Adresse e-mail invalide');
    if (!phoneOk) setPhoneError(digits.length < 7 ? 'Numéro trop court (min. 7 chiffres)' : 'Numéro trop long (max. 15 chiffres)');
    if (!emailOk || !phoneOk) return;

    setLocalError(null);

    const localPhone = form.phone.trim();
    const fullPhone = localPhone
      ? `${countryCode} ${localPhone.replace(/^0+/, '')}`
      : undefined;

    const companyField = selectedCompany
      ? { company_id: selectedCompany.id }
      : { partner_name: companyQuery.trim() };

    const body: UpdateProspectBody = {
      ...companyField,
      opportunity_name: form.opportunity_name || undefined,
      contact_name: form.contact_name || undefined,
      email: form.email.trim() || undefined,
      phone: fullPhone,
      portalis_sector: form.portalis_sector || undefined,
      expected_revenue: form.expected_revenue,
      portalis_notes: form.portalis_notes || undefined,
    };
    onSave(body);
  }

  /* ── Style helpers ── */
  const inp = cn(
    'w-full h-9 px-3 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-1)] bg-white',
    'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
    'transition-colors placeholder:text-[var(--tx-3)]',
  );
  const lbl = 'block text-[12px] font-semibold text-[var(--tx-2)] mb-1.5';
  const displayError = localError ?? serverError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-[var(--bd-def)] z-10">
          <h2 className="font-display text-[16px] font-bold text-[var(--tx-1)]">
            {mode === 'create' ? 'Nouvelle prospection' : 'Modifier le prospect'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors"
          >
            <XIcon size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Error banner */}
          {displayError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <WarningCircleIcon size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{displayError}</p>
            </div>
          )}

          {/* ── Entreprise combobox ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-[var(--tx-2)]">
                Entreprise <span className="text-red-500">*</span>
              </label>
              {selectedCompany ? (
                <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-full">
                  Liée à Portalis
                </span>
              ) : companyQuery.trim() ? (
                <span className="text-[10px] font-medium text-amber-600">
                  Saisie manuelle
                </span>
              ) : null}
            </div>

            <div className="relative" ref={comboRef}>

              {/* ─ Company selected → locked chip ─ */}
              {selectedCompany ? (
                <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-primary-200 bg-primary-50/60">
                  <BuildingsIcon size={14} className="text-primary-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-[var(--tx-1)] truncate">
                    {selectedCompany.name}
                  </span>
                  {selectedCompany.country && (
                    <span className="text-[10px] text-[var(--tx-3)] flex-shrink-0">
                      {selectedCompany.country}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearCompany}
                    title="Saisir manuellement"
                    className="w-5 h-5 flex items-center justify-center text-[var(--tx-3)] hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <XIcon size={11} />
                  </button>
                </div>
              ) : (
                /* ─ No selection → text input ─ */
                <div className="relative">
                  <MagnifyingGlassIcon
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-3)] pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={companyQuery}
                    onChange={e => {
                      setCompanyQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setShowDropdown(false);
                        e.stopPropagation();
                      }
                      if (e.key === 'Enter' && showDropdown && filtered.length === 1) {
                        e.preventDefault();
                        selectCompany(filtered[0]);
                      }
                    }}
                    placeholder={
                      loadingCompanies
                        ? 'Chargement des entreprises…'
                        : 'Rechercher dans Portalis ou saisir un nom…'
                    }
                    className={cn(inp, 'pl-8')}
                  />
                </div>
              )}

              {/* ─ Dropdown ─ */}
              {showDropdown && !selectedCompany && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[var(--bd-def)] rounded-xl shadow-lg overflow-hidden">
                  <ul className="max-h-56 overflow-y-auto divide-y divide-[var(--bd-def)]">
                    {filtered.length === 0 ? (
                      <li className="px-3 py-2.5 text-[12px] text-[var(--tx-3)] italic">
                        {loadingCompanies
                          ? 'Chargement…'
                          : 'Aucun résultat — le nom saisi sera utilisé comme partenaire Odoo'}
                      </li>
                    ) : (
                      filtered.map(c => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onMouseDown={() => selectCompany(c)}
                            className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[var(--bg-sink)] transition-colors"
                          >
                            <div className="w-6 h-6 rounded-md bg-primary-50 flex items-center justify-center flex-shrink-0">
                              <BuildingsIcon size={12} className="text-primary-400" />
                            </div>
                            <span className="flex-1 text-[13px] font-medium text-[var(--tx-1)] truncate">
                              {c.name}
                            </span>
                            {c.country && (
                              <span className="text-[10px] text-[var(--tx-3)] flex-shrink-0">
                                {c.country}
                              </span>
                            )}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>

                  {/* Footer hint when manual entry */}
                  {companyQuery.trim() && filtered.length === 0 && (
                    <div className="border-t border-[var(--bd-def)] px-3 py-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                      <WarningCircleIcon size={12} />
                      <span>
                        <span className="font-semibold">«{companyQuery.trim()}»</span>
                        {' '}sera créé comme nouveau partenaire dans Odoo
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Helper text below combobox */}
            {!selectedCompany && (
              <p className="mt-1 text-[11px] text-[var(--tx-3)]">
                {companyQuery.trim()
                  ? '⚠ Saisie libre : un partenaire Odoo sera créé si aucune entreprise n\'est sélectionnée'
                  : 'Sélectionnez parmi les entreprises Portalis ou saisissez un nom libre'}
              </p>
            )}
            {selectedCompany && selectedCompany.country && (
              <p className="mt-1 text-[11px] text-[var(--tx-3)]">
                Pays : {selectedCompany.country}
                {selectedCompany.default_currency && ` · Devise : ${selectedCompany.default_currency}`}
              </p>
            )}
          </div>

          {/* ── Opportunité ── */}
          <div>
            <label className={lbl}>
              Nom de l&apos;opportunité
              {mode === 'create' && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              value={form.opportunity_name}
              onChange={e => { setField('opportunity_name', e.target.value); setLocalError(null); }}
              placeholder="Ex : Audit DAF Q3"
              maxLength={150}
              className={inp}
            />
          </div>

          {/* ── Contact + Email ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contact</label>
              <input
                value={form.contact_name}
                onChange={e => setField('contact_name', e.target.value)}
                placeholder="Nom du contact"
                maxLength={100}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => { setField('email', e.target.value); setEmailError(null); }}
                onBlur={validateEmail}
                placeholder="email@exemple.com"
                className={cn(inp, emailError && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
              />
              {emailError && (
                <p className="text-[11px] text-red-500 mt-1">{emailError}</p>
              )}
            </div>
          </div>

          {/* ── Téléphone + Secteur ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Téléphone</label>
              <div className="flex h-9">
                {/* Sélecteur de code pays — bouton custom avec image de drapeau */}
                <div className="relative flex-shrink-0" ref={codePickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!showCodePicker && codePickerRef.current) {
                        const rect = codePickerRef.current.getBoundingClientRect();
                        setCodePickerUp(window.innerHeight - rect.bottom < 240);
                      }
                      setShowCodePicker(o => !o);
                    }}
                    className={cn(
                      'h-9 flex items-center gap-1.5 pl-2.5 pr-6 rounded-l-lg',
                      'border border-r-0 border-[var(--bd-def)]',
                      'bg-[var(--bg-sink)] text-[12px] text-[var(--tx-1)] font-medium',
                      'focus:outline-none transition-colors cursor-pointer whitespace-nowrap',
                      phoneError      && 'border-red-400',
                      showCodePicker  && 'border-primary-400 bg-primary-50/40',
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239EB0C4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 6px center',
                    }}
                  >
                    {(() => {
                      const sel = COUNTRY_CODES.find(c => c.code === countryCode);
                      return (
                        <>
                          {sel?.flagUrl && (
                            <Image src={sel.flagUrl} alt="" width={18} height={13} className="rounded-[2px] flex-shrink-0" />
                          )}
                          <span>{countryCode}</span>
                        </>
                      );
                    })()}
                  </button>

                  {showCodePicker && (
                    <div className={cn(
                      'absolute left-0 z-50 bg-white border border-[var(--bd-def)] rounded-xl shadow-lg w-52 max-h-56 overflow-y-auto',
                      codePickerUp ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]',
                    )}>
                      {COUNTRY_CODES.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCountryCode(c.code); setShowCodePicker(false); }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px]',
                            'hover:bg-[var(--bg-sink)] transition-colors',
                            c.code === countryCode && 'bg-primary-50 text-primary-600',
                          )}
                        >
                          {c.flagUrl && (
                            <Image src={c.flagUrl} alt="" width={18} height={13} className="rounded-[2px] flex-shrink-0" />
                          )}
                          <span className="flex-1 text-[var(--tx-1)] truncate">{c.label}</span>
                          <span className="text-[var(--tx-3)] font-mono text-[11px]">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Champ numéro */}
                <input
                  value={form.phone}
                  onChange={e => { setField('phone', e.target.value.replace(/[^\d\s\-()+]/g, '')); setPhoneError(null); }}
                  onBlur={validatePhone}
                  placeholder="77 000 0000"
                  className={cn(inp, 'rounded-l-none border-l-0', phoneError && 'border-red-400 focus:border-red-400 focus:ring-red-100')}
                />
              </div>
              {phoneError && (
                <p className="text-[11px] text-red-500 mt-1">{phoneError}</p>
              )}
            </div>
            <div>
              <label className={lbl}>Secteur</label>
              <select
                value={form.portalis_sector}
                onChange={e => setField('portalis_sector', e.target.value)}
                className={inp}
              >
                <option value="">— Sélectionner —</option>
                {Object.keys(SECTOR_STYLES).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Revenu ── */}
          <div>
            <label className={lbl}>
              Revenu attendu ({selectedCompany?.default_currency || 'FCFA'})
            </label>
            <input
              type="number"
              min={0}
              value={form.expected_revenue ?? ''}
              onChange={e => { setField('expected_revenue', e.target.value ? Number(e.target.value) : undefined); setLocalError(null); }}
              placeholder="0"
              min={0}
              className={inp}
            />
          </div>

          {/* ── Notes (edit only) ── */}
          {mode === 'edit' && (
            <div>
              <label className={lbl}>Notes Portalis</label>
              <textarea
                value={form.portalis_notes}
                onChange={e => setField('portalis_notes', e.target.value)}
                placeholder="Notes internes, remarques..."
                rows={3}
                maxLength={2000}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-[var(--bd-def)] text-sm text-[var(--tx-1)] bg-white',
                  'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20',
                  'transition-colors resize-none placeholder:text-[var(--tx-3)]',
                )}
              />
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg text-sm text-[var(--tx-2)] border border-[var(--bd-def)] hover:bg-[var(--bg-sink)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 rounded-lg text-sm text-white font-semibold disabled:opacity-60 transition-all"
              style={{ background: 'var(--grad)' }}
            >
              {saving ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
