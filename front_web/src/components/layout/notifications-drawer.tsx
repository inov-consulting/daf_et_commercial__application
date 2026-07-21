'use client';

import { useEffect, useState } from 'react';
import { XIcon, BellIcon, CheckIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type ApiNotification,
} from '@/redux/features/notifications/notificationsSlice';
import { cn } from '@/lib/utils';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return "À l'instant";
  if (min < 60)  return `Il y a ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `Il y a ${h}h`;
  if (h < 48)    return `Hier`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

const TYPE_COLOR: Record<string, { dot: string; bg: string }> = {
  agent_cycle:      { dot: 'bg-primary', bg: 'bg-[rgba(27,107,69,.1)]'    },
  alert:            { dot: 'bg-[#DC2626]', bg: 'bg-[rgba(220,38,38,.1)]'    },
  action_required:  { dot: 'bg-[#F97316]', bg: 'bg-[rgba(249,115,22,.1)]'   },
  payment:          { dot: 'bg-[#B45309]', bg: 'bg-[rgba(180,83,9,.1)]'     },
  report:           { dot: 'bg-[#2563EB]', bg: 'bg-[rgba(37,99,235,.1)]'    },
  info:             { dot: 'bg-[#6B7280]', bg: 'bg-[rgba(107,114,128,.1)]'  },
};

function typeStyle(type: string) {
  return TYPE_COLOR[type] ?? TYPE_COLOR.info;
}

/* ── Skeleton row ────────────────────────────────────────────────────── */

function NotifSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-[#EEF2F7] mt-1.5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 bg-[#EEF2F7] rounded" />
        <div className="h-2.5 w-full bg-[#EEF2F7] rounded" />
        <div className="h-2 w-16 bg-[#EEF2F7] rounded" />
      </div>
    </div>
  );
}

/* ── Notification row ────────────────────────────────────────────────── */

function NotifRow({ notif, onRead }: { notif: ApiNotification; onRead: (id: string) => void }) {
  const { dot, bg } = typeStyle(notif.notification_type);
  const unread      = notif.status === 'unread';

  return (
    <button
      onClick={() => { if (unread) onRead(notif.id); }}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-b border-[var(--bd-def)] last:border-0',
        unread ? 'hover:bg-[var(--bg-sink)] cursor-pointer' : 'cursor-default opacity-70',
      )}
    >
      <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', dot, !unread && 'opacity-40')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-[13px] leading-snug truncate', unread ? 'font-semibold text-[var(--tx-1)]' : 'font-normal text-[var(--tx-2)]')}>
            {notif.title}
          </p>
          {unread && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--p500)] flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notif.body && (
          <p className="text-[12px] text-[var(--tx-3)] mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
        )}
        <p className="text-[10px] text-[var(--tx-3)] mt-1">{fmtRelative(notif.created_at)}</p>
      </div>
    </button>
  );
}

/* ── Drawer ──────────────────────────────────────────────────────────── */

type Tab = 'unread' | 'all';

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export function NotificationsDrawer({ isOpen, onClose }: Props) {
  const dispatch = useAppDispatch();
  const {
    items, unreadCount, loading, loadingMore, hasMore, markingAllRead,
  } = useAppSelector(s => s.notifications);

  const [tab, setTab] = useState<Tab>('unread');

  // Charge les notifications à chaque ouverture
  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchNotifications({ unread_only: false, offset: 0 }));
  }, [isOpen, dispatch]);

  function handleRead(id: string) {
    dispatch(markNotificationRead(id));
  }

  function handleMarkAllRead() {
    dispatch(markAllNotificationsRead());
  }

  function handleLoadMore() {
    dispatch(fetchNotifications({ unread_only: false, offset: items.length }));
  }

  const displayed = tab === 'unread'
    ? items.filter(n => n.status === 'unread')
    : items;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-[201] w-full max-w-[380px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Gradient bar */}
        <div className="h-[3px] flex-shrink-0" style={{ background: 'var(--grad)' }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--bd-def)] flex-shrink-0">
          <BellIcon size={16} className="text-[var(--p500)] flex-shrink-0" />
          <p className="font-semibold text-sm text-[var(--tx-1)] flex-1">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="flex items-center gap-1 text-[11px] text-[var(--p500)] font-medium hover:underline disabled:opacity-50 flex-shrink-0"
            >
              {markingAllRead
                ? <SpinnerGapIcon size={12} className="animate-spin" />
                : <CheckIcon size={12} weight="bold" />
              }
              Tout marquer lu
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--tx-3)] hover:bg-[var(--bg-sink)] transition-colors flex-shrink-0"
          >
            <XIcon size={15} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--bd-def)] flex-shrink-0 px-4">
          {([
            { key: 'unread', label: 'Non lues', count: unreadCount },
            { key: 'all',    label: 'Toutes',   count: null        },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 py-2.5 mr-5 text-[12px] font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-[var(--p500)] text-[var(--p500)]'
                  : 'border-transparent text-[var(--tx-3)] hover:text-[var(--tx-2)]',
              )}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--p500)] text-white text-[9px] font-bold flex items-center justify-center">
                  {t.count > 99 ? '99+' : t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="divide-y divide-[var(--bd-def)]">
              {[1, 2, 3, 4].map(i => <NotifSkeleton key={i} />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <BellIcon size={32} className="text-[var(--tx-3)] opacity-40" />
              <p className="text-[13px] text-[var(--tx-3)] italic">
                {tab === 'unread' ? 'Aucune notification non lue.' : 'Aucune notification.'}
              </p>
            </div>
          ) : (
            <>
              {displayed.map(n => (
                <NotifRow key={n.id} notif={n} onRead={handleRead} />
              ))}

              {/* Load more — only for "Toutes" tab */}
              {tab === 'all' && hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-1.5 text-[12px] text-[var(--p500)] font-medium hover:underline disabled:opacity-50"
                  >
                    {loadingMore && <SpinnerGapIcon size={13} className="animate-spin" />}
                    Charger plus
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
