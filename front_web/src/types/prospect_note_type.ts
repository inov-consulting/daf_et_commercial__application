export interface ProspectNote {
  id: string;
  prospect_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NotesListResponse {
  items: ProspectNote[];
  total: number;
}

export interface ProspectCR {
  id: string;
  parent_type: string;
  parent_id: string;
  version: number;
  status: 'draft' | 'final' | 'processing';
  file_size: number;
  download_url: string;
  generated_by: string;
  note_ids: string[];
  created_at: string;
  created_by: string;
}

export interface CRListResponse {
  items: ProspectCR[];
  total: number;
}

/* ── Global CR (liste / détail) ───────────────────────────────── */

export interface CRParent {
  type: string;
  id: string;
  name: string;
  status: string;
  email: string;
  phone: string;
  company_name: string;
}

export interface GlobalCR extends ProspectCR {
  parent: CRParent;
}

export interface GlobalCRDetail extends GlobalCR {
  content: string;
}

export interface GlobalCRListResponse {
  items: GlobalCR[];
  total: number;
  offset: number;
  limit: number;
}

export interface GenerateCRBody {
  note_ids: string[];
  template?: string;
}

/* ── Génération asynchrone (202 + polling) ────────────────────── */

export interface CRPendingResponse {
  id: string;
  parent_type: string;
  parent_id: string;
  version: number;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  message: string;
}

export interface CRStatusResponse {
  id: string;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_pct?: number;
  error_message?: string | null;
}

export interface CRDownloadResponse {
  [key: string]: unknown;
}
