import type { AuditEvent, BusinessHealthResponse, QueryRequest, QueryResponse } from '../types/contracts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiRoutes = {
  query: `${API_BASE_URL}/query`,
  businessHealth: `${API_BASE_URL}/business-health`,
  salesSummary: `${API_BASE_URL}/sales/summary`,
  customerOpportunities: `${API_BASE_URL}/customers/opportunities`,
  financeHealth: `${API_BASE_URL}/finance/health`,
  financeSummary: `${API_BASE_URL}/finance/summary`,
  inventoryStatus: `${API_BASE_URL}/inventory/status`,
  salesInventoryAlerts: `${API_BASE_URL}/sales-inventory/alerts`,
  approveAction: (id: string) => `${API_BASE_URL}/actions/${id}/approve`,
  rejectAction: (id: string) => `${API_BASE_URL}/actions/${id}/reject`,
  auditTrail: (workflowId: string) => `${API_BASE_URL}/audit/${workflowId}`,
}

export async function requestJson<T>(url: string, label: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (init?.signal?.aborted) throw error
    throw new Error(`Couldn't reach the BizzyBee backend for ${label}. Make sure it is running on port 8000.`)
  }

  if (!response.ok) {
    throw new Error(`The backend couldn't return ${label} (HTTP ${response.status}).`)
  }

  return response.json() as Promise<T>
}

export function queryBusiness(payload: QueryRequest): Promise<QueryResponse> {
  return requestJson<QueryResponse>(apiRoutes.query, 'an answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function fetchBusinessHealth(signal?: AbortSignal): Promise<BusinessHealthResponse> {
  return requestJson<BusinessHealthResponse>(apiRoutes.businessHealth, 'the business health summary', { signal })
}

export function fetchAuditEvent(workflowId: string): Promise<AuditEvent> {
  return requestJson<AuditEvent>(apiRoutes.auditTrail(encodeURIComponent(workflowId)), 'the audit record')
}
