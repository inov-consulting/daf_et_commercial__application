'use client';

import '@blocknote/core/fonts/inter.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { cn } from '@/lib/utils';

export interface EditorProps {
  initialContent?: string;
  onChange?: (text: string) => void;
  className?: string;
  editable?: boolean;
  placeholder?: string;
}

export default function Editor({
  initialContent = '',
  onChange,
  className,
  editable = true,
  placeholder = 'Saisissez du texte…',
}: EditorProps) {
  const initialBlocks = initialContent.trim()
    ? initialContent
        .split('\n')
        .filter(l => l.trim())
        .map(line => ({ type: 'paragraph' as const, content: line }))
    : undefined;

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    placeholders: { default: placeholder },
  });

  return (
    <div
      className={cn(
        'relative transition-[border-color,box-shadow] duration-200',
        'rounded-[14px]',
        'focus-within:[border-color:#6B35C9] focus-within:[box-shadow:0_0_0_3px_rgba(107,53,201,0.10),0_1px_6px_rgba(0,0,0,0.04)]',
        className,
      )}
      style={{
        background: '#FEFDF8',
        border: '1px solid #E8E4DB',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
      data-bn-editor
    >
      <style>{`
        [data-bn-editor] .bn-editor {
          background: transparent !important;
          font-family: inherit !important;
          font-size: 15px !important;
          line-height: 1.75 !important;
          color: var(--tx-1, #1a1a2e) !important;
          padding-top: 18px !important;
          padding-bottom: 18px !important;
          min-height: 160px;
          caret-color: #6B35C9;
        }
        [data-bn-editor] .bn-block-content {
          font-size: 15px !important;
          line-height: 1.75 !important;
        }
        [data-bn-editor] .bn-inline-content[data-is-empty-and-focused]::before {
          color: #B8B0C0 !important;
          font-style: normal !important;
          opacity: 1 !important;
        }
        [data-bn-editor] .bn-container {
          background: transparent !important;
        }
        [data-bn-editor] .mantine-Paper-root {
          background: transparent !important;
          box-shadow: none !important;
        }
      `}</style>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={() => {
          if (onChange) onChange(editor.blocksToMarkdownLossy());
        }}
        formattingToolbar={true}
        linkToolbar={true}
        slashMenu={true}
        sideMenu={true}
        filePanel={true}
        tableHandles={true}
        emojiPicker={true}
      />
    </div>
  );
}
