'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PostData, GetData } from '@/lib/ApiService';
import { type ProspectNote, type ProspectCR, type GenerateCRBody, type CRPendingResponse } from '@/types/prospect_note_type';
import { ApiRoutes } from '@/lib/ApiRoutes';
import {
  MicrophoneIcon, SquareIcon, ArrowLeftIcon, CheckIcon, XIcon,
  ArrowClockwiseIcon, WarningIcon, DownloadSimpleIcon, FolderSimpleIcon,
  CaretRightIcon, CaretDownIcon, SparkleIcon, CheckCircleIcon,
  FileTextIcon, PencilSimpleIcon, CircleNotchIcon, InfoIcon,
} from '@phosphor-icons/react';
import { FloatingToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Blocknote } from '@/components/ui/blocknote';
import RightPanel from '@/components/layout/rightPanel';
import WaveformBars from '@/components/layout/waveformBars';
import FolderModal from '@/components/layout/folderModal';
import { ProspectPicker, type CRContext } from '@/components/layout/prospect-picker';

/* ─── Types ────────────────────────────────────────────────────── */
type AppState = 'context' | 'idle' | 'recording' | 'transcript' | 'processing' | 'draft' | 'validated' | 'error';
type ProcStep = 'pending' | 'active' | 'done';

/* ─── Constants ────────────────────────────────────────────────── */

const DRAFT_FIELDS: { label: string; confidence: 'high' | 'low' }[] = [
  { label: 'Société',          confidence: 'high' },
  { label: 'Contact',          confidence: 'high' },
  { label: 'Date',             confidence: 'high' },
  { label: 'Objet',            confidence: 'low'  },
  { label: 'Points discutés',  confidence: 'low'  },
  { label: 'Actions',          confidence: 'low'  },
  { label: 'Prochaine étape',  confidence: 'low'  },
];

/* ─── Markdown renderer ─────────────────────────────────────────── */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function inlineBold(line: string): React.ReactNode {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} className="font-semibold text-[var(--tx-1)]">{p.slice(2, -2)}</strong>
        : (p || null)
    );
  }

  function flushBullets() {
    if (!bulletBuffer.length) return;
    nodes.push(
      <ul key={key++} className="space-y-1 mb-2 pl-1">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--tx-2)]">
            <span className="w-[5px] h-[5px] rounded-full flex-shrink-0 mt-[5px]"
              style={{ background: 'rgba(107,53,201,0.4)' }} />
            <span>{inlineBold(b)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.replace(/\\$/, '').trimEnd();
    const trimmed = line.trim();

    // Bullet: * ou -
    if (/^[*-] /.test(line)) {
      bulletBuffer.push(line.slice(2));
      continue;
    }

    flushBullets();

    if (!trimmed) {
      nodes.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    // Heading ## ou #
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <p key={key++} className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mt-4 mb-1.5 pb-1 border-b border-[var(--bd-def)] font-mono">
          {trimmed.slice(3)}
        </p>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      nodes.push(
        <p key={key++} className="text-[13px] font-bold text-[var(--tx-1)] mt-4 mb-1.5">
          {trimmed.slice(2)}
        </p>
      );
      continue;
    }

    // Ligne entièrement en gras → section (ex: **INFORMATIONS GÉNÉRALES**)
    if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
      const content = trimmed.replace(/^\*\*|\*\*\s*$/g, '');
      nodes.push(
        <p key={key++} className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mt-4 mb-1.5 pb-1 border-b border-[var(--bd-def)] font-mono">
          {content}
        </p>
      );
      continue;
    }

    nodes.push(
      <p key={key++} className="text-[12px] leading-relaxed text-[var(--tx-2)] mb-1">
        {inlineBold(line)}
      </p>
    );
  }

  flushBullets();
  return nodes;
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function NouveauCRPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'fr';

  const prospectCompany = searchParams?.get('company') ?? '';
  const prospectContact = searchParams?.get('contact') ?? '';
  const prospectId      = searchParams?.get('prospect_id') ?? '';

  /* Derive initial crContext from URL params (set when coming from prospect detail) */
  const [crContext, setCrContext] = useState<CRContext | null>(() => {
    if (prospectId || prospectCompany) {
      return {
        type:      'prospection',
        label:     prospectCompany || 'Prospect',
        sublabel:  prospectContact || undefined,
        reference: prospectId ? `PROS-${prospectId.slice(0, 8).toUpperCase()}` : undefined,
        id:        prospectId || undefined,
      };
    }
    return null;
  });

  /* Start in 'context' selection if no context was passed via URL */
  const [state, setState] = useState<AppState>(
    () => (prospectId || prospectCompany ? 'idle' : 'context'),
  );

  /* Recording */
  const [timerSec, setTimerSec]         = useState(0);
  const [isLowAudio, setIsLowAudio]     = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const timerRef         = useRef<NodeJS.Timeout | null>(null);
  const savedDuration    = useRef('0:00');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  /* Transcript */
  const [transcriptText, setTranscriptText] = useState('');

  /* Processing */
  const [procSteps, setProcSteps] = useState<[ProcStep, ProcStep, ProcStep]>(['pending', 'pending', 'pending']);
  const [procPct, setProcPct]     = useState(0);
  const [procEta, setProcEta]     = useState('');
  const procTimeouts = useRef<NodeJS.Timeout[]>([]);

  /* Draft */
  const [draftValues, setDraftValues] = useState<Record<string, string>>(() => {
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    return {
      'Société':         prospectCompany || '',
      'Contact':         prospectContact || '',
      'Date':            today,
      'Objet':           '',
      'Points discutés': '',
      'Actions':         '',
      'Prochaine étape': '',
    };
  });
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [accordOpen, setAccordOpen] = useState(false);

  /* CR generation */
  const [generatedCR, setGeneratedCR]     = useState<ProspectCR | null>(null);
  const [preparing, setPreparing]         = useState(false);
  const [generating, setGenerating]       = useState<'pdf' | 'word' | null>(null);
  const [genError, setGenError]           = useState<string | null>(null);

  /* UI */
  const [folderModal, setFolderModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  /* Input mode for idle state */
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [textContent, setTextContent] = useState('');

  /* Computed */
  const wordCount = transcriptText.trim() ? transcriptText.trim().split(/\s+/).length : 0;

  /* ── Helpers ──────────────────────────────────────────────── */
  function fmtTime(sec: number) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  async function downloadGeneratedCR(format: 'pdf' | 'word') {
    if (!generatedCR || !crContext?.id) return;
    setGenerating(format);
    const directUrl = generatedCR.download_url;
    if (directUrl) {
      window.open(directUrl, '_blank');
      setGenerating(null);
      return;
    }
    const res = await GetData<{ url?: string }>({
      url: ApiRoutes.PROSPECT_CR_DOWNLOAD(crContext.id, generatedCR.id),
      protected: true,
    });
    if (res.ok && res.data?.url) {
      window.open(res.data.url, '_blank');
    } else {
      setGenError(res.error ?? 'Erreur lors du téléchargement du CR');
    }
    setGenerating(null);
  }

  function clearProcTimeouts() {
    procTimeouts.current.forEach(clearTimeout);
    procTimeouts.current = [];
  }


  /* ── Recording ──────────────────────────────────────────────── */
  async function startRecording() {
    setTranscriptionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);

      setTimerSec(0);
      setIsLowAudio(false);
      setState('recording');
      timerRef.current = setInterval(() => setTimerSec(s => s + 1), 1000);
    } catch {
      setTranscriptionError('Microphone non disponible ou accès refusé.');
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    savedDuration.current = fmtTime(timerSec);
    setIsTranscribing(true);

    mediaRecorderRef.current.onstop = async () => {
      const rawMime = audioChunksRef.current[0]?.type ?? 'audio/webm';
      const mimeType = rawMime.split(';')[0];
      const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());

      const audioFile = new File([blob], `recording.${ext}`, { type: mimeType });
      const res = await PostData<{ text: string }>({
        url: ApiRoutes.VOCAL_TRANSCRIBE,
        data: { file: audioFile } as unknown as Record<string, unknown>,
        isMultipart: true,
        protected: true,
      });

      setIsTranscribing(false);
      if (!res.ok || !res.data) {
        setTranscriptionError(res.error ?? 'Erreur lors de la transcription.');
        setState('error');
        return;
      }
      setTranscriptText(res.data.text);
      setState('transcript');
    };

    mediaRecorderRef.current.stop();
  }

  function cancelRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
    }
    setIsTranscribing(false);
    setState('idle');
  }

  /* ── Sauvegarde note → état draft ──────────────────────────── */
  const saveNote = useCallback(async (overrideContent?: string) => {
    setGenError(null);
    const noteContent = overrideContent ?? transcriptText;
    if (!crContext?.id) {
      setState('draft');
      return;
    }
    setPreparing(true);
    const saveRes = await PostData<ProspectNote>({
      url: ApiRoutes.PROSPECT_NOTES(crContext.id),
      data: { content: noteContent },
      protected: true,
    });
    setPreparing(false);
    if (!saveRes.ok || !saveRes.data) {
      setGenError(saveRes.error ?? 'Impossible de sauvegarder la note.');
      return;
    }
    setSavedNoteId(saveRes.data.id);
    setState('draft');
  }, [crContext, transcriptText]);

  /* ── Génération CR depuis l'état draft ──────────────────────── */
  const startProcessing = useCallback(async () => {
    setGenError(null);
    clearProcTimeouts();
    setState('processing');

    const add = (ms: number, fn: () => void) => {
      const t = setTimeout(fn, ms);
      procTimeouts.current.push(t);
    };

    /* Lance la génération si contexte disponible (202 immédiat, traitement en arrière-plan) */
    if (crContext?.id && savedNoteId) {
      const crRes = await PostData<CRPendingResponse, GenerateCRBody>({
        url: ApiRoutes.PROSPECT_CRS(crContext.id),
        data: { note_ids: [savedNoteId], template: 'standard' },
        protected: true,
      });

      if (!crRes.ok) {
        setGenError(crRes.error ?? 'Erreur lors du lancement de la génération');
        setState('draft');
        return;
      }
    }

    /* Animation locale indépendante du serveur (génération en arrière-plan) */
    setProcSteps(['pending', 'pending', 'pending']);
    setProcPct(0);
    add(100,  () => { setProcSteps(['active', 'pending', 'pending']); setProcPct(10);  setProcEta('Lancement…'); });
    add(1500, () => { setProcSteps(['done',   'active',  'pending']); setProcPct(50);  setProcEta('Traitement en cours…'); });
    add(4000, () => { setProcSteps(['done',   'done',    'active']);  setProcPct(80);  setProcEta('Finalisation…'); });
    add(6000, () => { setProcSteps(['done',   'done',    'done']);    setProcPct(100); setProcEta('Lancé'); });
    add(6400, () => setState('validated'));
  }, [crContext, savedNoteId]);

  /* ── Sync crContext → draftValues (Société / Contact) ───────── */
  useEffect(() => {
    if (!crContext) return;
    setDraftValues(v => ({
      ...v,
      'Société': crContext.label,
      ...(crContext.sublabel ? { 'Contact': crContext.sublabel } : {}),
    }));
  }, [crContext]);

  /* ── Cleanup ─────────────────────────────────────────────────── */
  useEffect(() => () => {
    if (timerRef.current)   clearInterval(timerRef.current);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    clearProcTimeouts();
  }, []);

  /* ── State-machine steps labels ──────────────────────────────── */
  const STEP_LABELS = [
    { pending: 'Réception',             active: 'Réception en cours…',         done: 'Note reçue' },
    { pending: 'Analyse & structuration', active: 'Analyse & structuration…',  done: 'Structuration terminée' },
    { pending: 'Rédaction du CR',       active: 'Rédaction en cours…',         done: 'CR rédigé' },
  ];

  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  /* ─────────────────── Render ────────────────────────────────── */
  return (
    <>
      {/* CSS for subtle animations */}
      <style>{`
        @keyframes cr-blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        @keyframes cr-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
        .cr-ring { animation: cr-pulse 2s ease-in-out infinite; }
        .cr-rec-dot { animation: cr-blink 1s ease-in-out infinite; }
        .cr-cursor { display:inline-block;width:2px;height:14px;background:#0E86E8;vertical-align:middle;margin-left:2px;animation:cr-blink 1s ease-in-out infinite; }
      `}</style>

      <div className="p-4 sm:p-7 pb-16">

        {/* ── Page header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="link"
                size="xs"
                onClick={() => router.back()}
                className="gap-1.5 !text-[12px]"
              >
                <ArrowLeftIcon size={12} />
                Comptes-rendus
              </Button>
              <CaretRightIcon size={10} className="text-[var(--tx-3)]" />
              <span className="text-[12px] text-[var(--tx-3)]">Nouveau CR</span>
            </div>
            <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-foreground tracking-tight leading-tight">
              Dictée vocale
            </h1>
            <p className="text-[var(--tx-3)] text-[12px] mt-0.5">
              M-08 · Compte-rendu de visite · IA · {dateStr}
            </p>
          </div>
        </div>

        {/* ── Two-column layout ────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* ── Main card ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ── CONTEXT ──────────────────────────────────── */}
            {state === 'context' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
                <div className="p-7">
                  <ProspectPicker
                    initialType={crContext?.type ?? null}
                    onSelect={ctx => { setCrContext(ctx); setState('idle'); }}
                    onSkip={() => { setCrContext(null); setState('idle'); }}
                  />
                </div>
              </div>
            )}

            {/* ── IDLE ─────────────────────────────────────── */}
            {state === 'idle' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
                <div className="p-7">
                  {/* Context chip — verrouillé si venu d'un prospect, sinon cliquable */}
                  {crContext ? (
                    prospectId || prospectCompany ? (
                      /* Lecture seule : contexte imposé depuis la page détail */
                      <div className="flex items-center gap-2.5 w-full bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl px-3 py-2.5 mb-6 text-left">
                        <span className="text-[10px] text-[var(--tx-3)] font-mono">{crContext.reference ?? crContext.type}</span>
                        <span className="w-px h-3.5 bg-[var(--bd-def)]" />
                        <span className="text-[13px] font-bold text-[var(--tx-1)] flex-1 truncate">{crContext.label}</span>
                        {crContext.sublabel && (
                          <span className="text-[11px] text-[var(--tx-3)] max-w-[130px] truncate">{crContext.sublabel}</span>
                        )}
                      </div>
                    ) : (
                      /* Cliquable : contexte sélectionné via le picker, modifiable */
                      <button
                        onClick={() => setState('context')}
                        className="flex items-center gap-2.5 w-full bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl px-3 py-2.5 mb-6 hover:border-[rgba(14,134,232,0.4)] hover:bg-[rgba(14,134,232,0.04)] transition-colors text-left"
                      >
                        <span className="text-[10px] text-[var(--tx-3)] font-mono">{crContext.reference ?? crContext.type}</span>
                        <span className="w-px h-3.5 bg-[var(--bd-def)]" />
                        <span className="text-[13px] font-bold text-[var(--tx-1)] flex-1 truncate">{crContext.label}</span>
                        {crContext.sublabel && (
                          <span className="text-[11px] text-[var(--tx-3)] max-w-[130px] truncate">{crContext.sublabel}</span>
                        )}
                        <CaretRightIcon size={12} className="text-[var(--tx-3)] flex-shrink-0" />
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setState('context')}
                      className="flex items-center gap-2.5 w-full bg-[var(--bg-sink)] border border-dashed border-[var(--bd-def)] rounded-xl px-3 py-2.5 mb-6 hover:border-primary-400 hover:bg-[rgba(14,134,232,0.04)] transition-colors text-left"
                    >
                      <span className="text-[12px] text-[var(--tx-3)] flex-1">Sélectionner le contexte du CR</span>
                      <CaretRightIcon size={12} className="text-[var(--tx-3)]" />
                    </button>
                  )}

                  {/* Input mode toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-sink)] border border-[var(--bd-def)] mb-5">
                    {([
                      { key: 'voice' as const, icon: <MicrophoneIcon size={13} />, label: 'Dictée vocale' },
                      { key: 'text'  as const, icon: <PencilSimpleIcon size={13} />, label: 'Saisie texte' },
                    ]).map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setInputMode(tab.key)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150',
                          inputMode === tab.key
                            ? 'bg-white text-[var(--tx-1)] shadow-sm border border-[var(--bd-def)]'
                            : 'text-[var(--tx-3)] hover:text-[var(--tx-2)]',
                        )}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Voice mode */}
                  {inputMode === 'voice' && (
                    <>
                      <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4 mb-7">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-3 font-mono">Dites dans votre CR</div>
                        <div className="space-y-2">
                          {[
                            'La société et le contact rencontré',
                            "L'objet de la réunion",
                            'Les points discutés et le budget évoqué',
                            'Les actions convenues et les délais',
                            'La prochaine étape et la date de décision',
                          ].map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-[13px] text-[var(--tx-2)]">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[6px]" style={{ background: 'rgba(14,134,232,0.35)' }} />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <Button
                          variant="gradient"
                          iconOnly
                          onClick={startRecording}
                          className="!w-[72px] !h-[72px] !rounded-[20px] hover:scale-105 active:scale-95"
                          style={{ boxShadow: '0 4px 24px rgba(107,53,201,0.35)' }}
                          aria-label="Démarrer l'enregistrement"
                        >
                          <MicrophoneIcon size={28} />
                        </Button>
                        <span className="text-[13px] text-[var(--tx-3)]">Appuyer pour enregistrer</span>
                      </div>
                    </>
                  )}

                  {/* Text / Blocknote mode */}
                  {inputMode === 'text' && (
                    <>
                      <Blocknote
                        initialContent={textContent}
                        onChange={setTextContent}
                        placeholder="Rédigez votre compte-rendu — société, contact, objet, points discutés, actions, prochaine étape…"
                        className="mb-4"
                      />
                      <div className="flex items-center justify-between mb-5 px-1">
                        <span className="text-[10px] text-[var(--tx-3)] font-mono">
                          {textContent.trim() ? textContent.trim().split(/\s+/).length : 0} mots
                        </span>
                        <span className="text-[10px] text-[var(--tx-3)]">Cliquez pour modifier</span>
                      </div>
                      <Button
                        variant="gradient"
                        size="lg"
                        onClick={() => { setTranscriptText(textContent); saveNote(textContent); }}
                        disabled={!textContent.trim() || preparing}
                        className="w-full"
                        style={{ boxShadow: preparing ? 'none' : '0 2px 12px rgba(107,53,201,0.3)' }}
                      >
                        {preparing
                          ? <><CircleNotchIcon size={16} className="animate-spin" /> Sauvegarde en cours…</>
                          : <><FileTextIcon size={16} /> Ajouter une note</>
                        }
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── RECORDING ────────────────────────────────── */}
            {state === 'recording' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: isLowAudio ? '#F59E0B' : '#EF4444' }} />
                <div className="p-7">
                  {/* Timer + REC badge */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display text-[38px] font-bold text-[var(--tx-1)] leading-none tracking-tight">
                      {fmtTime(timerSec)}
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <span className="w-[7px] h-[7px] rounded-full cr-rec-dot" style={{ background: '#EF4444' }} />
                      <span className="text-[11px] font-bold" style={{ color: '#DC2626' }}>REC</span>
                    </div>
                  </div>

                  {/* Pulse rings + stop button */}
                  <div className="flex justify-center mb-5">
                    <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                      {[120, 96, 74].map((size, i) => (
                        <div
                          key={i}
                          className="cr-ring absolute rounded-full border-2"
                          style={{
                            width: size, height: size,
                            borderColor: isLowAudio ? '#F59E0B' : '#EF4444',
                            opacity: [0.12, 0.28, 0.50][i],
                            animationDelay: `${i * 0.25}s`,
                          }}
                        />
                      ))}
                      <Button
                        variant="danger"
                        iconOnly
                        onClick={stopRecording}
                        className="relative z-10 !w-[58px] !h-[58px] !rounded-2xl !border-0 hover:scale-105"
                        style={{
                          background: isLowAudio ? '#F59E0B' : '#EF4444',
                          boxShadow: `0 4px 20px ${isLowAudio ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        }}
                        aria-label="Arrêter"
                      >
                        <SquareIcon size={22} weight="fill" />
                      </Button>
                    </div>
                  </div>

                  {/* Waveform */}
                  <WaveformBars active={state === 'recording'} low={isLowAudio} />

                  {/* Low audio warning */}
                  {isLowAudio && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-[12px] font-medium"
                      style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
                      <WarningIcon size={14} style={{ flexShrink: 0 }} />
                      Parlez plus près du micro — signal trop faible
                    </div>
                  )}

                  {/* Transcription status zone */}
                  <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-3.5 mb-4 min-h-[88px] flex flex-col justify-center">
                    {isTranscribing ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <CircleNotchIcon size={20} className="animate-spin" style={{ color: '#6B35C9' }} />
                        <span className="text-[12px] text-[var(--tx-3)]">Transcription en cours…</span>
                      </div>
                    ) : transcriptionError ? (
                      <div className="flex items-start gap-2 text-[12px]" style={{ color: '#DC2626' }}>
                        <WarningIcon size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        {transcriptionError}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-[5px] h-[5px] rounded-full cr-rec-dot" style={{ background: '#10B981' }} />
                        <span className="text-[12px] text-[var(--tx-3)]">
                          Enregistrement en cours — la transcription sera générée à l&apos;arrêt
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cancel */}
                  <div className="flex justify-center pt-2 border-t border-[var(--bd-def)]">
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={cancelRecording}
                    >
                      <XIcon size={12} />
                      Annuler l&apos;enregistrement
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TRANSCRIPT ───────────────────────────────── */}
            {state === 'transcript' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
                <div className="p-7">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-bold text-[var(--tx-1)] font-display">Transcription brute</h2>
                      <p className="text-[10px] text-[var(--tx-3)] font-mono mt-1">
                        {wordCount} mots · {savedDuration.current} · Vérifiez avant structuration IA
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' }}>
                      ASR · à vérifier
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl p-3 mb-4 text-[12px] leading-relaxed"
                    style={{ background: 'rgba(107,53,201,0.05)', border: '1px solid rgba(107,53,201,0.18)', color: '#5829A8' }}>
                    <InfoIcon size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Corrigez les erreurs <strong>avant</strong> d&apos;envoyer à IA — chiffres, noms propres, ponctuation.
                    </span>
                  </div>

                  <Blocknote
                    initialContent={transcriptText}
                    onChange={setTranscriptText}
                    placeholder="Corrigez les erreurs — chiffres, noms propres, ponctuation…"
                    className="mb-4"
                  />
                  <div className="flex items-center justify-between mb-5 px-1">
                    <span className="text-[10px] text-[var(--tx-3)] font-mono">{wordCount} mots</span>
                    <span className="text-[10px] text-[var(--tx-3)]">Cliquez pour modifier</span>
                  </div>

                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={saveNote}
                    disabled={preparing}
                    className="w-full mb-3"
                    style={{ boxShadow: preparing ? 'none' : '0 2px 12px rgba(107,53,201,0.3)' }}
                  >
                    {preparing
                      ? <><CircleNotchIcon size={16} className="animate-spin" /> Sauvegarde en cours…</>
                      : <><FileTextIcon size={16} /> Ajouter une note</>
                    }
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="md" onClick={startRecording} className="flex-1">
                      <MicrophoneIcon size={13} /> Ré-enregistrer
                    </Button>
                    <Button variant="danger-ghost" size="md" onClick={() => setState('idle')} className="flex-1">
                      <XIcon size={13} /> Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROCESSING ───────────────────────────────── */}
            {state === 'processing' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
                <div className="p-7">
                  <div className="rounded-2xl p-5" style={{ background: 'rgba(107,53,201,0.05)' }}>
                    {/* Agent */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0"
                        style={{ background: 'var(--grad)', boxShadow: '0 2px 10px rgba(107,53,201,0.3)' }}>
                        ✦
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-[var(--tx-1)]">Agent CR Vocal</div>
                        <div className="text-[10px] text-[var(--tx-3)] font-mono mt-0.5">IA · M-08</div>
                        <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: '#059669' }}>
                          <CheckIcon size={9} />
                          Transcription validée par vous
                        </div>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 mb-5">
                      {procSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 border-[1.5px]',
                            step === 'done'   && 'border-primary-400 bg-[rgba(16,185,129,0.1)]',
                            step === 'active' && 'border-[#6B35C9] bg-[rgba(107,53,201,0.1)]',
                            step === 'pending' && 'border-[var(--bd-def)] bg-[var(--bg-sink)]',
                          )}>
                            {step === 'done'   && <CheckIcon size={10} style={{ color: '#10B981' }} />}
                            {step === 'active' && <CircleNotchIcon size={11} style={{ color: '#6B35C9' }} className="animate-spin" />}
                            {step === 'pending' && <span className="text-[var(--tx-3)] text-[9px]">—</span>}
                          </div>
                          <span className={cn('text-[13px] font-medium',
                            step === 'done'    && 'text-primary',
                            step === 'active'  && 'text-[#5829A8] font-semibold',
                            step === 'pending' && 'text-[var(--tx-3)]',
                          )}>
                            {STEP_LABELS[i][step]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(107,53,201,0.15)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${procPct}%`, background: 'linear-gradient(90deg,#0E86E8,#6B35C9)' }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono" style={{ color: '#6B35C9' }}>{procPct}%</span>
                      <span className="text-[11px] text-[var(--tx-3)]">{procEta}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DRAFT ────────────────────────────────────── */}
            {state === 'draft' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: 'var(--grad)' }} />
                <div className="p-7">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base flex-shrink-0"
                        style={{ background: 'var(--grad)' }}>✦</div>
                      <div>
                        <div className="text-[13px] font-bold text-[var(--tx-1)]">Brouillon CR</div>
                        <div className="text-[10px] text-[var(--tx-3)] font-mono mt-0.5">
                          Généré en 7s · {wordCount} mots structurés
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'var(--grad)' }}>
                      ✦ Généré par IA
                    </span>
                  </div>

                  {/* Fields */}
                  <div className="border border-[var(--bd-def)] rounded-xl overflow-hidden mb-4 divide-y divide-[var(--bd-def)]">
                    {DRAFT_FIELDS.map(f => {
                      const isLow = f.confidence === 'low';
                      return (
                        <div
                          key={f.label}
                          className="flex items-stretch"
                          style={isLow ? { borderColor: '#FCD34D' } : {}}
                        >
                          <div
                            className="w-[120px] flex-shrink-0 px-3 py-2.5 text-[11px] font-semibold flex items-center border-r"
                            style={isLow
                              ? { background: '#FEF9C3', borderColor: '#FCD34D', color: '#92400E' }
                              : { background: 'var(--bg-sink)', borderColor: 'var(--bd-def)', color: 'var(--tx-3)' }}
                          >
                            {f.label}
                          </div>
                          <div className="flex-1 px-3 py-2.5 text-[13px]"
                            style={isLow ? { background: '#FFFBEB', color: '#92400E' } : { color: 'var(--tx-1)' }}>
                            {isLow ? (
                              <input
                                className="w-full bg-transparent outline-none text-[13px]"
                                style={{ color: '#92400E' }}
                                value={draftValues[f.label] ?? ''}
                                placeholder="—"
                                onChange={e => setDraftValues(v => ({ ...v, [f.label]: e.target.value }))}
                              />
                            ) : (
                              draftValues[f.label] || '—'
                            )}
                          </div>
                          <div className="w-9 flex-shrink-0 flex items-center justify-center"
                            style={isLow ? { background: '#FFFBEB' } : { background: 'white' }}>
                            {isLow ? (
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
                                style={{ background: 'rgba(245,158,11,0.1)', border: '1.5px solid #F59E0B', color: '#92400E' }}
                                title="Vérifier — confiance faible">?</span>
                            ) : (
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1.5px solid #10B981', color: '#065F46' }}>✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Transcript accordion */}
                  <div className="border border-[var(--bd-def)] rounded-xl mb-5 overflow-hidden">
                    <Button
                      variant="ghost"
                      onClick={() => setAccordOpen(o => !o)}
                      className="w-full !h-auto justify-between !rounded-none !px-4 !py-3 !bg-[var(--bg-sink)] hover:!bg-[var(--bd-def)] text-[12px] font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <MicrophoneIcon size={12} />
                        Voir la transcription source
                      </span>
                      <CaretDownIcon size={13} className={cn('text-[var(--tx-3)] transition-transform', accordOpen && 'rotate-180')} />
                    </Button>
                    {accordOpen && (
                      <div className="px-4 py-3 border-t border-[var(--bd-def)] bg-white">
                        {renderMarkdown(transcriptText)}
                      </div>
                    )}
                  </div>

                  {/* CTAs */}
                  {genError && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-3 text-[12px]"
                      style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', color: '#DC2626' }}>
                      <WarningIcon size={14} className="flex-shrink-0 mt-0.5" />
                      <span>{genError}</span>
                    </div>
                  )}
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={startProcessing}
                    disabled={preparing}
                    className="w-full mb-2.5"
                    style={{ boxShadow: preparing ? 'none' : '0 2px 12px rgba(107,53,201,0.3)' }}
                  >
                    {preparing
                      ? <><CircleNotchIcon size={16} className="animate-spin" /> Génération en cours…</>
                      : <><SparkleIcon size={16} /> Générer le compte rendu</>
                    }
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="md" onClick={() => setState('transcript')} className="flex-1">
                      <PencilSimpleIcon size={12} /> Modifier la transcription
                    </Button>
                    <Button variant="danger-ghost" size="md" onClick={() => setState('error')} className="flex-1">
                      <XIcon size={12} /> Rejeter
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── VALIDATED ────────────────────────────────── */}
            {state === 'validated' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px]" style={{ background: '#10B981' }} />
                <div className="p-7 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '3px solid #10B981' }}>
                    <CheckIcon size={30} style={{ color: '#10B981' }} weight="bold" />
                  </div>
                  <h2 className="text-[18px] font-bold text-[var(--tx-1)] font-display mb-2">CR généré avec succès</h2>
                  <p className="text-[13px] text-[var(--tx-3)] leading-relaxed mb-3">
                    {crContext?.label ?? 'Sans contexte'}{crContext?.sublabel ? ` · ${crContext.sublabel}` : ''}<br />
                    CR généré par IA{crContext?.id ? ` · lié au prospect #${crContext.id.slice(0, 8)}` : ' · archivé dans PortaLis'}
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold mb-3"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', color: '#065F46' }}>
                    <CheckCircleIcon size={13} />
                    Généré · en arrière-plan
                  </div>
                  {crContext?.id && (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold mb-6 ml-2"
                      style={{ background: 'rgba(14,134,232,0.08)', border: '1px solid rgba(14,134,232,0.25)', color: '#0E86E8' }}>
                      <InfoIcon size={13} />
                      Email envoyé automatiquement
                    </div>
                  )}

                  {/* Paradigm box */}
                  <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-4 text-left mb-6">
                    <div className="text-[12px] font-bold text-[var(--tx-1)] mb-2">Résumé de l&apos;action — Paradigme 70 / 30</div>
                    <div className="text-[12px] text-[var(--tx-3)] leading-relaxed">
                      IA (70 %) : transcription + structuration + rédaction des 6 champs<br />
                      Vous (30 %) : relecture · correction champ « Points discutés » · envoi
                    </div>
                  </div>

                  {/* Export */}
                  {/* <div className="border-t border-[var(--bd-def)] pt-5 mb-5 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] font-mono mb-3">Exporter le CR</div>
                    {genError && (
                      <p className="text-[11px] text-red-500 mb-2">{genError}</p>
                    )}
                    {generatedCR && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-[11px]"
                        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }}>
                        <CheckCircleIcon size={12} />
                        CR v{generatedCR.version + 1} généré ·{' '}
                        {generatedCR.file_size ? `${(generatedCR.file_size / 1024).toFixed(1)} Ko` : '–'}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {[
                        { fmt: 'pdf' as const, label: 'Télécharger PDF', sub: 'Format A4 · impression' },
                        { fmt: 'word' as const, label: 'Télécharger Word', sub: '.doc · éditable' },
                      ].map(btn => {
                        const isLoading = generating === btn.fmt;
                        const disabled  = !!generating || !generatedCR;
                        return (
                          <Button
                            key={btn.fmt}
                            variant="ghost"
                            disabled={disabled}
                            onClick={() => downloadGeneratedCR(btn.fmt)}
                            className="flex-col !h-[60px] gap-1 w-full hover:!border-primary-500 hover:!bg-[rgba(14,134,232,0.04)]"
                          >
                            {isLoading
                              ? <CircleNotchIcon size={18} className="animate-spin text-primary-500" />
                              : <DownloadSimpleIcon size={18} className="text-primary-500" />
                            }
                            <span className="text-[12px] font-semibold text-[var(--tx-1)]">
                              {isLoading ? 'Téléchargement…' : btn.label}
                            </span>
                            <span className="text-[10px] text-[var(--tx-3)]">{btn.sub}</span>
                          </Button>
                        );
                      })}
                    </div>
                    {!generatedCR && (
                      <p className="text-[11px] text-[var(--tx-3)] text-center mb-2">
                        {crContext?.id
                          ? 'Le CR est en cours de génération…'
                          : 'Associez un prospect pour activer le téléchargement'}
                      </p>
                    )}
                    <Button
                      variant="dashed"
                      size="md"
                      onClick={() => setFolderModal(true)}
                      className="w-full"
                    >
                      <FolderSimpleIcon size={14} />
                      Enregistrer dans un dossier PortaLis
                    </Button>
                  </div> */}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => router.back()}
                      className="flex-1"
                    >
                      <ArrowLeftIcon size={14} /> Retour
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => { setState('idle'); setTimerSec(0); setTranscriptText(''); setGeneratedCR(null); setGenError(null); }}
                      className="flex-1"
                    >
                      <MicrophoneIcon size={14} /> Nouveau CR
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ERROR ────────────────────────────────────── */}
            {state === 'error' && (
              <div className="bg-white border border-[var(--bd-def)] rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[3px] bg-[#EF4444]" />
                <div className="p-7 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}>
                    <WarningIcon size={26} style={{ color: '#EF4444' }} />
                  </div>
                  <h2 className="text-[17px] font-bold text-[var(--tx-1)] font-display mb-2">Traitement interrompu</h2>
                  <p className="text-[13px] text-[var(--tx-3)] leading-relaxed mb-4">
                    La connexion a été perdue pendant le traitement par IA.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-semibold mb-6"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', color: '#065F46' }}>
                    <CheckCircleIcon size={12} />
                    Enregistrement conservé · {savedDuration.current}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="gradient"
                      size="lg"
                      onClick={startProcessing}
                      className="w-full"
                      style={{ boxShadow: '0 2px 12px rgba(107,53,201,0.3)' }}
                    >
                      <ArrowClockwiseIcon size={16} /> Réessayer l&apos;envoi
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setState('transcript')}
                      className="w-full"
                    >
                      Réécouter l&apos;enregistrement
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setState('idle')}
                      className="w-full underline underline-offset-2"
                    >
                      Saisir manuellement le CR
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel ──────────────────────────────────── */}
          <div className="sticky top-6 w-[260px] flex-shrink-0 hidden lg:block">
            <RightPanel
              state={state}
              wordCount={wordCount}
              crContext={crContext}
              generatedCR={generatedCR}
              nextStep={draftValues['Prochaine étape'] || undefined}
              actions={draftValues['Actions'] || undefined}
            />
          </div>
        </div>
      </div>

      {/* ── Folder modal ─────────────────────────────────────── */}
      <FolderModal
        open={folderModal}
        onClose={() => setFolderModal(false)}
        onSave={name => { setFolderModal(false); showToast(`CR enregistré dans ${name}`); }}
      />

      {/* ── Toast ────────────────────────────────────────────── */}
      <FloatingToast message={toast} />
    </>
  );
}
