import React from 'react'

type AppState = 'idle' | 'recording' | 'transcript' | 'processing' | 'draft' | 'validated' | 'error';

const RightPanel = ({ state, wordCount }: { state: AppState; wordCount: number }) => {
  const tipDot = <span className="w-1 h-1 rounded-full flex-shrink-0 mt-[6px]" style={{ background: '#6B35C9' }} />;

  return (
    <div className="flex flex-col gap-4">
      {/* Agent info — shown always */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-2 font-mono">Agent IA</div>
        <div
          className="rounded-xl p-3 border"
          style={{ background: 'rgba(107,53,201,0.05)', borderColor: 'rgba(107,53,201,0.20)' }}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] flex-shrink-0"
              style={{ background: 'var(--grad)', boxShadow: '0 2px 8px rgba(107,53,201,0.25)' }}
            >
              ✦
            </div>
            <div>
              <div className="text-[12px] font-bold text-[var(--tx-1)]">Agent CR Vocal</div>
              <div className="text-[10px] text-[var(--tx-3)] font-mono mt-0.5">Claude Sonnet 4.5</div>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[10px] font-bold"
            style={
              state === 'recording' ? { background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.25)' } :
              state === 'processing' ? { background: 'rgba(107,53,201,0.1)', color: '#5829A8', border: '1px solid rgba(107,53,201,0.2)' } :
              { background: 'rgba(16,185,129,0.1)', color: '#065F46', border: '1px solid rgba(16,185,129,0.25)' }
            }
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{
              background: state === 'recording' ? '#EF4444' : state === 'processing' ? '#6B35C9' : '#10B981',
              animation: state === 'recording' ? 'cr-blink 1s ease-in-out infinite' : 'none',
            }} />
            {state === 'recording' ? 'En écoute active' : state === 'processing' ? 'En traitement…' : 'Disponible'}
          </span>
        </div>
      </div>

      <div className="h-px bg-[var(--bd-def)]" />

      {/* Dossier context */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-2 font-mono">Dossier lié</div>
        <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-3">
          <div className="text-[10px] text-[var(--tx-3)] font-mono mb-0.5">DOS-2026-0142 · Sénégal</div>
          <div className="text-[13px] font-bold text-[var(--tx-1)]">Sonatrans SA</div>
          <div className="text-[11px] text-[var(--tx-3)] mt-1 leading-relaxed">
            Transport frigorifique · DKR → ABJ<br />
            Mission en cours · Créée le 2 juin 2026
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--bd-def)]" />

      {/* State-specific tips */}
      {(state === 'idle' || state === 'recording') && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-2 font-mono">
            {state === 'recording' ? 'Conseils qualité' : 'Guide — que dire'}
          </div>
          <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-3 space-y-2">
            {(state === 'idle' ? [
              'La société + nom et rôle du contact',
              "L'objet de la réunion en 1 phrase",
              'Les chiffres clés : volume, route, budget',
              'Les actions à mener et les délais',
              'La prochaine étape et la date de décision',
            ] : [
              'Tenez le téléphone à 20–30 cm',
              'Parlez à rythme normal, pas trop vite',
              'Évitez les environnements bruyants',
              'Épelez les noms propres si nécessaire',
            ]).map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-[var(--tx-2)]">
                {tipDot}
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state === 'transcript' && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-2 font-mono">Révision ASR</div>
          <div className="rounded-xl p-3 border space-y-2" style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}>
            {[
              'Chiffres en lettres → convertir en chiffres',
              'Noms propres et acronymes (DKR, FCFA…)',
              'Ponctuation manquante ou incorrecte',
              'Homophones mal reconnus',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#92400E' }}>
                <span className="w-1 h-1 rounded-full flex-shrink-0 mt-[6px]" style={{ background: '#F59E0B' }} />
                <span>{tip}</span>
              </div>
            ))}
          </div>
          <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-3 mt-3">
            <div className="text-[26px] font-bold font-display text-[var(--tx-1)] leading-none">{wordCount}</div>
            <div className="text-[11px] text-[var(--tx-3)] mt-1">mots dans la transcription</div>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div>
          <div className="rounded-xl p-3 border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.25)' }}>
            <div className="text-[12px] font-semibold mb-1" style={{ color: '#065F46' }}>Envoi sécurisé · TLS 1.3</div>
            <div className="text-[11px] leading-relaxed" style={{ color: '#059669' }}>
              Votre transcription est chiffrée en transit. Durée moyenne : 7–9 secondes.
            </div>
          </div>
        </div>
      )}

      {state === 'draft' && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] mb-2 font-mono">Légende confiance IA</div>
          <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1.5px solid #10B981', color: '#065F46' }}>✓</span>
              <span className="text-[12px] text-[var(--tx-2)]">Confiance &gt; 90% — valeur fiable</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1.5px solid #F59E0B', color: '#92400E' }}>?</span>
              <span className="text-[12px] text-[var(--tx-2)]">Confiance &lt; 70% — vérifiez avant validation</span>
            </div>
          </div>
          <div className="rounded-xl p-3 border mt-3" style={{ background: 'rgba(107,53,201,0.05)', borderColor: 'rgba(107,53,201,0.2)' }}>
            <div className="text-[12px] font-semibold mb-1" style={{ color: '#5829A8' }}>Paradigme 70 / 30</div>
            <div className="text-[11px] leading-relaxed" style={{ color: '#6B35C9' }}>
              L&apos;IA a produit 100% du contenu. Votre rôle : valider les 5 champs sûrs + corriger le champ ambigu.
            </div>
          </div>
        </div>
      )}

      {state === 'validated' && (
        <div>
          <div className="rounded-xl p-3 border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.25)' }}>
            <div className="text-[12px] font-semibold mb-1" style={{ color: '#065F46' }}>CR archivé avec succès</div>
            <div className="text-[11px] leading-relaxed" style={{ color: '#059669' }}>
              Visible dans DOS-2026-0142 · Sonatrans SA.<br />Copie email envoyée au contact.
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--tx-3)] font-mono">Actions suivantes</div>
            <div className="bg-[var(--bg-sink)] border border-[var(--bd-def)] rounded-xl p-3 space-y-2">
              {['Préparer le devis · avant 10 juin', 'Relance prévue · 15 juin 2026', 'Pipeline mis à jour automatiquement']
                .map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-[var(--tx-2)]">
                    {tipDot}<span>{t}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div>
          <div className="rounded-xl p-3 border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="text-[12px] font-semibold mb-1" style={{ color: '#DC2626' }}>Audio sauvegardé localement</div>
            <div className="text-[11px] leading-relaxed" style={{ color: '#EF4444' }}>
              Aucune perte de données. L&apos;enregistrement est disponible sur l&apos;appareil.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RightPanel
