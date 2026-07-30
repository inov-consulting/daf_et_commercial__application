import React from 'react';

/* ── Inline renderer ──────────────────────────────────────────────────── */

function inlineMarkdown(text: string): React.ReactNode[] {
  // Split on **bold**, *italic*, `code`, preserving order
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-[var(--tx-1)]">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} className="italic text-[var(--tx-2)]">{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[11px] bg-[var(--bg-sink)] px-1 py-0.5 rounded text-[var(--tx-1)]">{part.slice(1, -1)}</code>;
    return part || null;
  }).filter(Boolean);
}

/* ── Table renderer ───────────────────────────────────────────────────── */

function parseTableRows(lines: string[]): { headers: string[]; rows: string[][] } {
  const parsed = lines.map(l =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
  );
  const isSeparator = (r: string[]) => r.every(c => /^[-:]+$/.test(c));

  if (parsed.length >= 2 && isSeparator(parsed[1])) {
    return { headers: parsed[0], rows: parsed.slice(2) };
  }
  return { headers: [], rows: parsed };
}

function renderTable(tableLines: string[], key: number): React.ReactNode {
  const { headers, rows } = parseTableRows(tableLines);
  return (
    <div key={key} className="overflow-x-auto my-2 rounded-xl border border-[var(--bd-def)]">
      <table className="w-full text-[11px] border-collapse">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-[var(--bg-sink)] border-b border-[var(--bd-def)]">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold text-[var(--tx-2)] whitespace-nowrap">
                  {inlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-[var(--bd-def)] bg-white">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-[var(--bg-sink)] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-[var(--tx-2)] align-top">
                  {inlineMarkdown(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Block types ──────────────────────────────────────────────────────── */

type Block =
  | { type: 'h1';      text: string }
  | { type: 'h2';      text: string }
  | { type: 'h3';      text: string }
  | { type: 'hr' }
  | { type: 'bullet';  items: string[] }
  | { type: 'ordered'; items: string[] }
  | { type: 'table';   lines: string[] }
  | { type: 'para';    text: string }
  | { type: 'space' };

/* ── Main parser ──────────────────────────────────────────────────────── */

function parse(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw   = lines[i].trimEnd();
    const trim  = raw.trim();

    // Blank line
    if (!trim) { blocks.push({ type: 'space' }); i++; continue; }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trim)) {
      blocks.push({ type: 'hr' }); i++; continue;
    }

    // H1
    if (trim.startsWith('# ') && !trim.startsWith('## ')) {
      blocks.push({ type: 'h1', text: trim.slice(2) }); i++; continue;
    }

    // H2
    if (trim.startsWith('## ') && !trim.startsWith('### ')) {
      blocks.push({ type: 'h2', text: trim.slice(3) }); i++; continue;
    }

    // H3
    if (trim.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trim.slice(4) }); i++; continue;
    }

    // Table — collect all consecutive table lines
    if (trim.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]); i++;
      }
      blocks.push({ type: 'table', lines: tableLines }); continue;
    }

    // Bullet list — collect consecutive bullet items
    if (/^[*-] /.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^[*-] /.test(lines[i].trimEnd())) {
        items.push(lines[i].trim().replace(/^[*-] /, '')); i++;
      }
      blocks.push({ type: 'bullet', items }); continue;
    }

    // Ordered list — collect consecutive numbered items
    if (/^\d+\.\s/.test(trim)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++;
      }
      blocks.push({ type: 'ordered', items }); continue;
    }

    // Paragraph
    blocks.push({ type: 'para', text: raw }); i++;
  }

  return blocks;
}

/* ── Renderer ─────────────────────────────────────────────────────────── */

export function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = parse(text);
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const block of blocks) {
    switch (block.type) {
      case 'h1':
        nodes.push(
          <p key={key++} className="text-[14px] font-bold text-[var(--tx-1)] mt-3 mb-1.5 leading-snug">
            {inlineMarkdown(block.text)}
          </p>
        );
        break;

      case 'h2':
        nodes.push(
          <p key={key++} className="text-[11px] font-bold uppercase tracking-widest text-[var(--tx-3)] mt-4 mb-1.5 pb-1 border-b border-[var(--bd-def)]">
            {inlineMarkdown(block.text)}
          </p>
        );
        break;

      case 'h3':
        nodes.push(
          <p key={key++} className="text-[12px] font-semibold text-[var(--tx-1)] mt-2 mb-1">
            {inlineMarkdown(block.text)}
          </p>
        );
        break;

      case 'hr':
        nodes.push(<hr key={key++} className="my-3 border-[var(--bd-def)]" />);
        break;

      case 'bullet':
        nodes.push(
          <ul key={key++} className="mb-2 ml-1 space-y-0.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--tx-2)]">
                <span className="mt-[6px] w-1 h-1 rounded-full bg-[var(--tx-3)] flex-shrink-0" />
                <span>{inlineMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        );
        break;

      case 'ordered':
        nodes.push(
          <ol key={key++} className="mb-2 ml-1 space-y-0.5 list-none">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--tx-2)]">
                <span className="mt-0.5 w-4 h-4 flex-shrink-0 rounded-full bg-[var(--bg-sink)] border border-[var(--bd-def)] flex items-center justify-center text-[9px] font-bold text-[var(--tx-3)]">
                  {i + 1}
                </span>
                <span>{inlineMarkdown(item)}</span>
              </li>
            ))}
          </ol>
        );
        break;

      case 'table':
        nodes.push(renderTable(block.lines, key++));
        break;

      case 'space':
        nodes.push(<div key={key++} className="h-1.5" />);
        break;

      case 'para':
        nodes.push(
          <p key={key++} className="text-[12px] leading-relaxed text-[var(--tx-2)] mb-1">
            {inlineMarkdown(block.text)}
          </p>
        );
        break;
    }
  }

  return nodes;
}
