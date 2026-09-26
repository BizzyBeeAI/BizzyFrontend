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
  priority_issues: string[]
}
