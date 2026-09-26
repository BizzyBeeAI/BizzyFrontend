export type RiskLevel = 'GREEN' | 'AMBER' | 'RED'
export type AgentStatus = 'success' | 'partial' | 'failed'

export interface EvidenceItem {
  metric: string
  value: unknown
}

export interface RecommendedAction {
  type: string
  risk_level: RiskLevel
}

export interface AgentResponse {
  agent: string
  status: AgentStatus
  summary: string
  evidence: EvidenceItem[]
  confidence: number
  recommended_actions: RecommendedAction[]
}

export interface QueryRequest {
  question: string
  language: string
  user?: string
}

export interface QueryResponse {
  workflow_id: string
  invoked_agents: string[]
  specialist_results: AgentResponse[]
  advisor_result: AgentResponse
  guard_decision: string
  approval_required: boolean
}

export interface GuardActionExplanation {
  action: string
  classification: RiskLevel | 'DENY'
  reason: string
}

export interface AuditAction {
  type: string
  risk_level: RiskLevel
  evidence_references: string[]
  status: string
  executed: boolean
}

export interface AuditRecord {
  trace_id: string
  workflow_id: string
  timestamp: string
  status: string
  query: string
  invoked_agents: string[]
  agents: string[]
  specialist_results: AgentResponse[]
  advisor_result: AgentResponse | null
  decision: string
  guard: {
    decision: string
    approval_required: boolean
    action_explanations: GuardActionExplanation[]
  }
  approval_required: boolean
  proposed_actions: AuditAction[]
  executed_actions: AuditAction[]
  evidence_count: number
  failure_type: string | null
}

export interface AuditHistoryResponse {
  items: AuditRecord[]
  count: number
}

export interface BusinessHealthResponse {
  score: number
  priority_issues: string[]
}
