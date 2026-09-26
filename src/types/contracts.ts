export type RiskLevel = 'GREEN' | 'AMBER' | 'RED'

export interface EvidenceItem {
  metric: string
  value: number | string
}

export interface RecommendedAction {
  type: string
  risk_level: RiskLevel
}

export interface AgentResponse {
  agent: string
  status: 'success' | 'failure'
  summary: string
  evidence: EvidenceItem[]
  confidence: number
  recommended_actions: RecommendedAction[]
}

export interface QueryRequest {
  query: string
  language: string
}

export interface QueryResponse {
  workflow_id: string
  business_health_score: number
  agent_results: AgentResponse[]
}

export interface BusinessHealthResponse {
  score: number
  priority_issues: string[]
}
