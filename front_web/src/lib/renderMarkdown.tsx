import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

/* ── Pre-processing: fix LLM markdown formatting quirks ──────────────────── *
 *
 * We do NOT attempt a full markdown parser here — react-markdown handles that.
 * These small passes only fix the specific issues caused by the LLM dropping
 * newlines or using non-standard table formatting.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Expand a table section (starting with |) that may contain || row separators.
 * "| A | B ||---|---|| C | D |"  →  ["| A | B |", "|---|---|", "| C | D |"]
 * Parts that look like block elements (headings) are returned as-is.
 */
function expandTableSection(section: string): string[] {
  return section
    .split(/\|{2,}/)
    .map(p => p.trim())
    .filter(p => p !== '')
    .map(p => {
      if (/^#{1,6} /.test(p)) return p; // heading — leave unwrapped
      let row = p;
      if (!row.startsWith('|')) row = '| ' + row;
      if (!row.endsWith('|'))   row = row + ' |';
      return row;
    });
}

function preprocessMarkdown(text: string): string {
  return (
    text
      // 1. Split heading embedded right after table pipe: "| data |### Section" → "| data |\n### Section"
      .replace(/\|(\s*#{1,6} )/g, '|\n$1')
      // 2. "---### Title" → "---\n### Title"
      .replace(/([-]{3,})(#{1,6} )/g, '$1\n$2')
      // 3. Mid-line heading (exclude | so table cells are not split): "text## Title" → "text\n## Title"
      .replace(/([^#|\n])(#{2,3} )/g, '$1\n$2')
      // 4. Inline list items: ":- item" or ")- item" → ":\n- item"
      .replace(/([:\)])(-\s)/g, '$1\n$2')
      // 5. Per-line: split "text :| table" and expand || row separators
      .split('\n')
      .flatMap(line => {
        const trim = line.trim();

        // Expand || separators within a |starting line
        if (trim.startsWith('|') && /\|{2,}/.test(trim)) {
          return expandTableSection(trim);
        }

        // Split "significant text :| table" → paragraph + table rows
        if (!trim.startsWith('|') && trim.includes('|')) {
          const firstPipe = trim.indexOf('|');
          if (firstPipe >= 3) {
            const before       = trim.slice(0, firstPipe).trimEnd();
            const tableSection = trim.slice(firstPipe);
            const rows         = expandTableSection(tableSection);
            return before ? [before, ...rows] : rows;
          }
        }

        return [line];
      })
      // 6. Cell continuation: join non-| lines to the preceding open table row.
      //    Fixes phone numbers like "+225\n21\n25\n35\n45" streaming as separate lines.
      .reduce((acc: string[], line) => {
        const trim = line.trim();
        if (!trim) { acc.push(line); return acc; }

        const isBlockStart = /^(#{1,6} |\d+[.)]\s|[*\-] |```)/.test(trim);
        const prev = acc[acc.length - 1]?.trim() ?? '';

        if (
          prev.startsWith('|') &&  // previous line is a table row
          !prev.endsWith('|') &&   // it has no closing | (open cell)
          !isBlockStart &&
          !trim.startsWith('|')
        ) {
          acc[acc.length - 1] = acc[acc.length - 1].trimEnd() + ' ' + trim;
          return acc;
        }

        acc.push(line);
        return acc;
      }, [])
      .join('\n')
  );
}

/* ── Tailwind component map ───────────────────────────────────────────────── */

const mdComponents: Components = {
  // Headings
  h1: ({ children }) => (
    <p className="text-[14px] font-bold text-[var(--tx-1)] mt-3 mb-1.5 leading-snug">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--tx-3)] mt-4 mb-1.5 pb-1 border-b border-[var(--bd-def)]">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="text-[12px] font-semibold text-[var(--tx-1)] mt-2 mb-1">{children}</p>
  ),
  h4: ({ children }) => (
    <p className="text-[11px] font-semibold text-[var(--tx-2)] mt-1.5 mb-0.5">{children}</p>
  ),

  // Paragraph
  p: ({ children }) => (
    <p className="text-[12px] leading-relaxed text-[var(--tx-2)] mb-1">{children}</p>
  ),

  // Inline
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--tx-1)]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[var(--tx-2)]">{children}</em>
  ),
  a: ({ href, children }) => (
    <a href={href ?? '#'} target="_blank" rel="noopener noreferrer"
       className="text-[var(--p500)] underline underline-offset-2 hover:opacity-80 transition-opacity">
      {children}
    </a>
  ),

  // Code (inline vs block detected by className presence)
  code: ({ children, className }) => {
    if (className) {
      // Fenced code block content (wrapped in <pre> by react-markdown)
      return (
        <code className="font-mono text-[11px] text-[var(--tx-1)] whitespace-pre">{children}</code>
      );
    }
    // Inline code
    return (
      <code className="font-mono text-[11px] bg-[var(--bg-sink)] px-1 py-0.5 rounded text-[var(--tx-1)]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <div className="my-2 rounded-lg overflow-hidden border border-[var(--bd-def)]">
      <pre className="p-3 overflow-x-auto bg-[var(--bg-sink)]">{children}</pre>
    </div>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--p500)] pl-3 my-1.5 text-[12px] italic text-[var(--tx-3)]">
      {children}
    </blockquote>
  ),

  // HR
  hr: () => <hr className="my-3 border-[var(--bd-def)]" />,

  // Lists
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 space-y-0.5 list-disc list-outside">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 space-y-0.5 list-decimal list-outside">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[12px] leading-relaxed text-[var(--tx-2)] pl-0.5">{children}</li>
  ),

  // Table (GFM)
  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-xl border border-[var(--bd-def)]">
      <table className="w-full text-[11px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--bg-sink)] border-b border-[var(--bd-def)]">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-[var(--bd-def)]">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-[var(--bg-sink)] transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-[var(--tx-2)] whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-[var(--tx-2)] align-top">{children}</td>
  ),
};

/* ── Public API ───────────────────────────────────────────────────────────── */

export function renderMarkdown(text: string): React.ReactNode {
  const processed = preprocessMarkdown(text);
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {processed}
    </ReactMarkdown>
  );
}
