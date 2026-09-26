import type { AgentResponse } from '../types/contracts'
import type { FinanceView } from '../types/finance'
import { indexEvidence, numberMetric, stringMetric } from '../utils/evidence'
import { apiRoutes, requestJson } from './client'

export async function fetchFinanceView(signal?: AbortSignal): Promise<FinanceView> {
  const response = await requestJson<AgentResponse>(
    apiRoutes.financeSummary,
    'the finance summary',
    { signal },
  )
  const evidence = indexEvidence(response.evidence)

  return {
    status: response.status,
    summary: response.summary,
    confidence: response.confidence,
    actions: response.recommended_actions,
    asOfDate: stringMetric(evidence, 'as_of_date'),
    overdueInvoiceCount: numberMetric(evidence, 'overdue_invoice_count'),
    overdueOutstanding: numberMetric(evidence, 'overdue_outstanding_sgd'),
  }
}
