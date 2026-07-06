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
