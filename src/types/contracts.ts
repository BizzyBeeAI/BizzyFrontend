export type RiskLevel = 'GREEN' | 'AMBER' | 'RED'

export type AgentStatus = 'success' | 'partial' | 'failed'

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type JsonRecord = { [key: string]: JsonValue }

export interface Evidence {
  metric: string
  value: JsonValue
  unit?: string | null
  period?: string | null
  source?: string | null
  dimensions?: Record<string, string>
}

export interface RecommendedAction {
  type: string
  risk_level: RiskLevel
  reason?: string | null
  parameters?: JsonRecord
  expected_impact?: JsonRecord
}

export interface AgentResponse {
  agent: string
  status: AgentStatus
  summary: string
  evidence: Evidence[]
  confidence: number
  recommended_actions: RecommendedAction[]
}

export interface QueryRequest {
  question: string
  language?: string
  user?: string
}

export type GuardDecision = 'allowed' | 'approval_required' | 'blocked'

export interface QueryResponse {
  workflow_id: string
  invoked_agents: string[]
  specialist_results: AgentResponse[]
  advisor_result: AgentResponse
  guard_decision: GuardDecision | (string & {})
  approval_required: boolean
}

export interface BusinessHealthResponse {
  score: number
  status?: string
  as_of?: string
  priority_issues: string[]
}

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface BusinessAlert {
  alert_id: string
  alert_type: string
  severity: AlertSeverity
  agent: string
  title: string
  message: string
  as_of: string
  product_id?: string | null
  metric?: string | null
  current_value?: JsonValue
  threshold?: JsonValue
  recommended_action?: RecommendedAction | null
}

export interface AuditAction {
  action_id?: string
  state?: 'pending' | 'approved' | 'rejected' | 'blocked' | 'read_only'
  agent: string
  type: string
  risk_level: RiskLevel
  parameters?: JsonRecord
}

export interface AuditEvent {
  workflow_id: string
  user: string
  question?: string | null
  created_at: string
  agents: string[]
  statuses: Record<string, AgentStatus>
  decision: GuardDecision | (string & {})
  evidence_count: number
  actions: AuditAction[]
}
