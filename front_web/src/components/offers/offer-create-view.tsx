"use client";

import { useState } from "react";
import {
  DownloadSimpleIcon,
  CopyIcon,
  PaperPlaneTiltIcon,
  MagicWandIcon,
  LightbulbIcon,
  MapPinIcon,
  ArrowRightIcon,
  CurrencyCircleDollarIcon,
  UserCircleIcon,
  PrinterIcon,
  ArrowsOutIcon,
  ArrowsInIcon,
  WarningCircleIcon,
  InfoIcon,
  ArrowsClockwiseIcon,
  FileTextIcon,
  ArrowLeftIcon,
  ListIcon,
  CheckCircleIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import type {
  Offer,
  CreateOfferBody,
  OfferSection,
  OfferPricingRow,
} from "@/types/offer_type";
import { computeOfferStatus, fmtOfferAmount } from "@/types/offer_type";
import { OfferAgentChat, type OfferFromChat } from "./offer-agent-chat";
import { CustomerSelect } from "./customer-select";
import { Button } from "../ui";
import { FloatingToast } from "../ui/toast";
import { PostData, PatchData } from "@/lib/ApiService";
import { ApiRoutes } from "@/lib/ApiRoutes";

// ── Mappings transport_mode / vehicle_type ────────────────────────────────────

const MODE_TO_API: Record<string, string> = {
  'Terrestre':  'terrestre',
  'Maritime':   'maritime',
  'Aérien':     'aérien',
  'Routier':    'terrestre',
  'Multimodal': 'multimodal',
};
const API_TO_MODE: Record<string, string> = {
  terrestre:  'Terrestre',
  maritime:   'Maritime',
  'aérien':   'Aérien',
  multimodal: 'Multimodal',
};

const VEHICULE_TO_API: Record<string, string> = {
  'Benne':         'benne',
  'Plateau':       'plateau',
  'Citerne':       'citerne',
  'Fourgon':       'benne',
  'Conteneur':     'plateau',
  'Semi-remorque': 'plateau',
  'Frigorifique':  'benne',
};
const API_TO_VEHICULE: Record<string, string> = {
  benne:   'Benne',
  plateau: 'Plateau',
  citerne: 'Citerne',
};

function normalizeMode(raw: string | undefined): string {
  if (!raw) return 'Terrestre';
  return API_TO_MODE[raw.toLowerCase()] ?? raw;
}

function normalizeVehicule(raw: string | undefined): string {
  if (!raw) return 'Benne';
  const s = raw.toLowerCase();
  if (API_TO_VEHICULE[s]) return API_TO_VEHICULE[s];
  if (s.includes('citerne')) return 'Citerne';
  if (s.includes('plateau')) return 'Plateau';
  return 'Benne';
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface OfferCreateViewProps {
  editingOffer?: Offer | null;
  recentOffers?: Offer[];
  onBack: () => void;
  onSave: (body: CreateOfferBody) => Promise<Offer>;
  onGenerate?: (id: string) => Promise<Offer>;
  onSend?: (offer: Offer) => void;
  onViewRecent?: (offer: Offer) => void;
  onDuplicate?: (offer: Offer) => void;
  onOfferCreated?: (offerId: string) => void;
  /** Mode édition : rappelé avec l'id après PATCH réussi */
  onUpdated?: (offerId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TVA_RATE = 0.1925;

function extractPricingField(
  pricing: OfferPricingRow[],
  keywords: string[],
): OfferPricingRow | undefined {
  return pricing.find((p) =>
    keywords.some((k) => p.label?.toLowerCase().includes(k)),
  );
}

function extractTvaRate(pricing: OfferPricingRow[]): number {
  const row = pricing.find((p) => p.label?.toLowerCase().includes("tva"));
  if (!row) return TVA_RATE;
  const match = String(row.label).match(/([\d.]+)\s*%/);
  return match ? parseFloat(match[1]) / 100 : TVA_RATE;
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function fmtDateFr(iso: string) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ACCENT_COLORS = ["#1E5B3C", "#92720C", "#059669", "#D97706"];

const STAT_COLORS: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  brouillon: { bg: "#FBF3DE", color: "#725A0A", label: "Brouillon" },
  genere: { bg: "#EEF7F1", color: "#184A31", label: "Généré" },
  envoyee: { bg: "#FFFBEB", color: "#D97706", label: "Validée"    },
  validee: { bg: "#ECFDF5", color: "#059669", label: "Lié à Odoo" },
  refusee: { bg: "#FEF2F2", color: "#DC2626", label: "Refusée" },
  expiree: { bg: "#F3F4F6", color: "#6B7280", label: "Expirée" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Sel({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 border border-gray-200 rounded-lg px-3 pr-8 text-[13px] text-gray-900 bg-white bg-no-repeat appearance-none cursor-pointer outline-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239EB0C4' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 12px center",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ── Formatage inline (gras) ────────────────────────────────────────────────────

function inlineBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} style={{ fontWeight: 700, color: "#1B2633" }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part || null
    ),
  );
}

// ── Renderer de contenu de section IA ─────────────────────────────────────────

/**
 * Rend le contenu d'une section qui peut contenir :
 *   **Clé :** valeur  → ligne info (label muted + valeur bold)
 *   **Remarques :** texte long → label en-tête + paragraphe
 *   Texte ordinaire  → paragraphe
 */
function SectionContentBody({ content }: { content: string }) {
  interface KvRow {
    label: string;
    value: string;
  }

  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let nodeKey = 0;
  let kvBatch: KvRow[] = [];

  function flushKv() {
    if (!kvBatch.length) return;
    nodes.push(
      <div
        key={nodeKey++}
        style={{
          background: "#F7F9FC",
          border: "1px solid #DDE5EF",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        {kvBatch.map((kv, bi) => {
          const isLong = kv.value.length > 70;
          const lastRow = bi === kvBatch.length - 1;
          return isLong ? (
            <div
              key={bi}
              style={{
                padding: "8px 12px",
                borderBottom: lastRow ? "none" : "1px solid #EEF2F7",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#5A738A",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                {kv.label}
              </div>
              <div style={{ fontSize: 12, color: "#1B2633", lineHeight: 1.65 }}>
                {kv.value}
              </div>
            </div>
          ) : (
            <div
              key={bi}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "6px 12px",
                borderBottom: lastRow ? "none" : "1px solid #EEF2F7",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#7691A8",
                  flexShrink: 0,
                  minWidth: 150,
                }}
              >
                {kv.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#1B2633",
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {kv.value}
              </span>
            </div>
          );
        })}
      </div>,
    );
    kvBatch = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushKv();
      continue;
    }

    // Détecte **Clé :** valeur  ou  **Clé** : valeur  ou  **Clé:** valeur
    const m = line.match(/^\*\*([^*]+?)\s*:?\s*\*\*\s*:?\s*(.+)?$/);
    if (m) {
      const label = m[1].replace(/\s*:$/, "").trim();
      const value = (m[2] ?? "").trim();
      if (label) {
        kvBatch.push({ label, value });
        continue;
      }
    }

    flushKv();
    nodes.push(
      <p
        key={nodeKey++}
        style={{
          fontSize: 12,
          color: "#435869",
          lineHeight: 1.7,
          marginBottom: 4,
        }}
      >
        {inlineBold(line)}
      </p>,
    );
  }
  flushKv();
  return <div>{nodes}</div>;
}

// ── Impression du document ─────────────────────────────────────────────────────

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionContentHtml(content: string): string {
  const lines = content.split("\n");
  const parts: string[] = [];
  const kvBatch: Array<{ label: string; value: string }> = [];

  function flushKv() {
    if (!kvBatch.length) return;
    const rows = kvBatch
      .map((kv) => {
        if (kv.value.length > 70) {
          return `<div class="kv-long"><div class="kv-label-long">${escHtml(kv.label)}</div><div class="kv-value-long">${escHtml(kv.value)}</div></div>`;
        }
        return `<div class="kv-row"><span class="kv-label">${escHtml(kv.label)}</span><span class="kv-value">${escHtml(kv.value)}</span></div>`;
      })
      .join("");
    parts.push(`<div class="kv-card">${rows}</div>`);
    kvBatch.length = 0;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushKv();
      continue;
    }
    const m = line.match(/^\*\*([^*]+?)\s*:?\s*\*\*\s*:?\s*(.+)?$/);
    if (m) {
      const label = m[1].replace(/\s*:$/, "").trim();
      const value = (m[2] ?? "").trim();
      if (label) {
        kvBatch.push({ label, value });
        continue;
      }
    }
    flushKv();
    const boldLine = escHtml(line).replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>",
    );
    parts.push(`<p class="text-para">${boldLine}</p>`);
  }
  flushKv();
  return parts.join("");
}

function printOffer(props: DocPreviewProps) {
  const {
    client,
    origine,
    destination,
    produit,
    quantite,
    unite,
    mode,
    vehicule,
    ht,
    tva,
    ttc,
    pu,
    tvaRate,
    dateDepart,
    validite,
    sections,
    footer,
    offerRef,
    pricingRows,
  } = props;

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fmtN = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

  // Sections
  const sectionsHtml =
    sections.length > 0
      ? sections
          .map(
            (s) => `
        <div class="section">
          <div class="section-header">
            <span class="section-title">${escHtml(s.heading)}</span>
            <div class="section-line"></div>
          </div>
          <div class="section-body">${sectionContentHtml(s.content)}</div>
        </div>`,
          )
          .join("")
      : "";

  // Tarification
  const pricingRowsHtml =
    pricingRows.length > 0
      ? pricingRows
          .map((row) => {
            const isTotal = /ttc|total/i.test(String(row.label));
            const valStr =
              typeof row.value === "number" && row.value > 0
                ? fmtN(row.value) + (row.unit ? ` ${row.unit}` : "")
                : `${row.value}${row.unit ? " " + row.unit : ""}`;
            return `<tr class="${isTotal ? "total" : ""}"><td>${escHtml(String(row.label))}</td><td>${escHtml(valStr)}</td></tr>`;
          })
          .join("")
      : [
          ["Quantité", `${quantite} ${unite}`],
          ["Prix unitaire", `${fmtN(pu)} FCFA`],
          ["Montant HT", `${fmtN(ht)} FCFA`],
          [`TVA (${(tvaRate * 100).toFixed(2)}%)`, `${fmtN(tva)} FCFA`],
          ["Montant TTC", `${fmtN(ttc)} FCFA`],
        ]
          .map(
            ([label, val], i) =>
              `<tr class="${i === 4 ? "total" : ""}"><td>${escHtml(label)}</td><td>${escHtml(val)}</td></tr>`,
          )
          .join("");

  const footerHtml = footer
    ? `<div class="footer-text">${escHtml(footer)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Offre de transport${offerRef ? " – " + offerRef : ""}</title>
  <style>
    @page { margin: 22mm 18mm; size: A4 portrait; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 12px; color: #1B2633; line-height: 1.5; }

    .letterhead { text-align: center; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 2px solid #1E5B3C; }
    .company-name { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #1E5B3C; margin-bottom: 8px; }
    .offer-title { font-size: 20px; font-weight: 700; color: #1B2633; margin-bottom: 4px; letter-spacing: -0.3px; }
    .offer-ref { font-family: monospace; font-size: 11px; color: #7691A8; }

    .meta { display: flex; gap: 32px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #EEF2F7; }
    .meta-col { flex: 1; }
    .meta-cap { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9EB0C4; margin-bottom: 5px; }
    .meta-name { font-size: 13px; font-weight: 700; color: #1B2633; margin-bottom: 2px; }
    .meta-sub { font-size: 11px; color: #7691A8; }

    .objet { background: #F7F9FC; border: 1px solid #DDE5EF; border-radius: 5px; padding: 10px 14px; margin-bottom: 22px; font-size: 12px; color: #1B2633; }

    .section { margin-bottom: 18px; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .section-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #1E5B3C; white-space: nowrap; }
    .section-line { flex: 1; height: 1px; background: #EEF2F7; }

    .kv-card { border: 1px solid #DDE5EF; border-radius: 5px; overflow: hidden; margin-bottom: 8px; }
    .kv-row { display: flex; align-items: center; gap: 12px; padding: 6px 12px; border-bottom: 1px solid #EEF2F7; }
    .kv-row:last-child { border-bottom: none; }
    .kv-label { font-size: 11px; color: #7691A8; min-width: 150px; flex-shrink: 0; }
    .kv-value { font-size: 12px; font-weight: 600; color: #1B2633; flex: 1; }
    .kv-long { padding: 8px 12px; border-bottom: 1px solid #EEF2F7; }
    .kv-long:last-child { border-bottom: none; }
    .kv-label-long { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #5A738A; margin-bottom: 4px; }
    .kv-value-long { font-size: 12px; color: #1B2633; line-height: 1.65; }
    .text-para { font-size: 12px; color: #435869; line-height: 1.7; margin-bottom: 5px; }

    .pricing-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .pricing-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #1E5B3C; }
    .pricing-line { flex: 1; height: 1px; background: #EEF2F7; }
    .pricing-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #DDE5EF; border-radius: 5px; overflow: hidden; margin-bottom: 18px; }
    .pricing-table td { padding: 7px 12px; border-bottom: 1px solid #EEF2F7; }
    .pricing-table tr:last-child td { border-bottom: none; }
    .pricing-table td:first-child { color: #5A738A; }
    .pricing-table td:last-child { text-align: right; font-weight: 500; color: #1B2633; }
    .pricing-table tr.total td { font-weight: 700; background: #F7F9FC; }
    .pricing-table tr.total td:last-child { color: #1E5B3C; }

    .validity { font-size: 11px; color: #7691A8; border-top: 1px solid #EEF2F7; padding-top: 14px; margin-top: 14px; }
    .footer-text { font-size: 11px; color: #7691A8; font-style: italic; margin-top: 14px; padding-top: 14px; border-top: 1px solid #EEF2F7; line-height: 1.65; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="letterhead">
    <div class="company-name">INOV Consulting / PortaLis Group Holding</div>
    <div class="offer-title">Offre de Transport</div>
    <div class="offer-ref">${offerRef ? "Réf : " + escHtml(offerRef) + " · " : ""}${today}</div>
  </div>

  <div class="meta">
    <div class="meta-col">
      <div class="meta-cap">Émetteur</div>
      <div class="meta-name">INOV Consulting</div>
      <div class="meta-sub">commercial@inov-consulting.com</div>
    </div>
    <div class="meta-col">
      <div class="meta-cap">Destinataire</div>
      <div class="meta-name">${escHtml(client || "Client")}</div>
    </div>
  </div>

  <div class="objet">
    <strong>Objet :</strong> Transport de ${escHtml(produit || "marchandises")} –
    ${escHtml(origine || "–")} → ${escHtml(destination || "–")}
    (${quantite} ${escHtml(unite)} · ${escHtml(vehicule)} · ${escHtml(mode)})
  </div>

  ${sectionsHtml}

  <div class="pricing-header">
    <span class="pricing-title">Tarification</span>
    <div class="pricing-line"></div>
  </div>
  <table class="pricing-table">
    <tbody>${pricingRowsHtml}</tbody>
  </table>

  <div class="validity">
    Valide ${validite} jour${validite > 1 ? "s" : ""} à compter de la date d'émission
    ${dateDepart !== "–" ? "· Chargement prévu le " + escHtml(dateDepart) : ""}
  </div>

  ${footerHtml}

</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Légère pause pour laisser le navigateur rendre avant d'ouvrir la boîte d'impression
  setTimeout(() => {
    win.print();
    win.onafterprint = () => win.close();
  }, 400);
}

function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      {children}
    </div>
  );
}

// ── Offer document preview ─────────────────────────────────────────────────────

interface DocPreviewProps {
  client: string;
  companyName: string;
  origine: string;
  destination: string;
  produit: string;
  quantite: number;
  unite: string;
  mode: string;
  vehicule: string;
  ht: number;
  tva: number;
  ttc: number;
  pu: number;
  tvaRate: number;
  dateDepart: string;
  validite: number;
  generated: boolean;
  sections: OfferSection[];
  footer: string;
  offerRef: string;
  pricingRows: OfferPricingRow[];
}

function OfferDocPreview({
  client,
  companyName,
  origine,
  destination,
  produit,
  quantite,
  unite,
  mode,
  vehicule,
  ht,
  tva,
  ttc,
  pu,
  tvaRate,
  dateDepart,
  validite,
  generated,
  sections,
  footer,
  offerRef,
  pricingRows,
}: DocPreviewProps) {
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hasSections = sections.length > 0;
  const hasPricing = pricingRows.length > 0;

  return (
    <div className="text-[13px] text-gray-900 leading-relaxed">
      {/* Letterhead */}
      <div className="text-center mb-5 pb-4 border-b border-gray-100">
        <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-[0.12em] mb-1.5">
          INOV Consulting / PortaLis Group Holding
        </div>
        <div className="w-15 h-0.5 bg-emerald-800 mx-auto mb-3" />
        <div className="text-lg font-bold text-gray-900 tracking-tight mb-1">
          Offre de Transport
        </div>
        <div className="font-mono text-[11px] text-gray-400">
          {offerRef ? `Réf : ${offerRef}` : "Réf : –"} · {today}
        </div>
      </div>

      {/* Meta — émetteur / destinataire */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 pb-4 border-b border-gray-100">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Émetteur
          </div>
          <div className="text-[13px] font-bold text-gray-900 mb-0.5">
            INOV Consulting
          </div>
          <div className="text-[11px] text-gray-500 leading-relaxed">
            commercial@inov-consulting.com
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Destinataire
          </div>
          <div className="text-[13px] font-bold text-gray-900 mb-0.5">
            {client || "Client"}
          </div>
          {companyName && (
            <div className="text-[11px] text-gray-500">{companyName}</div>
          )}
        </div>
      </div>

      {/* Objet */}
      <div className="text-xs font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-2.5 mb-4 flex items-start gap-1.5">
        <FileTextIcon
          size={14}
          className="text-emerald-800 flex-shrink-0 mt-0.5"
        />
        <span>
          <strong>Objet :</strong>&nbsp;Transport de {produit || "marchandises"}{" "}
          – {origine || "–"} → {destination || "–"}&nbsp;({quantite}&nbsp;
          {unite} · {vehicule} · {mode})
        </span>
      </div>

      {/* Sections IA */}
      {hasSections ? (
        sections.map((s, i) => (
          <div key={i} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 whitespace-nowrap">
                {s.heading}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <SectionContentBody content={s.content} />
          </div>
        ))
      ) : (
        <div className="mb-4 text-[12px] text-gray-400 italic text-center py-4">
          {generated
            ? "Contenu généré par l'IA — sections non disponibles"
            : "L'aperçu du document apparaîtra après génération par l'IA"}
        </div>
      )}

      {/* Tableau de tarification */}
      {hasPricing ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Tarification
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <table className="w-full text-[12px] border-collapse">
            <tbody>
              {pricingRows.map((row, i) => {
                const isTotal =
                  row.label?.toLowerCase().includes("ttc") ||
                  row.label?.toLowerCase().includes("total");
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${isTotal ? "font-bold bg-gray-50" : ""}`}
                  >
                    <td className="py-1.5 pr-3 text-gray-600">{row.label}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900">
                      {typeof row.value === "number" && row.value > 0
                        ? row.value.toLocaleString("fr-FR") +
                          (row.unit ? ` ${row.unit}` : "")
                        : `${row.value}${row.unit ? " " + row.unit : ""}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : generated ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Tarification
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <table className="w-full text-[12px] border-collapse">
            <tbody>
              {[
                ["Quantité", `${quantite} ${unite}`],
                ["Prix unitaire", `${fmt(pu)} FCFA`],
                ["Montant HT", `${fmt(ht)} FCFA`],
                [`TVA (${(tvaRate * 100).toFixed(2)}%)`, `${fmt(tva)} FCFA`],
                ["Montant TTC", `${fmt(ttc)} FCFA`],
              ].map(([label, val], i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${label === "Montant TTC" ? "font-bold bg-gray-50" : ""}`}
                >
                  <td className="py-1.5 pr-3 text-gray-600">{label}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900">
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Validité */}
      <div className="text-[11px] text-gray-500 border-t border-gray-100 pt-3 mt-2">
        Valide {validite} jour{validite > 1 ? "s" : ""} à compter de la date
        d&apos;émission
        {dateDepart !== "–" && ` · Chargement prévu le ${dateDepart}`}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 italic leading-relaxed">
          {footer}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OfferCreateView({
  editingOffer,
  recentOffers = [],
  onBack,
  onSave,
  onGenerate,
  onSend,
  onViewRecent,
  onDuplicate,
  onOfferCreated,
  onUpdated,
}: OfferCreateViewProps) {
  const [showMobilePanel, setShowMobilePanel] = useState<"form" | "preview">(
    "form",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form state
  const [client, setClient] = useState(editingOffer?.client_name ?? "");
  const [partnerId, setPartnerId] = useState<number | null>(editingOffer?.partner_id ?? null);
  const [companyName, setCompanyName] = useState(editingOffer?.company_name ?? "");
  const [origine, setOrigine] = useState(
    editingOffer?.route?.origin?.split(",")[0]?.trim() ?? "",
  );
  const [destination, setDestination] = useState(
    editingOffer?.route?.destination?.split(",")[0]?.trim() ?? "",
  );
  const [produit, setProduit] = useState(
    editingOffer?.product_description ?? "",
  );
  const [quantite, setQuantite] = useState<number>(
    editingOffer?.quantity ?? 20,
  );
  const [unite, setUnite] = useState(editingOffer?.quantity_unit ?? "tonnes");
  const [mode, setMode] = useState(normalizeMode(editingOffer?.transport_mode));
  const [vehicule, setVehicule] = useState(normalizeVehicule(editingOffer?.vehicle_type));
  const [prixStr, setPrixStr] = useState(
    editingOffer?.unit_price ? String(editingOffer.unit_price) : "",
  );
  const [dateDepart, setDateDepart] = useState(
    editingOffer?.date_planned ?? "",
  );
  const [validite, setValidite] = useState(
    String(editingOffer?.validity_days ?? 7),
  );

  // App state
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(!!editingOffer?.ai_generated);
  const [validating, setValidating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [savedOffer, setSavedOffer] = useState<Offer | null>(
    editingOffer ?? null,
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [createPhase, setCreatePhase] = useState<"chat" | "form">(
    editingOffer ? "form" : "chat",
  );
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Données IA enrichies
  const [sections, setSections] = useState<OfferSection[]>([]);
  const [footer, setFooter] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tvaRate, setTvaRate] = useState(TVA_RATE);
  const [pricingRows, setPricingRows] = useState<OfferPricingRow[]>([]);

  // Computed pricing
  const pu = parseFloat(prixStr.replace(/\s/g, "")) || 0;
  const ht = quantite * pu;
  const tva = ht * tvaRate;
  const ttc = ht + tva;

  const departFmt = dateDepart ? fmtDateFr(dateDepart) : "–";
  const validiteJours = parseInt(validite) || 7;

  // Gestionnaires
  async function handleGenerate() {
    if (generating) return;
    let offer = savedOffer;
    if (!offer) {
      try {
        offer = await onSave({
          client_name: client,
          origin_location: origine,
          destination_location: destination,
          transport_mode: mode,
          vehicle_type: vehicule,
          product_description: produit,
          quantity: quantite,
          quantity_unit: unite,
          unit_price: pu,
          validity_days: validiteJours,
          date_planned: dateDepart || undefined,
        });
        setSavedOffer(offer);
      } catch {
        return;
      }
    }
    setGenerating(true);
    try {
      if (onGenerate && offer) {
        const result = await onGenerate(offer.id);
        setSavedOffer(result);
      }
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  async function handleOfferGenerated({ offerId, data }: OfferFromChat) {
    // Champs de base
    setClient(data.client.name || "");
    setOrigine(data.route.origin || "");
    setDestination(data.route.destination || "");
    setMode(data.route.transport_mode || "Terrestre");
    setVehicule(data.route.vehicle_type || "Benne");
    setDateDepart(data.route.planned_date || "");
    setValidite(String(data.validity_days || 7));

    // Extraction depuis le tableau pricing
    const pricing = (data.pricing ?? []) as unknown as OfferPricingRow[];
    const produitRow = extractPricingField(pricing, ["produit", "product"]);
    const qteRow = extractPricingField(pricing, ["quantit"]);
    const puRow = extractPricingField(pricing, [
      "prix unitaire",
      "unit price",
      "price_per_unit",
    ]);

    if (produitRow) setProduit(String(produitRow.value));
    if (qteRow) {
      setQuantite(Number(qteRow.value) || 1);
      setUnite(qteRow.unit || "tonnes");
    }
    if (puRow) setPrixStr(String(puRow.value));
    setTvaRate(extractTvaRate(pricing));
    setPricingRows(pricing);

    // Sections et footer
    setSections((data.sections ?? []) as unknown as OfferSection[]);
    setFooter((data as unknown as { footer?: string }).footer ?? "");
    setWarnings((data as unknown as { warnings?: string[] }).warnings ?? []);

    setGenerated(true);

    setSavedOffer({
      id: offerId,
      name: data.reference || `OFF-${Date.now()}`,
      ai_generated: true,
      client_name: data.client.name,
      partner_id: 0,
      origin_location: data.route.origin,
      destination_location: data.route.destination,
      transport_mode: data.route.transport_mode,
      vehicle_type: data.route.vehicle_type,
      product_description: produitRow ? String(produitRow.value) : "",
      quantity: qteRow ? Number(qteRow.value) || 1 : 1,
      quantity_unit: qteRow?.unit || "tonnes",
      unit_price: puRow ? Number(puRow.value) || 0 : 0,
      amount_untaxed: 0,
      amount_tax: 0,
      amount_total: 0,
      amount_ttc: 0,
      tva_rate: 0,
      validity_days: data.validity_days,
      date_planned: data.route.planned_date,
      date_emission: data.date,
      date_expiry: "",
      currency: "XOF",
      state: "genere",
      created_at: new Date().toISOString(),
      odoo_linked: false,
    } as Offer);

    setGenerationSuccess(true);
    await new Promise((r) => setTimeout(r, 900));
    setCreatePhase("form");
    setGenerationSuccess(false);
  }

  // Étape 1 : valider l'offre (generated → validated). Confirm vers Odoo se fait depuis la page détail.
  async function handleValidate() {
    if (!savedOffer || validating) return;
    setValidating(true);
    try {
      await PostData<Record<string, unknown>, Record<string, never>>({
        url: ApiRoutes.TRANSPORT_OFFERS_VALIDATE(savedOffer.id),
        data: {},
        protected: true,
      });
      onOfferCreated?.(savedOffer.id);
    } finally {
      setValidating(false);
    }
  }

  // PATCH /form — modifie les données de l'offre (IA ou manuelle)
  async function handleUpdate() {
    if (!savedOffer || updating) return;
    setUpdating(true);
    setUpdateError(null);
    const res = await PatchData({
      url: ApiRoutes.TRANSPORT_OFFERS_FORM(savedOffer.id),
      data: {
        client_name:          client,
        ...(partnerId !== null ? { partner_id: partnerId } : {}),
        product_description:  produit,
        quantity:             quantite,
        quantity_unit:        unite,
        origin:               origine,
        destination:          destination,
        transport_mode:       MODE_TO_API[mode]         ?? mode.toLowerCase(),
        vehicle_type:         VEHICULE_TO_API[vehicule] ?? vehicule.toLowerCase(),
        ...(dateDepart ? { planned_date: dateDepart } : {}),
        price_unit:           pu,
        validity_days:        validiteJours,
      },
      protected: true,
    });
    setUpdating(false);
    if (!res.ok) {
      const msg = res.error ?? 'Erreur lors de la modification de l\'offre';
      setUpdateError(msg);
      setTimeout(() => setUpdateError(null), 5000);
      return;
    }
    onUpdated?.(savedOffer.id);
  }

  const offerRef = savedOffer?.name ?? "";
  const offerStatus = savedOffer ? computeOfferStatus(savedOffer) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-5 lg:p-7 lg:px-8 pb-16 min-h-full">
      <FloatingToast message={updateError} type="error" />
      {/* ── Page header responsive ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 min-h-[56px]">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="md"
            onClick={onBack}
            className="!p-2 sm:!p-2.5"
          >
            <ArrowLeftIcon size={13} />
          </Button>
          <h1 className="text-lg sm:text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
            {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
          </h1>
          {offerRef && (
            <span className="text-lg sm:text-[22px] font-normal text-gray-400">
              / {offerRef}
            </span>
          )}
          {offerStatus && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 py-1 px-3 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 animate-pulse inline-block" />
              Généré
            </span>
          )}
        </div>

        {/* Actions desktop */}
        {/* <div className="hidden sm:flex items-center gap-2.5">
          <button className="h-[34px] px-3.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-sm hover:bg-gray-50 transition-colors">
            <DownloadSimpleIcon size={14} /> Exporter PDF
          </button>
          <button
            onClick={() => savedOffer && onDuplicate?.(savedOffer)}
            className="h-[34px] px-3.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <CopyIcon size={14} /> Dupliquer
          </button>
          <button
            onClick={() => savedOffer && onSend?.(savedOffer)}
            className="h-[34px] px-4 bg-emerald-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 shadow-md hover:bg-emerald-900 transition-colors"
          >
            <PaperPlaneTiltIcon size={13} weight="fill" /> Envoyer
          </button>
        </div> */}

        {/* Menu mobile */}
        <div className="sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 px-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <ListIcon size={14} /> Actions
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-4 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <DownloadSimpleIcon size={14} /> Exporter PDF
              </button>
              <button className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <CopyIcon size={14} /> Dupliquer
              </button>
              {/* <button className="w-full text-left px-4 py-2.5 text-xs text-white bg-emerald-800 hover:bg-emerald-900 flex items-center gap-2">
                <PaperPlaneTiltIcon size={13} /> Envoyer
              </button> */}
            </div>
          )}
        </div>
      </div>

      {/* ── Toggle mobile: Form vs Preview ─────────────────────────────── */}
      {createPhase !== "chat" && (
        <div className="flex lg:hidden gap-2 mb-4">
          <button
            onClick={() => setShowMobilePanel("form")}
            className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
              showMobilePanel === "form"
                ? "bg-emerald-800 text-white"
                : "border border-gray-200 text-gray-700"
            }`}
          >
            Formulaire
          </button>
          <button
            onClick={() => setShowMobilePanel("preview")}
            className={`h-[34px] flex-1 rounded-lg text-sm font-medium transition-colors ${
              showMobilePanel === "preview"
                ? "bg-emerald-800 text-white"
                : "border border-gray-200 text-gray-700"
            }`}
          >
            Imprimer
          </button>
        </div>
      )}

      {/* ── Two-column layout responsive ────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-7 lg:items-start">
        {/* ── Brief panel ─────────────────────────────────────────────── */}
        {!fullscreen && createPhase === "chat" && (
          <div className="w-full lg:w-[460px] lg:flex-shrink-0">
            <OfferAgentChat
              onOfferGenerated={handleOfferGenerated}
              onCancel={() => setCreatePhase("form")}
            />
          </div>
        )}

        {!fullscreen && createPhase === "form" && (
          <div
            className={`bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden w-full lg:w-[460px] lg:flex-shrink-0 ${showMobilePanel === "preview" ? "hidden lg:block" : ""}`}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2 px-4 sm:px-5 h-12 bg-gray-50 border-b border-gray-200">
              <div className="flex-shrink-0 w-6 h-6 rounded-md bg-amber-700 text-white flex items-center justify-center">
                <FileTextIcon size={12} weight="fill" />
              </div>
              <span className="flex-1 text-xs font-semibold text-amber-700">
                Agent Offres · IA
              </span>
              <span className="font-mono text-[10px] text-amber-700 bg-amber-50 border border-amber-300 rounded-lg px-1.5 py-0.5">
                ≤10s
              </span>
            </div>

            {/* Panel body */}
            <div className="p-4 sm:p-5 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-300px)]">
              {/* Client */}
              <FormField label="Entreprise / Client">
                <CustomerSelect
                  value={client}
                  partnerId={partnerId}
                  onChange={(name, pid) => { setClient(name); setPartnerId(pid); }}
                />
              </FormField>

              {/* Entreprise */}
              {/* <FormField label="Entreprise">
                <div className="relative">
                  <BuildingsIcon
                    size={16}
                    weight="fill"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nom de l'entreprise (optionnel)"
                    className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                      companyName
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  />
                </div>
              </FormField> */}

              {/* Trajet */}
              <FormField label="Trajet">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <MapPinIcon
                      size={15}
                      weight="fill"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-800 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={origine}
                      onChange={(e) => setOrigine(e.target.value)}
                      placeholder="Origine"
                      className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                        origine
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-gray-200 bg-white"
                      }`}
                    />
                  </div>
                  <ArrowRightIcon
                    size={14}
                    className="text-gray-400 flex-shrink-0 self-center rotate-90 sm:rotate-0"
                  />
                  <div className="relative flex-1">
                    <MapPinIcon
                      size={15}
                      weight="fill"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-700 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Destination"
                      className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                        destination
                          ? "border-amber-300 bg-amber-50"
                          : "border-gray-200 bg-white"
                      }`}
                    />
                  </div>
                </div>
              </FormField>

              {/* Marchandise */}
              <FormField label="Marchandise">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={produit}
                    onChange={(e) => setProduit(e.target.value)}
                    placeholder="Produit transporté"
                    className="h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                  />
                  <input
                    type="number"
                    value={quantite}
                    onChange={(e) => setQuantite(Number(e.target.value))}
                    placeholder="Quantité"
                    className="h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                  />
                  <input
                    type="text"
                    value={unite}
                    onChange={(e) => setUnite(e.target.value)}
                    placeholder="Unité"
                    className="h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                  />
                </div>
              </FormField>

              {/* Mode & Véhicule */}
              <FormField label="Mode & Véhicule">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Sel
                    value={mode}
                    onChange={setMode}
                    options={[
                      "Terrestre",
                      "Maritime",
                      "Aérien",
                      "Routier",
                      "Multimodal",
                    ]}
                  />
                  <Sel
                    value={vehicule}
                    onChange={setVehicule}
                    options={[
                      "Benne",
                      "Plateau",
                      "Fourgon",
                      "Citerne",
                      "Conteneur",
                      "Semi-remorque",
                      "Frigorifique",
                    ]}
                  />
                </div>
              </FormField>

              {/* Prix unitaire */}
              <FormField label="Prix unitaire (FCFA / tonne)">
                <div className="relative">
                  <CurrencyCircleDollarIcon
                    size={16}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={prixStr}
                    onChange={(e) => setPrixStr(e.target.value)}
                    placeholder="Montant"
                    className={`w-full h-10 border rounded-lg pl-8 pr-3 text-[13px] text-gray-900 outline-none ${
                      prixStr
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                  <InfoIcon size={11} weight="fill" className="text-gray-400" />
                  TVA appliquée : 19,25% · calcul HT / TVA / TTC automatique
                </div>
              </FormField>

              {/* Date de transport */}
              <FormField label="Date de transport prévue">
                <input
                  type="date"
                  value={dateDepart}
                  onChange={(e) => setDateDepart(e.target.value)}
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50"
                />
              </FormField>

              {/* Validité */}
              <FormField label="Validité de l'offre">
                <Sel
                  value={validite}
                  onChange={setValidite}
                  options={["30 jours", "15 jours", "7 jours", "60 jours"]}
                />
              </FormField>

              {/* ── Avertissements SMTP / IA ─────────────────────────────── */}
              {warnings.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5"
                    >
                      <WarningCircleIcon
                        size={13}
                        weight="fill"
                        className="text-amber-600 flex-shrink-0 mt-0.5"
                      />
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        {w}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Sections IA (éditables) ───────────────────────────────── */}
              {sections.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Contenu de l&apos;offre
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  {sections.map((s, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-emerald-800 truncate">
                        {s.heading}
                      </label>
                      <textarea
                        value={s.content}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((sec, idx) =>
                              idx === i
                                ? { ...sec, content: e.target.value }
                                : sec,
                            ),
                          )
                        }
                        rows={4}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50 resize-y leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Pied de page ─────────────────────────────────────────── */}
              {footer !== "" && (
                <FormField label="Pied de page">
                  <textarea
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-emerald-300 focus:bg-emerald-50 resize-y leading-relaxed"
                  />
                </FormField>
              )}
            </div>

            {/* Panel footer */}
            <div className="p-4 sm:p-5 border-t border-gray-200 flex flex-col gap-2.5">
              {/* ── Mode édition directe (depuis la liste) ── */}
              {editingOffer && savedOffer ? (
                <>
                  <div className="flex items-start gap-2 bg-[#EBF5FD] border border-[#7DBCEA] rounded-lg p-2.5">
                    <CheckCircleIcon size={14} weight="fill" className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-700 leading-relaxed">
                      <strong>Mode édition</strong> — Modifiez les informations puis sauvegardez. Le document sera régénéré depuis la page détail.
                    </div>
                  </div>
                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="w-full h-11 border-none rounded-lg bg-emerald-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? (
                      <><ArrowsClockwiseIcon size={18} className="animate-spin" /> Sauvegarde en cours…</>
                    ) : (
                      <><CheckCircleIcon size={18} weight="fill" /> Sauvegarder les modifications</>
                    )}
                  </button>
                </>
              ) : generated && savedOffer ? (
                /* ── Après génération IA : Valider + Modifier ── */
                <>
                  <div className="flex items-start gap-2 bg-[#EBF5FD] border border-[#7DBCEA] rounded-lg p-2.5">
                    <CheckCircleIcon size={14} weight="fill" className="text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-700 leading-relaxed">
                      <strong>Offre générée par l&apos;IA</strong> — Vérifiez et ajustez les informations si nécessaire, puis validez. La confirmation Odoo se fera depuis la page détail.
                    </div>
                  </div>
                  <button
                    onClick={handleValidate}
                    disabled={validating || updating}
                    className="w-full h-11 border-none rounded-lg bg-emerald-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validating ? (
                      <><ArrowsClockwiseIcon size={18} className="animate-spin" /> Validation en cours…</>
                    ) : (
                      <><CheckCircleIcon size={18} weight="fill" /> Valider l&apos;offre</>
                    )}
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={updating || validating}
                    className="w-full h-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? (
                      <><ArrowsClockwiseIcon size={16} className="animate-spin" /> Sauvegarde…</>
                    ) : (
                      <><PencilSimpleIcon size={15} /> Modifier l&apos;offre</>
                    )}
                  </button>
                </>
              ) : (
                /* ── Création initiale : Générer avec l'IA ── */
                <>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                    <LightbulbIcon
                      size={14}
                      weight="fill"
                      className="text-amber-700 flex-shrink-0 mt-0.5"
                    />
                    <div className="text-[11px] text-amber-700 leading-relaxed">
                      <strong>Contexte IA activé</strong> — L&apos;agent
                      construit l&apos;offre à partir du trajet, du produit, de
                      la quantité et du prix unitaire.
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full h-11 border-none rounded-lg bg-emerald-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? (
                      <>
                        <ArrowsClockwiseIcon size={18} className="animate-spin" />{" "}
                        Génération en cours…
                      </>
                    ) : (
                      <>
                        <MagicWandIcon size={18} weight="fill" /> Générer avec l&apos;IA
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Preview panel ────────────────────────────────────────────── */}
        <div
          className={`flex-1 flex-col bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden relative ${
            createPhase === "chat" ||
            (createPhase === "form" && showMobilePanel === "form")
              ? "hidden lg:flex"
              : "flex"
          }`}
        >
          {/* Preview header */}
          <div className="flex items-center gap-2.5 px-4 sm:px-5 h-12 bg-gray-50 border-b border-gray-200">
            <span className="flex-1 text-sm font-semibold text-gray-600">
              Prévisualisation
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFullscreen((v) => !v)}
                className="h-[34px] px-3 border border-gray-200 rounded-md bg-white text-gray-700 text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
              >
                {fullscreen ? (
                  <ArrowsInIcon size={12} />
                ) : (
                  <ArrowsOutIcon size={12} />
                )}
                <span className="hidden sm:inline">
                  {fullscreen ? "Réduire" : "Plein écran"}
                </span>
              </button>
              <button
                onClick={() => savedOffer && onSend?.(savedOffer)}
                className="h-[34px] px-3.5 bg-emerald-800 text-white text-[11px] font-semibold rounded-md inline-flex items-center gap-1.5 shadow-sm hover:bg-emerald-900 transition-colors"
              >
                <PaperPlaneTiltIcon size={12} weight="fill" />
                <span className="hidden sm:inline">Envoyer</span>
              </button>
            </div>
          </div>

          {/* Loading overlay */}
          {generating && (
            <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center animate-spin shadow-lg text-lg">
                ✦
              </div>
              <div className="text-sm font-semibold text-amber-700">
                Agent Offres génère votre proposition…
              </div>
              <div className="text-xs text-gray-400">IA · Estimation : 8s</div>
              <div className="w-60">
                {[80, 60, 90, 50].map((w, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded mb-2 h-2.5 bg-gray-200"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Document */}
          <div className="overflow-y-auto p-4 sm:p-6 max-h-[calc(100vh-220px)]">
            {createPhase === "chat" && !generationSuccess ? (
              <div className="flex flex-col items-center justify-center gap-3.5 py-15 px-8 opacity-70">
                <div className="w-13 h-13 rounded-xl bg-amber-50 flex items-center justify-center text-2xl text-amber-700">
                  ✦
                </div>
                <div className="text-sm font-semibold text-amber-700 text-center">
                  En attente de l&apos;agent IA…
                </div>
                <div className="text-xs text-gray-400 text-center max-w-65 leading-relaxed">
                  L&apos;aperçu de votre offre apparaîtra ici dès que
                  l&apos;agent aura collecté toutes les informations.
                </div>
              </div>
            ) : generationSuccess ? (
              <div className="flex flex-col items-center justify-center gap-3.5 py-15 px-8">
                <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-3xl">
                  ✓
                </div>
                <div className="text-sm font-semibold text-emerald-800">
                  Document généré avec succès !
                </div>
                <div className="text-xs text-gray-400">
                  Pré-remplissage du formulaire…
                </div>
              </div>
            ) : (
              <OfferDocPreview
                client={client}
                companyName={companyName}
                origine={origine}
                destination={destination}
                produit={produit}
                quantite={quantite}
                unite={unite}
                mode={mode}
                vehicule={vehicule}
                ht={ht}
                tva={tva}
                ttc={ttc}
                pu={pu}
                tvaRate={tvaRate}
                dateDepart={departFmt}
                validite={validiteJours}
                generated={generated}
                sections={sections}
                footer={footer}
                pricingRows={pricingRows}
                offerRef={offerRef}
              />
            )}
          </div>

          {/* Preview footer */}
          <div className="flex items-center gap-2 px-4 sm:px-5 h-11 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-1.5 flex-1 text-[11px] text-gray-400">
              <WarningCircleIcon
                size={14}
                weight="fill"
                className="text-amber-500"
              />
              Généré par IA – réviser avant envoi au client
            </div>
            <button
              disabled={createPhase === "chat" && !generationSuccess}
              onClick={() =>
                printOffer({
                  client,
                  companyName,
                  origine,
                  destination,
                  produit,
                  quantite,
                  unite,
                  mode,
                  vehicule,
                  ht,
                  tva,
                  ttc,
                  pu,
                  tvaRate,
                  dateDepart: departFmt,
                  validite: validiteJours,
                  generated,
                  sections,
                  footer,
                  offerRef,
                  pricingRows,
                })
              }
              className={`h-[34px] px-3 border border-gray-200 rounded-md bg-white text-gray-700 
                  text-[11px] font-medium inline-flex items-center gap-1.5 hover:bg-gray-50 transition-colors
                  ${createPhase === "chat" && !generationSuccess ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <PrinterIcon size={12} />{" "}
              <span className="hidden sm:inline">Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Offres récentes responsive ───────────────────────────────────── */}
      {recentOffers.length > 0 && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm sm:text-[15px] font-bold text-gray-900">
              Offres récentes
            </div>
            <button
              onClick={onBack}
              className="h-7.5 px-3 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs inline-flex items-center hover:bg-gray-50 transition-colors"
            >
              Voir toutes →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentOffers.slice(0, 4).map((offer, i) => {
              const status = computeOfferStatus(offer);
              const stat = STAT_COLORS[status] ?? STAT_COLORS.brouillon;
              const accent = ACCENT_COLORS[i % 4];
              return (
                <div
                  key={offer.id}
                  onClick={() => onViewRecent?.(offer)}
                  className="relative bg-white border border-gray-200 rounded-xl p-3.5 sm:p-3.5 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{ background: accent }}
                  />
                  <div className="font-mono text-[11px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mb-1.5">
                    {offer.name}
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mb-0.5 truncate">
                    {offer.client_name}
                  </div>
                  <div className="text-[11px] text-gray-500 mb-2.5 truncate">
                    {offer.route?.origin?.split(",")[0]} →{" "}
                    {offer.route?.destination?.split(",")[0]}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-900">
                      {fmtOfferAmount(offer.amount_ttc, offer.currency)}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: stat.bg, color: stat.color }}
                    >
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
