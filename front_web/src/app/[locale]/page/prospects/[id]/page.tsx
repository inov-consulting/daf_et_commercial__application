'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GetData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { type ApiProspect, type UpdateProspectBody } from '@/types/prospect_type';
import { ProspectDetailHeader } from '@/components/layout/prospect-detail-header';
import { ProspectNotesSection } from '@/components/layout/prospect-notes-section';
import { ProspectCRSection } from '@/components/layout/prospect-cr-section';
import { ProspectFormModal } from '@/components/layout/prospect-form-modal';

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'fr';
  const id = params?.id as string;

  const [prospect, setProspect] = useState<ApiProspect | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProspect = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await GetData<ApiProspect>({
      url: ApiRoutes.PROSPECTS_GET(id),
      protected: true,
    });
    if (res.ok && res.data) setProspect(res.data);
    else if (res.status === 404) router.push(`/${locale}/page/prospects`);
    setLoading(false);
  }, [id, locale, router]);

  useEffect(() => { fetchProspect(); }, [fetchProspect]);

  async function handleSave(body: UpdateProspectBody) {
    setSaving(true);
    setSaveError(null);
    const res = await PatchData<ApiProspect, UpdateProspectBody>({
      url: ApiRoutes.PROSPECTS_UPDATE(id),
      data: body,
      protected: true,
    });
    if (res.ok && res.data) {
      setProspect(res.data);
      setEditOpen(false);
    } else {
      setSaveError(res.error ?? 'Erreur lors de la mise à jour');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-[var(--tx-3)]">
          <div className="w-8 h-8 border-2 border-[var(--p500)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px]">Chargement du prospect…</p>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[13px] text-[var(--tx-3)]">Prospect introuvable.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5 md:p-6 min-h-full max-w-5xl">
      {/* Header */}
      <ProspectDetailHeader
        prospect={prospect}
        locale={locale}
        onEdit={() => { setSaveError(null); setEditOpen(true); }}
      />

      {/* Body: two columns on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProspectNotesSection prospectId={id} />
        <ProspectCRSection prospectId={id} />
      </div>

      {/* Edit modal */}
      <ProspectFormModal
        open={editOpen}
        mode="edit"
        initial={prospect}
        saving={saving}
        serverError={saveError}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
