import type {
  AgentResponse,
  AuditAction,
  AuditEvent,
  AuditRecord,
  GuardActionExplanation,
  PersistedAuditAction,
} from '../types/contracts'

export type StoredAuditEvent = AuditEvent & { results?: AgentResponse[] }

const POLICY_REASONS: Record<string, string> = {
  allowed: 'Read-only analysis allowed by Guard policy.',
  approval_required: 'Requires authorised human approval before any commitment.',
  blocked: 'Blocked by Guard policy.',
}

function explain(action: AuditAction): GuardActionExplanation {
  const policy = action.policy ?? (action.risk_level === 'GREEN' ? 'allowed' : action.risk_level === 'AMBER' ? 'approval_required' : 'blocked')
  const classification = policy === 'blocked'
    ? (action.risk_level === 'RED' ? 'RED' : 'DENY')
    : policy === 'approval_required' ? 'AMBER' : 'GREEN'
  return { action: action.type, classification, reason: action.reason ?? POLICY_REASONS[policy] ?? policy }
}

function toPersistedAction(action: AuditAction): PersistedAuditAction {
  return { type: action.type, risk_level: action.risk_level, evidence_references: [], status: action.state ?? 'proposed', executed: false }
}

// GET /audit/{workflow_id} returns the stored workflow event; the trace views read AuditRecord fields.
export function toAuditRecord(payload: AuditRecord | StoredAuditEvent): AuditRecord {
  if ('trace_id' in payload && 'guard' in payload) return payload
  const event = payload as StoredAuditEvent
  const results = event.results ?? []
  const actions = event.actions ?? []
  const agents = event.agents ?? []
  const approvalRequired = event.decision !== 'allowed'
  return {
    trace_id: event.workflow_id,
    workflow_id: event.workflow_id,
    timestamp: event.created_at,
    status: 'completed',
    query: event.question ?? '',
    invoked_agents: agents.filter((agent) => agent !== 'advisor'),
    agents,
    specialist_results: results.filter((result) => result.agent !== 'advisor'),
    advisor_result: results.find((result) => result.agent === 'advisor') ?? null,
    decision: event.decision,
    guard: { decision: event.decision, approval_required: approvalRequired, action_explanations: actions.map(explain) },
    approval_required: approvalRequired,
    proposed_actions: actions.map(toPersistedAction),
    executed_actions: [],
    evidence_count: event.evidence_count ?? 0,
    failure_type: null,
  }
}
