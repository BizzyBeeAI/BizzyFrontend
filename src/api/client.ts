import type {
  AuditHistoryResponse,
  AuditRecord,
  BusinessHealthResponse,
  QueryRequest,
  QueryResponse,
} from '../types/contracts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiRoutes = {
  query: `${API_BASE_URL}/query`,
  businessHealth: `${API_BASE_URL}/business-health`,
  auditHistory: `${API_BASE_URL}/audit`,
  auditTrace: (traceId: string) => `${API_BASE_URL}/audit/${encodeURIComponent(traceId)}`,
}

async function readResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${fallbackMessage} (HTTP ${response.status})`)
  }

  return response.json() as Promise<T>
}

export async function queryBusiness(payload: QueryRequest): Promise<QueryResponse> {
  const response = await fetch(apiRoutes.query, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return readResponse<QueryResponse>(response, 'Unable to submit business query.')
}

export async function fetchBusinessHealth(): Promise<BusinessHealthResponse> {
  const response = await fetch(apiRoutes.businessHealth)

  return readResponse<BusinessHealthResponse>(response, 'Unable to fetch business health summary.')
}

export async function fetchAuditHistory(limit = 20): Promise<AuditHistoryResponse> {
  const response = await fetch(`${apiRoutes.auditHistory}?limit=${limit}`)
  return readResponse<AuditHistoryResponse>(response, 'Unable to fetch audit history.')
}

export async function fetchAuditTrace(traceId: string): Promise<AuditRecord> {
  const response = await fetch(apiRoutes.auditTrace(traceId))
  return readResponse<AuditRecord>(response, 'Unable to fetch audit trace.')
}
