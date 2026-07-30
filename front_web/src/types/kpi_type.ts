// ── KPI types ─────────────────────────────────────────────────────────────────

export interface KpiChartSeries {
  type: string;
  xKey?: string | null;
  yKey?: string | null;
  yName?: string | null;
  angleKey?: string | null;
  calloutLabelKey?: string | null;
  extraFields?: Record<string, unknown>;
}

export interface KpiChart {
  data: Record<string, unknown>[];
  series: KpiChartSeries[];
}

export interface KpiItem {
  key: string;
  label: string;
  category: string;
  description: string;
  chart: KpiChart;
  unit: string;
  period: string;
}

export interface KpiCatalogResponse {
  items: KpiItem[];
  total: number;
}

export interface KpiDetailParams {
  key: string;
  date_from?: string;
  date_to?: string;
}
