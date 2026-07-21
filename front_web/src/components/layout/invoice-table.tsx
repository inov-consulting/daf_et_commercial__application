'use client';

interface Invoice {
  id: string;
  period: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending';
}

interface InvoiceTableProps {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function InvoiceTable({ showToast }: InvoiceTableProps) {
  const invoices: Invoice[] = [
    { id: 'POR-2026-006', period: 'Juin 2026', date: '01/06/2026', amount: 156000, currency: 'FCFA', status: 'pending' },
    { id: 'POR-2026-005', period: 'Mai 2026', date: '01/05/2026', amount: 156000, currency: 'FCFA', status: 'paid' },
    { id: 'POR-2026-004', period: 'Avril 2026', date: '01/04/2026', amount: 156000, currency: 'FCFA', status: 'paid' },
    { id: 'POR-2026-003', period: 'Mars 2026', date: '01/03/2026', amount: 156000, currency: 'FCFA', status: 'paid' },
    { id: 'POR-2026-001', period: 'Janvier 2026', date: '01/01/2026', amount: 120000, currency: 'FCFA', status: 'paid' },
  ];

  return (
    <div className="bg-white border border-[#DDE5EF] rounded-xl overflow-hidden mt-4">
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-[14px] border-b border-[#EEF2F7]">
        <span className="font-space-grotesk text-sm font-semibold text-[#1B2633]">
          Historique des factures
        </span>
        <button 
          onClick={() => showToast('Export en cours…', 'info')}
          className="font-inter text-[11px] sm:text-xs font-medium text-primary cursor-pointer hover:underline"
        >
          ⬇ <span className="hidden sm:inline">Tout </span>exporter
        </button>
      </div>
      
      {/* En-tête colonnes - Desktop uniquement */}
      <div className="hidden md:grid grid-cols-[120px_1fr_120px_140px_100px_60px] gap-0 px-5 py-2 bg-[#EEF2F7] border-b border-[#DDE5EF]">
        {['N° Facture', 'Période', 'Date', 'Montant', 'Statut', ''].map((label, i) => (
          <div key={i} className="font-inter text-[11px] font-semibold text-[#7691A8]">
            {label}
          </div>
        ))}
      </div>
      
      {/* Lignes */}
      {invoices.map((invoice) => (
        <div key={invoice.id}>
          {/* Desktop */}
          <div className="hidden md:grid grid-cols-[120px_1fr_120px_140px_100px_60px] gap-0 px-5 py-3 border-b border-[#EEF2F7] last:border-none items-center">
            <div className="font-jetbrains-mono text-[13px] text-[#435869]">{invoice.id}</div>
            <div className="font-inter text-[13px] text-[#435869]">{invoice.period}</div>
            <div className="font-inter text-[13px] text-[#435869]">{invoice.date}</div>
            <div className="font-jetbrains-mono text-[13px] text-[#435869]">
              {invoice.amount.toLocaleString()} {invoice.currency}
            </div>
            <div>
              <StatusBadge status={invoice.status} />
            </div>
            <div>
              <button 
                onClick={() => showToast('Téléchargement PDF', 'info')}
                className="font-inter text-xs font-medium text-primary cursor-pointer hover:underline"
              >
                PDF
              </button>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[#EEF2F7] last:border-none">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-jetbrains-mono text-[12px] font-medium text-[#1B2633]">
                  {invoice.id}
                </span>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="font-inter text-[11px] text-[#7691A8]">
                {invoice.period} · {invoice.date}
              </div>
              <div className="font-jetbrains-mono text-[13px] font-semibold text-[#1B2633] mt-1">
                {invoice.amount.toLocaleString()} {invoice.currency}
              </div>
            </div>
            <button 
              onClick={() => showToast('Téléchargement PDF', 'info')}
              className="font-inter text-[11px] font-medium text-primary hover:underline flex-shrink-0"
            >
              PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Composant helper pour le statut
function StatusBadge({ status }: { status: 'paid' | 'pending' }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center h-5 px-2 bg-[#ECFDF5] border border-[#6EE7B7] rounded-full font-inter text-[10px] sm:text-[11px] font-semibold text-[#0E86E8]">
        Payée
      </span>
    );
  }
  return (
    <span className="inline-flex items-center h-5 px-2 bg-[#FDF7E4] border border-[#D9B96A] rounded-full font-inter text-[10px] sm:text-[11px] font-semibold text-[#7A5C1E]">
      En attente
    </span>
  );
}