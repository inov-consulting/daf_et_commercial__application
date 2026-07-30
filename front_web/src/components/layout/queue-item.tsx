'use client';

import { useState } from 'react';
import { QueueItem as QueueItemType } from '@/types/centre_ia_type';

interface QueueItemProps {
  item: QueueItemType;
  onValidate: (id: string, title: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
}

export function QueueItem({ item, onValidate, onReject, onEdit }: QueueItemProps) {
  const [isFading, setIsFading] = useState(false);
  const [isFadingLeft, setIsFadingLeft] = useState(false);

  const stripeClass = {
    'stripe-vocal': 'bg-secondary',
    'stripe-extract': 'bg-primary',
    'stripe-offres': 'bg-primary-600',
  }[item.stripe as keyof typeof stripeClassMap] ?? 'bg-secondary';

  const stripeClassMap = {
    'stripe-vocal': 'bg-secondary',
    'stripe-extract': 'bg-primary',
    'stripe-offres': 'bg-primary-600',
  };

  const chipClass = {
    'b-amber': 'bg-secondary-100 text-[#7A5C1E] border-secondary-400',
    'b-green': 'bg-[#E8F7F0] text-[#003d23] border-[#A8DCC5]',
    'b-ok': 'bg-primary-100 text-[#065F46] border-primary-300',
    'b-green-mid': 'bg-[#CCEEDD] text-primary border-[#A8DCC5]',
    'b-slate': 'bg-[#EEF2F7] text-[#435869] border-neutral-400',
  };

  const handleValidate = () => {
    setIsFading(true);
    setTimeout(() => {
      onValidate(item.id, item.title);
    }, 260);
  };

  const handleReject = () => {
    setIsFadingLeft(true);
    setTimeout(() => {
      onReject(item.id);
    }, 260);
  };

  return (
    <div 
      className={`
        w-full bg-white rounded-xl border border-neutral-400
        shadow-[0_2px_8px_rgba(0,118,73,0.06)] overflow-hidden
        transition-opacity duration-250 ease-in-out
        ${isFading ? 'opacity-0 translate-x-2.5' : ''}
        ${isFadingLeft ? 'opacity-0 -translate-x-2.5' : ''}
      `}
    >
      {/* Stripe */}
      <div className={`h-[3px] w-full ${stripeClass}`} />

      {/* Agent Header */}
      <div className="h-10 bg-neutral-100 border-b border-[#EEF2F7] px-[14px] flex items-center gap-2">
        <div 
          className="w-[26px] h-[26px] rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: item.avBg }}
        >
          <span className="text-xs text-white">{item.icon}</span>
        </div>
        <span className="font-inter text-xs font-semibold text-[#435869]">{item.agent}</span>
        <span className={`
          font-jetbrains-mono text-[10px] px-1.5 py-px rounded border
          ${item.modelCls === 'mc-green' 
            ? 'bg-[#E8F7F0] text-[#003d23] border-[#A8DCC5]' 
            : 'bg-secondary-100 text-[#7A5C1E] border-secondary-400'}
        `}>
          {item.model}
        </span>
        <span className="font-inter text-[10px] text-neutral ml-auto">{item.time}</span>
      </div>

      {/* Body */}
      <div className="p-[14px]">
        <div className="font-inter text-[13px] font-semibold text-[#1B2633] mb-1">
          {item.title}
        </div>
        <div className="font-inter text-xs text-[#7691A8] leading-relaxed line-clamp-3 mb-2.5">
          {item.preview}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {item.chips.map((chip, index) => (
            <span 
              key={index}
              className={`
                px-2 py-0.5 rounded border font-inter text-[11px] font-medium
                ${chipClass[chip.c]}
              `}
            >
              {chip.l}
            </span>
          ))}
        </div>

        {/* Confidence Warning */}
        {item.conf && (
          <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 bg-secondary-100 border border-secondary-400 rounded-md">
            <span className="text-[13px] text-secondary flex-shrink-0">⚠</span>
            <span className="font-inter text-[11px] text-[#7A5C1E]">{item.conf.msg}</span>
          </div>
        )}
      </div>

      {/* Validation Bar */}
      <div className="h-11 border-t border-[#EEF2F7] px-3 flex items-center gap-2">
        <button 
          onClick={handleReject}
          className="flex items-center gap-1.5 h-8 px-3 border border-[#EF4444] rounded-lg bg-transparent text-[#EF4444] font-inter text-xs font-medium hover:bg-[#FEF2F2] transition-colors"
        >
          <span className="text-[13px]">✕</span>Rejeter
        </button>
        <button 
          onClick={() => onEdit(item.id)}
          className="flex items-center gap-1.5 h-8 px-3 border border-neutral-400 rounded-lg bg-transparent text-[#435869] font-inter text-xs font-medium hover:bg-neutral-100 transition-colors"
        >
          <span className="text-[13px] text-[#7691A8]">✎</span>Modifier
        </button>
        <div className="flex-1" />
        <button 
          onClick={handleValidate}
          className="flex items-center gap-1.5 h-8 px-[14px] border border-primary rounded-lg bg-[#E8F7F0] text-[#003d23] font-inter text-xs font-semibold hover:bg-[#CCEEDD] transition-colors"
        >
          <span className="text-[13px] text-primary">✓</span>Valider
        </button>
      </div>
    </div>
  );
}