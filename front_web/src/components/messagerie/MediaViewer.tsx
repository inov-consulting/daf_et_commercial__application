'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { XIcon, DownloadSimpleIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';

export interface MediaViewerItem {
  url:       string;
  type:      'image' | 'video' | 'document';
  filename?: string;
}

interface MediaViewerProps {
  item:    MediaViewerItem;
  onClose: () => void;
}

export function MediaViewer({ item, onClose }: MediaViewerProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const name = item.filename || item.url.split('/').pop()?.split('?')[0] || 'fichier';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-[13px] font-semibold text-white/80 truncate max-w-[60vw]">{name}</span>
        <div className="flex items-center gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            download={name}
            className="flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold transition-colors"
          >
            <DownloadSimpleIcon size={14} weight="bold" />
            Télécharger
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div onClick={e => e.stopPropagation()} className="flex items-center justify-center max-h-[90vh] max-w-[92vw]">

        {item.type === 'image' && (
          <Image
            src={item.url}
            alt={name}
            width={1920}
            height={1080}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded-[6px] shadow-2xl"
            draggable={false}
          />
        )}

        {item.type === 'video' && (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-[92vw] rounded-[6px] shadow-2xl outline-none"
          />
        )}

        {item.type === 'document' && (
          <div className="bg-[#1C1C1E] rounded-[16px] px-8 py-8 flex flex-col items-center gap-5 shadow-2xl min-w-[280px]">
            <div className="w-16 h-16 rounded-[14px] bg-[#FBEAE9] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h6l4.5 4.5v14A1.5 1.5 0 0 1 16.5 22h-9A1.5 1.5 0 0 1 6 20.5Z" stroke="#B3302B" />
                <path d="M13.5 2v4.5H18" stroke="#B3302B" />
              </svg>
            </div>
            <p className="text-white font-semibold text-[14px] text-center break-all max-w-[260px]">{name}</p>
            <div className="flex items-center gap-3">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-[8px] rounded-[9px] bg-white/10 hover:bg-white/20 text-white text-[12.5px] font-semibold transition-colors"
              >
                <ArrowSquareOutIcon size={13} />
                Ouvrir
              </a>
              <a
                href={item.url}
                download={name}
                className="flex items-center gap-1.5 px-4 py-[8px] rounded-[9px] bg-[#6C4CE0] hover:bg-[#5B3CC4] text-white text-[12.5px] font-semibold transition-colors"
              >
                <DownloadSimpleIcon size={13} weight="bold" />
                Télécharger
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
