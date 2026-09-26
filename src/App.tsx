import { type FormEvent, useMemo, useState } from 'react'
import './App.css'
import { apiRoutes, queryBusiness } from './api/client'
import { InventoryPanel } from './components/InventoryPanel'
import { SalesPanel } from './components/SalesPanel'
import { useSalesInventory, valueWhenReady } from './hooks/useSalesInventory'
import type { QueryResponse, AgentResponse, Evidence, RecommendedAction } from './types/contracts'
import { formatPct } from './utils/format'

type HiveState = 'Active' | 'Idle'
type RiskLevel = 'GREEN' | 'AMBER' | 'RED'

interface HiveAgent {
  name: string
  state: HiveState
  note: string
}

interface EvidenceItem {
  label: string
  value: string
}

interface Recommendation {
  title: string
  risk: RiskLevel
  detail: string
}

const supportedLanguages = ['English', 'Tamil', 'Mandarin', 'Bahasa Melayu', 'Hindi']

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState(supportedLanguages[0])
  const [question, setQuestion] = useState('Why did customer complaints increase?')
  const [lastSubmitted, setLastSubmitted] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null)
  const { sales, inventory, reload } = useSalesInventory()

  const dashboardMetrics = [
    { label: 'Business Health', value: '78/100' },
    { label: 'Sales Trend (WoW)', value: valueWhenReady(sales, (view) => formatPct(view.revenueChangePct)) },
    { label: 'Overdue Invoices', value: '6' },
    { label: 'Out of Stock', value: valueWhenReady(inventory, (view) => String(view.riskCounts.out_of_stock)) },
  ]

  const languageHint = useMemo(
    () =>
      `Critical values such as SGD, invoice IDs and quantities stay structured regardless of language (${selectedLanguage}).`,
    [selectedLanguage],
  )

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setLastSubmitted(question.trim())

    try {
      const response = await queryBusiness({
        question: question.trim(),
        language: selectedLanguage,
        user: 'owner@bizzybee',
      })
      setQueryResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query business API')
    } finally {
      setLoading(false)
    }
  }

  // Map Backend Response -> UI Displays
  const activeAgentsList = useMemo<HiveAgent[]>(() => {
    if (!queryResult) {
      return [
        { name: 'Queen Bee', state: 'Idle', note: 'Awaiting user query' },
        { name: 'Sales Bee', state: 'Idle', note: 'Ready' },
        { name: 'Customer Bee', state: 'Idle', note: 'Ready' },
        { name: 'Finance Bee', state: 'Idle', note: 'Ready' },
        { name: 'Inventory Bee', state: 'Idle', note: 'Ready' },
        { name: 'Advisor Bee', state: 'Idle', note: 'Awaiting specialist evidence' },
      ]
    }

    const invoked = queryResult.invoked_agents || []
    return [
      { name: 'Queen Bee', state: 'Active', note: `Routed to: ${invoked.join(', ')}` },
      { name: 'Sales Bee', state: invoked.includes('sales') ? 'Active' : 'Idle', note: invoked.includes('sales') ? 'Analyzing sales trends' : 'Not invoked' },
      { name: 'Customer Bee', state: invoked.includes('customer') ? 'Active' : 'Idle', note: invoked.includes('customer') ? 'Analyzing customer complaints & SLA' : 'Not invoked' },
      { name: 'Finance Bee', state: invoked.includes('finance') ? 'Active' : 'Idle', note: invoked.includes('finance') ? 'Checking invoices & cash flow' : 'Not invoked' },
      { name: 'Inventory Bee', state: invoked.includes('inventory') ? 'Active' : 'Idle', note: invoked.includes('inventory') ? 'Evaluating stock risk' : 'Not invoked' },
      { name: 'Advisor Bee', state: 'Active', note: queryResult.advisor_result ? queryResult.advisor_result.summary : 'Synthesizing evidence' },
    ]
  }, [queryResult])

  const evidenceList = useMemo<EvidenceItem[]>(() => {
    if (!queryResult) return []
    const items: EvidenceItem[] = []

    // Collect evidence from specialists
    queryResult.specialist_results.forEach((spec: AgentResponse) => {
      spec.evidence.forEach((ev: Evidence) => {
        items.push({
          label: `${spec.agent.toUpperCase()} - ${ev.metric}`,
          value: String(ev.value),
        })
      })
    })

    // Add advisor summary if available
    if (queryResult.advisor_result) {
      items.push({
        label: 'ADVISOR SUMMARY',
        value: queryResult.advisor_result.summary,
      })
    }

    return items
  }, [queryResult])

  const recommendationsList = useMemo<Recommendation[]>(() => {
    if (!queryResult) return []
    const recs: Recommendation[] = []

    const allResults = [...queryResult.specialist_results]
    if (queryResult.advisor_result) {
      allResults.push(queryResult.advisor_result)
    }

    allResults.forEach((res: AgentResponse) => {
      res.recommended_actions.forEach((act: RecommendedAction) => {
        recs.push({
          title: `${res.agent.toUpperCase()}: ${act.type.replace(/_/g, ' ')}`,
          risk: act.risk_level as RiskLevel,
          detail: `Confidence: ${res.confidence ?? 0.85}. Risk level evaluated as ${act.risk_level}.`,
        })
      })
    })

    return recs
  }, [queryResult])

  const auditTimeline = useMemo<string[]>(() => {
    if (!queryResult) return []
    return [
      `Workflow ${queryResult.workflow_id} executed`,
      `Queen Bee routed to agents: ${queryResult.invoked_agents.join(', ')}`,
      `Guard decision evaluated as: ${queryResult.guard_decision}`,
      queryResult.approval_required ? 'Approval required for AMBER/RED actions' : 'No approval needed (GREEN actions)',
    ]
  }, [queryResult])

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">BizzyBee AI</p>
        <h1>Your Business Speaks Your Language.</h1>
        <p className="subline">From scattered data to clear decisions.</p>
      </header>

      <section className="panel metrics" aria-label="Business health overview">
        {dashboardMetrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="panel two-col" aria-label="Sales and inventory monitoring">
        <SalesPanel state={sales} onRetry={reload} />
        <InventoryPanel state={inventory} onRetry={reload} />
      </section>

      <section className="panel">
        <h2>Ask BizzyBee</h2>
        <form className="query-form" onSubmit={submitQuery}>
          <label>
            Preferred language
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
            >
              {supportedLanguages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label>
            Business question
            <textarea
              rows={3}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing Data...' : 'Run Query'}
          </button>
        </form>
        <p className="hint">{languageHint}</p>
        <p className="contract-note">Main query endpoint: {apiRoutes.query}</p>
        {lastSubmitted ? (
          <p className="submitted">Submitted: “{lastSubmitted}”</p>
        ) : null}
        {error && <p className="error" style={{ color: 'red' }}>Error: {error}</p>}
      </section>

      <section className="panel two-col">
        <article>
          <h2>Hive Activity</h2>
          <ul className="list">
            {activeAgentsList.map((agent) => (
              <li key={agent.name}>
                <span className={`badge ${agent.state.toLowerCase()}`}>{agent.state}</span>
                <strong>{agent.name}</strong>
                <p>{agent.note}</p>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h2>Evidence</h2>
          {evidenceList.length === 0 ? (
            <p style={{ padding: '1rem', color: '#666' }}>Run a query to fetch real-time SQL evidence from dataset.</p>
          ) : (
            <ul className="list">
              {evidenceList.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.label}</strong>
                  <p>{item.value}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="panel two-col">
        <article>
          <h2>Recommendations</h2>
          {recommendationsList.length === 0 ? (
            <p style={{ padding: '1rem', color: '#666' }}>Run a query to generate AI recommendations.</p>
          ) : (
            <ul className="list">
              {recommendationsList.map((item, idx) => (
                <li key={idx}>
                  <span className={`badge ${item.risk.toLowerCase()}`}>{item.risk}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article>
          <h2>Audit Timeline</h2>
          {auditTimeline.length === 0 ? (
            <p style={{ padding: '1rem', color: '#666' }}>Workflow events will appear here after query execution.</p>
          ) : (
            <ul className="timeline">
              {auditTimeline.map((event, idx) => (
                <li key={idx}>{event}</li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="panel approval-actions">
        <h2>Approval Gate</h2>
        <p>AMBER actions require authorised human approval before commitment.</p>
        <div className="actions">
          <button type="button">Approve Draft Action</button>
          <button type="button" className="secondary">
            Reject Draft Action
          </button>
        </div>
      </section>
    </main>
  )
}