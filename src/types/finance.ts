import type { AgentStatus, RecommendedAction } from './contracts'

export interface FinanceView {
  status: AgentStatus
  summary: string
  confidence: number
  actions: RecommendedAction[]
  asOfDate: string | null
  overdueInvoiceCount: number | null
  overdueOutstanding: number | null
}
