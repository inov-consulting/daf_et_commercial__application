import { GetData } from '@/lib/ApiService';

/**
 * Deux formats de réponse supportés côté backend :
 */
interface PagedResponse<T> {
  items: T[];
  total: number;
}

export interface ExportCsvColumn<T> {
  /** Libellé affiché dans l'en-tête de la colonne CSV. */
  header: string;
  /** Extrait la valeur de la colonne pour une ligne donnée. */
  value: (row: T) => string | number | null | undefined;
}

export interface ExportCsvOptions<T> {
  /** URL de la ressource GET (ex. ApiRoutes.PROSPECTS_LIST), sans query string. */
  url: string;
  /** Filtres additionnels envoyés en query params (ex. { search, status }). */
  filters?: Record<string, string | number | boolean | undefined>;
  /** Taille de page demandée au backend. */
  pageSize?: number;
  columns: ExportCsvColumn<T>[];
  /** Nom du fichier téléchargé. */
  filename?: string;
  /** Ajoute l'en-tête Authorization Bearer (cf. ApiService). */
  protected?: boolean;
  /** Appelé après chaque page chargée, pour afficher une progression dans l'UI. */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Récupère toutes les pages d'une liste (limit/offset) puis déclenche le
 * téléchargement d'un CSV (séparateur `;`, pour ouverture directe dans Excel FR).
 */
export async function exportListToCsv<T>({
  url,
  filters = {},
  pageSize = 100,
  columns,
  filename = 'export.csv',
  protected: isProtected = true,
  onProgress,
}: ExportCsvOptions<T>): Promise<void> {
  const rows: T[] = [];
  let offset = 0;
  let total = Infinity; // inconnu tant que la 1ère page n'a pas répondu

  while (rows.length < total) {
    const qs = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '') qs.set(key, String(val));
    });

    const res = await GetData<PagedResponse<T> | T[]>({
      url: `${url}?${qs}`,
      protected: isProtected,
    });
    if (!res.ok || !res.data) {
      throw new Error(res.error ?? 'Échec du chargement des données à exporter');
    }

    // Réponse non paginée (tableau brut) : une seule "page" contenant tout.
    const page = Array.isArray(res.data) ? res.data : res.data.items;
    total = Array.isArray(res.data) ? page.length : res.data.total;

    rows.push(...page);
    offset += pageSize;
    onProgress?.(rows.length, total);

    // Garde-fou : une page vide avant d'avoir atteint `total` stoppe la boucle
    // plutôt que de tourner indéfiniment (backend incohérent, filtre cassé, etc.).
    if (page.length === 0) break;
  }

  downloadCsv(rows, columns, filename);
}

/**
 * Génère et télécharge un CSV directement depuis un tableau de données déjà en mémoire
 * (pas d'appel API). Utile quand les données sont déjà chargées dans le state.
 */
export function exportFromRows<T>(
  rows: T[],
  columns: ExportCsvColumn<T>[],
  filename = 'export.csv',
): void {
  downloadCsv(rows, columns, filename);
}

/** Échappe une valeur pour le format CSV (point-virgule comme séparateur). */
function escapeCsvValue(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Une valeur contenant le séparateur, un guillemet ou un retour à la ligne
  // doit être entourée de guillemets, avec les guillemets internes doublés.
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv<T>(rows: T[], columns: ExportCsvColumn<T>[], filename: string): void {
  const csv = [
    columns.map(c => escapeCsvValue(c.header)).join(';'),
    ...rows.map(row => columns.map(c => escapeCsvValue(c.value(row))).join(';')),
  ].join('\n');

  // BOM UTF-8 : sans lui, Excel (FR) interprète les accents en Latin-1 et les affiche mal.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
