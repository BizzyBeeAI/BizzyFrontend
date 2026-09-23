import type { BusinessHealthResponse, QueryRequest, QueryResponse } from '../types/contracts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const apiRoutes = {
  query: `${API_BASE_URL}/query`,
  businessHealth: `${API_BASE_URL}/business-health`,
  salesSummary: `${API_BASE_URL}/sales/summary`,
  customerOpportunities: `${API_BASE_URL}/customers/opportunities`,
  financeHealth: `${API_BASE_URL}/finance/health`,
  inventoryStatus: `${API_BASE_URL}/inventory/status`,
  approveAction: (id: string) => `${API_BASE_URL}/actions/${id}/approve`,
  rejectAction: (id: string) => `${API_BASE_URL}/actions/${id}/reject`,
  auditTrail: (workflowId: string) => `${API_BASE_URL}/audit/${workflowId}`,
}

export async function queryBusiness(payload: QueryRequest): Promise<QueryResponse> {
  const response = await fetch(apiRoutes.query, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Unable to submit business query.')
  }

  return response.json()
}

export async function fetchBusinessHealth(): Promise<BusinessHealthResponse> {
  const response = await fetch(apiRoutes.businessHealth)

  if (!response.ok) {
    throw new Error('Unable to fetch business health summary.')
  }

  return response.json()
}
