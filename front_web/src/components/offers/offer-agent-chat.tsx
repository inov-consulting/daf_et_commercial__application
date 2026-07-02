'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatCircleIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { PostData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';

// ── API types ─────────────────────────────────────────────────────────────────

interface ChatApiResponse {
  offer_id: string;
  session_id: string;
  response: string;
  status: string;
}

export interface GeneratedTransportOffer {
  offer_id: string;
  status: string;
  title: string;
  reference: string;
  date: string;
  validity_days: number;
  sections: Array<Record<string, unknown>>;
  pricing: Array<Record<string, unknown>>;
  route: {
    origin: string;
    destination: string;
    transport_mode: string;
    vehicle_type: string;
    planned_date: string;
  };
  client: {
    name: string;
    odoo_partner_id: number;
  };
  footer: string;
  document_generated_at: string;
  parse_error: boolean;
}

export interface OfferFromChat {
  offerId: string;
  data: GeneratedTransportOffer;
}

// ── Internal types ────────────────────────────────────────────────────────────

type ChatPhase = 'welcome' | 'chatting' | 'generating';

interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
  id: string;
}

// ── Markdown renderer (agent messages only) ───────────────────────────────────

/**
 * Normalise les messages de l'API qui arrivent parfois sur une seule ligne.
 * Injecte des \n avant chaque "- " (bullet) et autour des ``` (blocs).
 */
function preprocessMarkdown(raw: string): string {
  return raw
    // ``` sur sa propre ligne (avant)
    .replace(/([^\n`]) {0,2}```(\w*)/g, '$1\n```$2')
    // ``` sur sa propre ligne (après l'ouverture)
    .replace(/```(\w*) +(?!\n)/g, '```$1\n')
    // Bullet inline: " - **" ou " - Mot" → "\n- ..."
    .replace(/([^\n]) +- (?=\*\*|[A-ZÀ-ÿa-z])/g, '$1\n- ')
    // Nettoie les lignes vides multiples
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convertit **gras** en <strong> */
function parseBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontWeight: 700, color: '#1B2633' }}>{part.slice(2, -2)}</strong>
      : (part || null)
  );
}

/** Dans un bloc IA : détecte "**Clé** : valeur" et le rend comme une ligne info */
function BulletItem({ text, inBlock }: { text: string; inBlock: boolean }) {
  if (inBlock) {
    const kv = text.match(/^\*\*(.+?)\*\*\s*:\s*(.*)$/);
    if (kv) {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%' }}>
          <span style={{ fontSize: 11, color: '#7691A8', flexShrink: 0, minWidth: 110, paddingTop: 1 }}>
            {kv[1]}
          </span>
          <span style={{ fontSize: 12, color: '#1B2633', fontWeight: 600, flex: 1, lineHeight: 1.55 }}>
            {kv[2]}
          </span>
        </div>
      );
    }
  }
  return <span style={{ lineHeight: 1.6 }}>{parseBold(text)}</span>;
}

/** Rend un segment de texte (avec ou sans contexte de bloc IA) */
function renderLines(raw: string, inBlock = false): React.ReactNode {
  const lines  = raw.split('\n');
  const result: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key      = 0;
  let isFirst  = true;

  const flushBullets = () => {
    if (!bullets.length) return;
    result.push(
      <div key={key++} style={{ display: 'flex', flexDirection: 'column', marginTop: isFirst ? 6 : 4 }}>
        {bullets.map((item, bi) => {
          const isKV = inBlock && /^\*\*(.+?)\*\*\s*:/.test(item);
          return (
            <div
              key={bi}
              style={{
                display: 'flex', alignItems: 'flex-start',
                gap: isKV ? 0 : 7,
                padding: isKV ? '4px 0' : '2px 0',
                borderBottom: isKV && bi < bullets.length - 1 ? '1px solid #F3E2B0' : 'none',
              }}
            >
              {!isKV && (
                <span style={{ color: '#C3D0DF', fontSize: 9, flexShrink: 0, marginTop: 6, fontWeight: 900 }}>●</span>
              )}
              <span style={{ flex: 1 }}>
                <BulletItem text={item} inBlock={inBlock} />
              </span>
            </div>
          );
        })}
      </div>
    );
    bullets = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flushBullets(); continue; }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bullets.push(trimmed.slice(2).trim());
    } else {
      flushBullets();
      if (inBlock && isFirst) {
        // Première ligne du bloc = titre ambre avec séparateur
        result.push(
          <div key={key++} style={{
            fontSize: 12, fontWeight: 700, color: '#725A0A',
            paddingBottom: 8, marginBottom: 4, borderBottom: '1px solid #F3E2B0',
            lineHeight: 1.4,
          }}>
            {parseBold(trimmed)}
          </div>
        );
      } else {
        result.push(
          <div key={key++} style={{ fontSize: 13, color: '#435869', lineHeight: 1.65, marginTop: isFirst ? 0 : 4 }}>
            {parseBold(trimmed)}
          </div>
        );
      }
      isFirst = false;
    }
  }
  flushBullets();
  return <>{result}</>;
}

/** Composant principal : découpe le texte en segments texte / bloc IA */
function AgentMessageBody({ text }: { text: string }) {
  const normalized = preprocessMarkdown(text);
  const lines  = normalized.split('\n');
  const parts: Array<{ type: 'text' | 'block'; content: string }> = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith('```')) {
      // Bloc IA : tout ce qui suit jusqu'au prochain ``` (ou fin)
      i++;
      const blockLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        blockLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // saute le ``` fermant s'il existe
      const content = blockLines.join('\n').trim();
      if (content) parts.push({ type: 'block', content });
    } else {
      // Texte ordinaire jusqu'au prochain ```
      const textLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        textLines.push(lines[i]);
        i++;
      }
      const content = textLines.join('\n').trim();
      if (content) parts.push({ type: 'text', content });
    }
  }

  if (parts.length === 0) parts.push({ type: 'text', content: text });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {parts.map((p, idx) =>
        p.type === 'block' ? (
          <div
            key={idx}
            style={{
              background: '#FBF3DE', border: '1px solid #F3E2B0',
              borderRadius: 8, padding: '10px 12px',
            }}
          >
            {renderLines(p.content, true)}
          </div>
        ) : (
          <div key={idx}>{renderLines(p.content, false)}</div>
        )
      )}
    </div>
  );
}

// ── Detection du signal de génération ────────────────────────────────────────

const GENERATE_STATUSES = ['generating', 'ready_to_generate', 'complete', 'ready', 'done'];

function shouldGenerate(status: string): boolean {
  const s = status?.toLowerCase() ?? '';
  return GENERATE_STATUSES.some(k => s.includes(k));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface OfferAgentChatProps {
  onOfferGenerated: (result: OfferFromChat) => void;
  onCancel: () => void;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function OfferAgentChat({ onOfferGenerated, onCancel }: OfferAgentChatProps) {
  const [phase,     setPhase]     = useState<ChatPhase>('welcome');
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [offerId,   setOfferId]   = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addAgentMsg = (text: string) =>
    setMessages(p => [...p, { role: 'agent', text, id: Math.random().toString(36).slice(2) }]);

  const addUserMsg = (text: string) =>
    setMessages(p => [...p, { role: 'user', text, id: Math.random().toString(36).slice(2) }]);

  const triggerGenerate = useCallback(async (oid: string) => {
    setPhase('generating');
    const res = await PostData<GeneratedTransportOffer, Record<string, never>>({
      url: ApiRoutes.TRANSPORT_OFFERS_GENERATE(oid),
      data: {},
      protected: true,
    });
    if (res.ok && res.data) {
      onOfferGenerated({ offerId: res.data.offer_id ?? oid, data: res.data });
    }
  }, [onOfferGenerated]);

  async function startConversation() {
    setPhase('chatting');
    setIsTyping(true);

    const res = await PostData<ChatApiResponse, { message: string; session_id: null; offer_id: null }>({
      url: ApiRoutes.TRANSPORT_OFFERS_CHAT,
      data: { message: '', session_id: null, offer_id: null },
      protected: true,
    });

    setIsTyping(false);

    if (res.ok && res.data) {
      if (res.data.session_id) setSessionId(res.data.session_id);
      if (res.data.offer_id)   setOfferId(res.data.offer_id);
      addAgentMsg(res.data.response || 'Bonjour ! Pour quel client créons-nous cette offre ?');
      if (shouldGenerate(res.data.status) && res.data.offer_id) {
        triggerGenerate(res.data.offer_id);
      }
    } else {
      addAgentMsg('Bonjour ! Pour quel client créons-nous cette offre ?');
    }
    inputRef.current?.focus();
  }

  async function sendMessage() {
    const msg = input.trim();
    if (!msg || isTyping || phase !== 'chatting') return;

    setInput('');
    addUserMsg(msg);
    setIsTyping(true);

    const res = await PostData<ChatApiResponse, { message: string; session_id: string | null; offer_id: string | null }>({
      url: ApiRoutes.TRANSPORT_OFFERS_CHAT,
      data: { message: msg, session_id: sessionId, offer_id: offerId },
      protected: true,
    });

    setIsTyping(false);

    if (res.ok && res.data) {
      if (res.data.session_id) setSessionId(res.data.session_id);
      if (res.data.offer_id)   setOfferId(res.data.offer_id);
      addAgentMsg(res.data.response);

      const oidToGenerate = res.data.offer_id;
      if (shouldGenerate(res.data.status) && oidToGenerate) {
        setTimeout(() => triggerGenerate(oidToGenerate), 600);
      }
    }
  }

  // Auto-resize textarea to content (max ~5 lines)
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter seul → envoyer ; Shift+Enter → saut de ligne
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '500px', background: '#FFFFFF', border: '1px solid #DDE5EF', borderRadius: 14, boxShadow: '0 2px 8px rgba(18,58,38,.08)', overflow: 'hidden' }}>
      
      {/* ── Panel header ──────────────────────────────────────────────── */}
      <div
        style={{
          height: 48, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 10,
          background: '#F7F9FC', borderBottom: '1px solid #DDE5EF', flexShrink: 0,
        }}
      >
        {/* R-FM-02 : avatar IA = carré, jamais cercle */}
        <div
          style={{
            width: 24, height: 24, borderRadius: 5, background: '#92720C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0, fontSize: 13, fontWeight: 700,
          }}
        >
          ✦
        </div>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#725A0A' }}>
          Agent Offres — IA
        </span>
        <span
          style={{
            fontFamily: 'monospace', fontSize: 10, color: '#725A0A',
            background: '#FBF3DE', border: '1px solid #F3E2B0',
            borderRadius: 8, padding: '2px 7px',
          }}
        >
          ≤10s
        </span>
      </div>

      {/* ── Écran d'accueil ───────────────────────────────────────────── */}
      {phase === 'welcome' && (
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '32px 24px', gap: 0,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: '#FBF3DE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <ChatCircleIcon size={28} weight="duotone" style={{ color: '#92720C' }} />
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: '#1B2633', marginBottom: 8, textAlign: 'center' }}>
            Créer une offre par conversation
          </div>
          <div style={{ fontSize: 12, color: '#7691A8', textAlign: 'center', maxWidth: 260, lineHeight: 1.65, marginBottom: 24 }}>
            L&apos;agent vous pose quelques questions (client, trajet, marchandise, tarif…)
            puis génère l&apos;offre à partir de vos réponses.
          </div>

          <button
            onClick={startConversation}
            style={{
              width: '100%', maxWidth: 280, height: 42,
              border: 'none', borderRadius: 9,
              background: '#1E5B3C', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 2px 12px rgba(18,58,38,.22)',
            }}
          >
            <ChatCircleIcon size={15} weight="fill" />
            Démarrer la conversation
          </button>
        </div>
      )}

      {/* ── Conversation ──────────────────────────────────────────────── */}
      {(phase === 'chatting' || phase === 'generating') && (
        <>
          {/* Messages */}
          <div
            style={{
              flex: 1, overflowY: 'auto', padding: 12,
              display: 'flex', flexDirection: 'column', gap: 8,
              minHeight: 320,
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  maxWidth: '82%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'agent' && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}
                  >
                    {/* Mini avatar */}
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: 4, background: '#92720C',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 2,
                      }}
                    >
                      ✦
                    </div>
                    <div
                      style={{
                        background: '#fff', border: '1px solid #DDE5EF',
                        borderRadius: '12px 12px 12px 2px',
                        padding: '10px 13px', fontSize: 13, color: '#1B2633',
                      }}
                    >
                      <AgentMessageBody text={msg.text} />
                    </div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div
                    style={{
                      background: '#EEF7F1', border: '1px solid #B7DCC3',
                      borderRadius: '12px 12px 2px 12px',
                      padding: '9px 13px', fontSize: 13, color: '#184A31', lineHeight: 1.5,
                    }}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div
                  style={{
                    width: 20, height: 20, borderRadius: 4, background: '#92720C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 2,
                  }}
                >
                  ✦
                </div>
                <div
                  style={{
                    background: '#fff', border: '1px solid #DDE5EF',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '11px 14px', display: 'flex', gap: 4, alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="animate-bounce"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#B7C8D9', animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Generating state */}
            {phase === 'generating' && !isTyping && (
              <div
                style={{
                  alignSelf: 'flex-start', display: 'flex', alignItems: 'flex-start', gap: 8,
                }}
              >
                <div
                  style={{
                    width: 20, height: 20, borderRadius: 4, background: '#92720C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 2,
                  }}
                >
                  ✦
                </div>
                <div
                  style={{
                    background: '#FBF3DE', border: '1px solid #F3E2B0',
                    borderRadius: '12px 12px 12px 2px',
                    padding: '9px 13px', fontSize: 12, color: '#725A0A', lineHeight: 1.5,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span className="animate-spin" style={{ display: 'inline-block' }}>✦</span>
                  Génération du document en cours…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input footer */}
          <div
            style={{
              padding: '10px 12px', borderTop: '1px solid #DDE5EF',
              background: '#FAFBFD', flexShrink: 0,
              display: 'flex', alignItems: 'flex-end', gap: 8,
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={phase === 'generating' ? 'Génération en cours…' : 'Ex : Société Cotonnière du Faso'}
              disabled={phase === 'generating' || isTyping}
              style={{
                flex: 1, minHeight: 38, maxHeight: 120,
                border: '1px solid #DDE5EF', borderRadius: 10,
                padding: '9px 14px', fontSize: 13, fontFamily: 'inherit', color: '#1B2633',
                background: phase === 'generating' ? '#F7F9FC' : '#fff',
                outline: 'none', resize: 'none', lineHeight: 1.5,
                overflowY: 'auto',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping || phase === 'generating'}
              style={{
                width: 38, height: 38, border: 'none', borderRadius: 10,
                background: (!input.trim() || isTyping || phase === 'generating') ? '#DDE5EF' : '#1E5B3C',
                color: '#fff', cursor: (!input.trim() || isTyping || phase === 'generating') ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}
            >
              <PaperPlaneTiltIcon size={15} weight="fill" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
