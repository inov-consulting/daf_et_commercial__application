import React from 'react';

/**
 * Renders a markdown-like string (with **, *, #, ## headings and \n newlines)
 * into React nodes. Used for DAF agent summaries and CR content display.
 */
export function renderMarkdown(text: string): React.ReactNode[] {
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
      <ul key={key++} className="mb-2 ml-1 space-y-0.5">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--tx-2)]">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--tx-3)] flex-shrink-0" />
            <span>{inlineBold(item)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.replace(/\\$/, '').trimEnd();
    const trimmed = line.trim();

    if (/^[*-] /.test(line)) {
      bulletBuffer.push(line.replace(/^[*-] /, ''));
      continue;
    }

    flushBullets();

    if (!trimmed) {
      nodes.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const heading = trimmed.replace(/^#{2,3} /, '');
      nodes.push(
        <p key={key++} className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mt-3 mb-1 pb-1 border-b border-[var(--bd-def)]">
          {heading}
        </p>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      nodes.push(
        <p key={key++} className="text-[13px] font-bold text-[var(--tx-1)] mt-2 mb-1">
          {inlineBold(trimmed.slice(2))}
        </p>
      );
      continue;
    }

    if (/^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
      nodes.push(
        <p key={key++} className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mt-3 mb-1 pb-1 border-b border-[var(--bd-def)]">
          {trimmed.replace(/\*\*/g, '')}
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
