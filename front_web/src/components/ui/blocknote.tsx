'use client';

import dynamic from 'next/dynamic';
import type { EditorProps } from './editor';

export type { EditorProps as BlocknoteProps };

export const Blocknote = dynamic<EditorProps>(() => import('./editor'), { ssr: false });
