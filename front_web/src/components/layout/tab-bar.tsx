'use client';

import { TabType } from '@/types/centre_ia_type';

interface TabBarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingCount: number;
}

export function TabBar({ currentTab, onTabChange, pendingCount }: TabBarProps) {
  const tabs: { id: TabType; label: string; count?: number; icon?: string }[] = [
    { id: 'pending', label: 'En attente', count: pendingCount },
    { id: 'done', label: 'Traités aujourd\'hui', count: 23 },
    { id: 'rejected', label: 'Rejetés', count: 2, icon: '⚠' },
  ];

  return (
    <div className="flex items-center h-11 bg-white border border-neutral-400 rounded-lg p-1 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-1 h-9 px-[14px]
            border border-transparent rounded-lg
            font-space-grotesk text-[13px] font-medium
            whitespace-nowrap transition-all duration-150
            ${currentTab === tab.id 
              ? 'bg-[#E8F7F0] text-[#003d23] border-primary font-semibold' 
              : 'text-[#7691A8] hover:bg-neutral-100 hover:text-[#435869]'}
          `}
        >
          {tab.icon && (
            <span className={`text-xs ${tab.id === 'rejected' ? 'text-[#EF4444]' : ''}`}>
              {tab.icon}
            </span>
          )}
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-0.5">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}