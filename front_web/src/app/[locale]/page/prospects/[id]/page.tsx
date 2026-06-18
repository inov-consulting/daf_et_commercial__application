'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GetData, PatchData } from '@/lib/ApiService';
import { ApiRoutes } from '@/lib/ApiRoutes';
import { ProspectStatus, STATUS_TO_ACTION, type ApiProspect, type UpdateProspectBody } from '@/types/prospect_type';
import { ProspectDetailHeader } from '@/components/layout/prospect-detail-header';
import { ProspectNotesSection } from '@/components/layout/prospect-notes-section';
import { ProspectCRSection } from '@/components/layout/prospect-cr-section';
import { ProspectFormModal } from '@/components/layout/prospect-form-modal';
import { useAppDispatch } from '@/redux/store';
import { executeProspectAction } from '@/redux/features/prospects/prospectsSlice';

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'fr';
  const id = params?.id as string;
  const dispatch = useAppDispatch();

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

  function moveProspect(id: string, newStatus: ProspectStatus) {
    const action = STATUS_TO_ACTION[newStatus];
    if (!action) return;
    dispatch(executeProspectAction({ id, action }));
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
    <div className="flex flex-col gap-5 p-5 md:p-6 min-h-full">
      {/* Header */}
      <ProspectDetailHeader
        prospect={prospect}
        locale={locale}
        onEdit={() => { setSaveError(null); setEditOpen(true); }}
        onMove={moveProspect}
      />

      {/* Body: two columns on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProspectNotesSection prospectId={id} />
        <ProspectCRSection prospectId={id} prospectName={prospect.company_name ?? prospect.lead_name} />
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
