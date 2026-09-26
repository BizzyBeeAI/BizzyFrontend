
import type {
  AuditEvent,
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

  // Sales and Customer
  salesSummary: `${API_BASE_URL}/sales/summary`,
  customerOpportunities: `${API_BASE_URL}/customers/opportunities`,

  // Finance
  financeHealth: `${API_BASE_URL}/finance/health`,
  financeSummary: `${API_BASE_URL}/finance/summary`,

  // Inventory and Alerts
  inventoryStatus: `${API_BASE_URL}/inventory/status`,
  salesInventoryAlerts: `${API_BASE_URL}/sales-inventory/alerts`,

  // Action routes (not yet verified as operational)
  approveAction: (id: string) =>
    `${API_BASE_URL}/actions/${encodeURIComponent(id)}/approve`,

  rejectAction: (id: string) =>
    `${API_BASE_URL}/actions/${encodeURIComponent(id)}/reject`,

  // Audit
  auditTrail: (workflowId: string) =>
    `${API_BASE_URL}/audit/${encodeURIComponent(workflowId)}`,

  auditHistory: `${API_BASE_URL}/audit`,

  auditTrace: (traceId: string) =>
    `${API_BASE_URL}/audit/${encodeURIComponent(traceId)}`,
}

// Shared HTTP request helper
export async function requestJson<T>(
  url: string,
  label: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    if (init?.signal?.aborted) {
      throw error
    }

    throw new Error(
      `Couldn't reach the BizzyBee backend for ${label}. Make sure it is running on port 8000.`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `The backend couldn't return ${label} (HTTP ${response.status}).`,
    )
  }

  return response.json() as Promise<T>
}

// Submit a business question to Queen Bee
export function queryBusiness(
  payload: QueryRequest,
): Promise<QueryResponse> {
  return requestJson<QueryResponse>(
    apiRoutes.query,
    'an answer',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  )
}

// Retrieve business health
export function fetchBusinessHealth(
  signal?: AbortSignal,
): Promise<BusinessHealthResponse> {
  return requestJson<BusinessHealthResponse>(
    apiRoutes.businessHealth,
    'the business health summary',
    { signal },
  )
}

// Retrieve the existing workflow audit event
export function fetchAuditEvent(
  workflowId: string,
): Promise<AuditEvent> {
  return requestJson<AuditEvent>(
    apiRoutes.auditTrail(workflowId),
    'the audit record',
  )
}

// Retrieve persisted audit history
export function fetchAuditHistory(
  limit = 20,
): Promise<AuditHistoryResponse> {
  return requestJson<AuditHistoryResponse>(
    `${apiRoutes.auditHistory}?limit=${limit}`,
    'audit history',
  )
}

// Retrieve an individual persisted audit trace
export function fetchAuditTrace(
  traceId: string,
): Promise<AuditRecord> {
  return requestJson<AuditRecord>(
    apiRoutes.auditTrace(traceId),
    'the audit trace',
  )
}
