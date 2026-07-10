/* ── Agent & Runs ──────────────────────────────────────────────────────── */

export type DafRunStatus     = 'running' | 'completed' | 'failed' | 'pending';
export type DafActionType    = 'send_reminder' | 'escalate' | 'flag_risk' | string;
export type DafActionPriority = 'low' | 'medium' | 'high' | 'critical';
export type DafActionStatus   = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface DafAgentStatus {
  scheduler_running: boolean;
  interval_hours:    number;
  next_run_at:       string | null;
  last_run_id:       string | null;
  last_run_status:   DafRunStatus | null;
  last_run_at:       string | null;
}

export interface DafRun {
  id:                     string;
  trigger:                string;
  status:                 DafRunStatus;
  started_at:             string;
  ended_at:               string | null;
  summary:                string | null;
  error:                  string | null;
  proposed_actions_count: number;
}

export interface DafRunDetail extends DafRun {
  events:           unknown[];
  snapshots:        unknown[];
  proposed_actions: DafProposedAction[];
}

/* ── Snapshots ─────────────────────────────────────────────────────────── */

export interface DafSnapshot {
  id:                       string;
  period_label:             string;
  total_receivables:        number;
  overdue_receivables:      number;
  overdue_receivables_count: number;
  total_payables:           number;
  overdue_payables:         number;
  overdue_payables_count:   number;
  dso_days:                 number;
  cash_position:            number;
  snapshot_at:              string;
}

/* ── Proposed Actions ──────────────────────────────────────────────────── */

export interface DafProposedAction {
  id:               string;
  run_id:           string;
  action_type:      DafActionType;
  title:            string;
  description:      string;
  reasoning:        string;
  target_data:      Record<string, unknown>;
  priority:         DafActionPriority;
  status:           DafActionStatus;
  proposed_at:      string;
  decided_at:       string | null;
  executed_at:      string | null;
  decided_by:       string | null;
  execution_result: Record<string, unknown> | null;
  execution_error:  string | null;
}

export interface DafDecideBody {
  comment?: string;
}
