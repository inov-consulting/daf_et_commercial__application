import type { WaConversation, WaMessage } from '@/redux/features/whatsapp/whatsappSlice';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatRelativeDate(iso?: string | null): string {
  if (!iso) return '–';
  
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} j`;
  if (diff < 30) return `il y a ${Math.round(diff / 7)} sem`;
  return `il y a ${Math.round(diff / 30)} mois`;
}

export function formatTodayDate(): string {
  return new Date().toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

export function getPageNumbers(currentPage: number, totalPages: number, maxVisible = 5): number[] {
  const pages: number[] = [];
  const start = Math.max(1, Math.min(currentPage - Math.floor(maxVisible / 2), totalPages - maxVisible + 1));
  
  for (let i = 0; i < Math.min(maxVisible, totalPages); i++) {
    pages.push(start + i);
  }
  
  return pages;
}

export const AVATAR_COLORS = [
  '#1C7A54', '#6C4CE0', '#9C6B14', '#2C4A8C',
  '#B3302B', '#0F6E63', '#4A2C8C', '#C07A1A',
];

export function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function waveBars(seed: string, n = 20): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: n }, () => {
    h = (h * 9301 + 49297) % 233_280;
    return Math.floor(5 + (h / 233_280) * 17);
  });
}

export function convName(c: WaConversation): string {
  return c.contact_name || c.display_phone_number;
}

export function hasBothSides(msgs: WaMessage[]): boolean {
  return msgs.some(m => m.direction === 'inbound') && msgs.some(m => m.direction === 'outbound');
}

export type FileKind = 'image' | 'video' | 'audio' | 'document';

export function fileKind(file: File): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

export function docLabel(file: File): string {
  if (file.type === 'application/pdf') return 'PDF';
  if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return 'Word';
  if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'Excel';
  if (file.type.includes('powerpoint') || file.name.endsWith('.pptx')) return 'PPT';
  return file.name.split('.').pop()?.toUpperCase() ?? 'Fichier';
}

export function docColor(file: File): string {
  if (file.type === 'application/pdf') return '#B3302B';
  if (file.type.includes('word')) return '#2C4A8C';
  if (file.type.includes('excel')) return '#1C7A54';
  if (file.type.includes('powerpoint')) return '#9C6B14';
  return '#6C4CE0';
}

