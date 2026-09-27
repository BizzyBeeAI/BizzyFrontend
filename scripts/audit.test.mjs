import test from 'node:test'
import assert from 'node:assert/strict'
import { toAuditRecord } from '../src/utils/audit.ts'

const stored = {
  workflow_id: 'wf-1', user: 'owner', question: 'Why did sales fall this week?', created_at: '2026-09-27T15:00:00+00:00',
  agents: ['sales', 'inventory', 'advisor'], statuses: { sales: 'success', inventory: 'success', advisor: 'success' },
  decision: 'approval_required', evidence_count: 47, revision: 0, decisions: [],
  actions: [
    { action_id: 'wf-1:0', agent: 'sales', type: 'investigate_stock_availability', risk_level: 'GREEN', policy: 'allowed', state: 'read_only' },
    { action_id: 'wf-1:1', agent: 'inventory', type: 'verify_inbound_quantity', risk_level: 'AMBER', reason: 'Confirm the inbound quantity first.', policy: 'approval_required', state: 'pending' },
    { action_id: 'wf-1:2', agent: 'advisor', type: 'unknown_payment', risk_level: 'GREEN', policy: 'blocked', state: 'blocked' },
  ],
  results: [
    { agent: 'sales', status: 'success', summary: 'Revenue fell 18.0%.', evidence: [], confidence: 0.9, recommended_actions: [] },
    { agent: 'inventory', status: 'success', summary: 'PRD001 is out of stock.', evidence: [], confidence: 0.9, recommended_actions: [] },
    { agent: 'advisor', status: 'success', summary: 'Stockout explains the decline.', evidence: [], confidence: 0.8, recommended_actions: [] },
  ],
}

test('stored workflow event maps to the trace fields the dashboard reads', () => {
  const record = toAuditRecord(stored)
  assert.equal(record.trace_id, 'wf-1')
  assert.equal(record.query, 'Why did sales fall this week?')
  assert.equal(record.guard.decision, 'approval_required')
  assert.equal(record.approval_required, true)
  assert.deepEqual(record.invoked_agents, ['sales', 'inventory'])
  assert.deepEqual(record.specialist_results.map((result) => result.agent), ['sales', 'inventory'])
  assert.equal(record.advisor_result?.summary, 'Stockout explains the decline.')
  assert.deepEqual(record.proposed_actions.map((action) => action.status), ['read_only', 'pending', 'blocked'])
  assert.equal(record.executed_actions.length, 0)
})

test('guard explanations follow the stored policy, not the agent label', () => {
  const [read, approval, blocked] = toAuditRecord(stored).guard.action_explanations
  assert.equal(read.classification, 'GREEN')
  assert.equal(approval.classification, 'AMBER')
  assert.equal(approval.reason, 'Confirm the inbound quantity first.')
  assert.equal(blocked.classification, 'DENY')
})

test('an allowed workflow does not require approval', () => {
  assert.equal(toAuditRecord({ ...stored, decision: 'allowed' }).approval_required, false)
})

test('records already in trace format pass through unchanged', () => {
  const trace = toAuditRecord(stored)
  assert.equal(toAuditRecord(trace), trace)
})

test('missing optional fields produce empty lists instead of a crash', () => {
  const record = toAuditRecord({ workflow_id: 'wf-2', user: 'owner', created_at: '2026-09-27T15:00:00+00:00', decision: 'allowed', evidence_count: 0 })
  assert.deepEqual(record.specialist_results, [])
  assert.equal(record.advisor_result, null)
  assert.deepEqual(record.guard.action_explanations, [])
  assert.equal(record.query, '')
})
