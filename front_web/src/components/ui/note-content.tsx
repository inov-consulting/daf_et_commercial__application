'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(raw: string): string {
  return esc(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="nc-code">$1</code>');
}

function buildHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (!listBuf.length) return;
    out.push(`<ul class="nc-ul">${listBuf.map(i => `<li>${i}</li>`).join('')}</ul>`);
    listBuf = [];
  };

  for (const raw of lines) {
    // Headings
    const h3 = raw.match(/^###\s+(.+)$/);
    if (h3) { flushList(); out.push(`<p class="nc-h3">${inline(h3[1])}</p>`); continue; }
    const h2 = raw.match(/^##\s+(.+)$/);
    if (h2) { flushList(); out.push(`<p class="nc-h2">${inline(h2[1])}</p>`); continue; }
    const h1 = raw.match(/^#\s+(.+)$/);
    if (h1) { flushList(); out.push(`<p class="nc-h1">${inline(h1[1])}</p>`); continue; }

    // List items
    const li = raw.match(/^[-*]\s+(.+)$/);
    if (li) { listBuf.push(inline(li[1])); continue; }

    // Empty line → flush list then paragraph break
    if (!raw.trim()) { flushList(); out.push('<br class="nc-br">'); continue; }

    // Normal line
    flushList();
    out.push(`<span class="nc-line">${inline(raw)}<br></span>`);
  }

  flushList();

  // Collapse consecutive <br class="nc-br"> into one
  return out.join('').replace(/(<br class="nc-br">){2,}/g, '<br class="nc-br">');
}

interface NoteContentProps {
  content: string;
  className?: string;
}

export function NoteContent({ content, className }: NoteContentProps) {
  const html = useMemo(() => buildHtml(content), [content]);

  return (
    <>
      <style>{`
        .nc-code{background:rgba(0,0,0,.06);padding:1px 4px;border-radius:3px;font-size:.85em;font-family:monospace}
        .nc-ul{margin:.2rem 0 .2rem 1.2rem;list-style:disc}
        .nc-ul li{margin:.1rem 0}
        .nc-h1{font-weight:700;font-size:15px;margin:.3rem 0}
        .nc-h2{font-weight:700;font-size:14px;margin:.25rem 0}
        .nc-h3{font-weight:600;font-size:13px;margin:.2rem 0}
        .nc-br{display:block;content:'';margin:.3rem 0}
      `}</style>
      <div
        className={cn('text-[13px] text-[var(--tx-1)] leading-relaxed', className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
