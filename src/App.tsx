import { type FormEvent, useMemo, useState } from 'react'
import './App.css'
import './dashboard.css'
import { apiRoutes, fetchAuditEvent, queryBusiness } from './api/client'
import { AlertsPanel } from './components/AlertsPanel'
import { ApprovalControls } from './components/ApprovalControls'
import { InventoryPanel } from './components/InventoryPanel'
import { SalesPanel } from './components/SalesPanel'
import { HivePanel } from './components/HivePanel'
import { type LoadState, useSalesInventory, valueWhenReady } from './hooks/useSalesInventory'
import type {
  AgentResponse,
  AuditEvent,
  Evidence,
  QueryResponse,
  RecommendedAction,
  RiskLevel,
} from './types/contracts'
import { formatEvidenceValue, humaniseKey } from './utils/evidence'
import { formatPct, plural } from './utils/format'
import { DEFAULT_LANGUAGE, LANGUAGES, hasLocalisedSummaries, languageLabel } from './utils/languages'

interface EvidenceItem {
  label: string
  value: string
}

interface Recommendation {
  title: string
  risk: RiskLevel
  detail: string
}

interface AuditRecord {
  workflowId: string
  state: LoadState<AuditEvent>
}

const auditTime = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' })

function auditLines(event: AuditEvent): string[] {
  const agents = event.agents.map((agent) => `${agent} (${event.statuses[agent] ?? 'unknown'})`).join(', ')
  return [
    `${auditTime.format(new Date(event.created_at))} · workflow ${event.workflow_id} started by ${event.user}`,
    ...(event.question ? [`Question: “${event.question}”`] : []),
    `Agents: ${agents}`,
    `${plural(event.evidence_count, 'evidence item')} recorded`,
    `Guard decision: ${humaniseKey(event.decision)}`,
    ...event.actions.map(
      (action) => `${humaniseKey(action.agent)} Bee proposed: ${humaniseKey(action.type)} (${action.risk_level})`,
    ),
  ]
}

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE)
  const [question, setQuestion] = useState('Why did customer complaints increase?')
  const [lastSubmitted, setLastSubmitted] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null)
  const [auditRecord, setAuditRecord] = useState<AuditRecord | null>(null)
  const { sales, inventory, finance, health, alerts, reload } = useSalesInventory(selectedLanguage)

  const dashboardMetrics = [
    { label: 'Business Health', value: valueWhenReady(health, (data) => `${data.score}/100`) },
    { label: 'Sales Trend (WoW)', value: valueWhenReady(sales, (view) => formatPct(view.revenueChangePct)) },
    {
      label: 'Overdue Invoices',
      value: valueWhenReady(finance, (view) =>
        view.overdueInvoiceCount === null ? '—' : String(view.overdueInvoiceCount),
      ),
    },
    { label: 'Out of Stock', value: valueWhenReady(inventory, (view) => String(view.riskCounts.out_of_stock)) },
  ]

  const languageHint = useMemo(() => {
    const label = languageLabel(selectedLanguage)
    const fallback = hasLocalisedSummaries(selectedLanguage)
      ? ''
      : ` ${label} summaries aren't available yet, so answers are shown in English.`
    return `Critical values such as SGD, invoice IDs and quantities stay structured regardless of language (${label}).${fallback}`
  }, [selectedLanguage])

  function loadAuditRecord(workflowId: string) {
    const settle = (state: LoadState<AuditEvent>) =>
      setAuditRecord((current) => (current?.workflowId === workflowId ? { workflowId, state } : current))

    setAuditRecord({ workflowId, state: { status: 'loading' } })
    fetchAuditEvent(workflowId)
      .then((data) => settle({ status: 'ready', data }))
      .catch((err: unknown) =>
        settle({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load the audit record' }),
      )
  }

  async function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setQueryResult(null)
    setAuditRecord(null)
    setLastSubmitted(question.trim())

    try {
      const response = await queryBusiness({
        question: question.trim(),
        language: selectedLanguage,
      })
      setQueryResult(response)
      loadAuditRecord(response.workflow_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query business API')
    } finally {
      setLoading(false)
    }
  }

  const evidenceList = useMemo<EvidenceItem[]>(() => {
    if (!queryResult) return []
    const items: EvidenceItem[] = []

    // Collect evidence from specialists
    queryResult.specialist_results.forEach((spec: AgentResponse) => {
      spec.evidence.forEach((ev: Evidence) => {
        items.push({
          label: `${spec.agent.toUpperCase()} · ${humaniseKey(ev.metric)}`,
          value: formatEvidenceValue(ev),
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
        const approval = act.risk_level === 'GREEN' ? '' : act.risk_level === 'RED' ? ' Blocked; cannot be approved or executed.' : ' Human approval required before anything is sent.'
        recs.push({
          title: `${res.agent.toUpperCase()}: ${humaniseKey(act.type)}`,
          risk: act.risk_level,
          detail: `${act.reason ?? `Risk level evaluated as ${act.risk_level}.`}${approval} Confidence ${Math.round(res.confidence * 100)}%.`,
        })
      })
    })

    return recs
  }, [queryResult])

  const currentAudit = queryResult && auditRecord?.workflowId === queryResult.workflow_id ? auditRecord.state : null

  const auditTimeline = useMemo<string[]>(() => {
    if (!queryResult) return []
    if (currentAudit?.status === 'ready') return auditLines(currentAudit.data)
    return [
      `Query response received for workflow ${queryResult.workflow_id}; audit confirmation pending`,
      `Queen Bee routed to agents: ${queryResult.invoked_agents.join(', ')}`,
      `Guard decision evaluated as: ${queryResult.guard_decision}`,
      queryResult.guard_decision === 'blocked' ? 'Blocked actions cannot be approved' : queryResult.approval_required ? 'Approval required for AMBER actions' : 'No approval required; no business action executed',
    ]
  }, [queryResult, currentAudit])

  return (
    <div className="dashboard-shell">
    <aside className="dashboard-sidebar">
      <a href="#overview" className="dashboard-brand"><span aria-hidden="true">🐝</span> BizzyBee <small>AI BUSINESS DESK</small></a>
      <nav aria-label="Dashboard sections">
        <a href="#overview">Overview</a><a href="#analytics">Business monitoring</a><a href="#ask">Ask Bizzy</a><a href="#hive">Agent hive</a><a href="#governance">Governance</a><a href="#audit">Current workflow</a>
      </nav>
      <p className="hint">Synthetic data<br />Reporting date: 2026-09-23</p>
    </aside>
    <main className="app-shell dashboard-main" id="overview">
      <header className="hero">
        <div><p className="eyebrow">WORKSPACE / OVERVIEW</p>
        <h1>Your business, in the clear.</h1>
        <p className="subline">Evidence first. Decisions under your control.</p></div>
        <button type="button" className="secondary" onClick={reload}>Refresh monitoring</button>
      </header>
      <section className="welcome-band" aria-label="Welcome">
        <div><p className="eyebrow">YOUR EIGHT-BEE TEAM</p><h2>Small signals.<br /><span>Smarter moves.</span></h2><p>Explore sales, finance, inventory and customer evidence in one workspace.</p><a href="#ask">Ask your hive →</a></div>
        <div className="honeycomb-art" aria-hidden="true">⬡<span>🐝</span>⬡</div>
      </section>

      <section className="panel metrics" aria-label="Business health overview">
        {dashboardMetrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
          </article>
        ))}
      </section>

      <AlertsPanel state={alerts} onRetry={reload} />

      <section className="panel two-col" id="analytics" aria-label="Sales and inventory monitoring">
        <SalesPanel state={sales} onRetry={reload} />
        <InventoryPanel state={inventory} onRetry={reload} />
      </section>

      <section className="panel" id="ask">
        <p className="eyebrow">QUESTION → EVIDENCE → RECOMMENDATION</p>
        <h2>Ask BizzyBee</h2>
        <form className="query-form" onSubmit={submitQuery}>
          <label>
            Preferred language
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Business question
            <textarea
              rows={3}
              maxLength={4000}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing Data...' : 'Run Query'}
          </button>
        </form>
        <div className="quick-questions" aria-label="Example questions">{['Why did sales fall this week?', 'Why did customer complaints increase?', 'Recommend inventory reorders.'].map((example) => <button type="button" className="secondary" key={example} disabled={loading} onClick={() => setQuestion(example)}>{example}</button>)}</div>
        <p className="hint">{languageHint}</p>
        <p className="contract-note">Main query endpoint: {apiRoutes.query}</p>
        {lastSubmitted ? (
          <p className="submitted">Submitted: “{lastSubmitted}”</p>
        ) : null}
        {error && <p className="error" role="alert">Error: {error}</p>}
      </section>
      <HivePanel result={queryResult} loading={loading} error={error} audit={currentAudit?.status === 'ready' ? currentAudit.data : null} auditStatus={currentAudit?.status} />

      <section className="panel">

        <article>
          <h2>Evidence</h2>
          {evidenceList.length === 0 ? (
            <p>Run a query to inspect deterministic evidence from the versioned synthetic dataset.</p>
          ) : (
            <ul className="list evidence-list" aria-label="Query evidence">
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

        <article id="audit">
          <h2>Current workflow audit</h2>
          <p className="hint">Only the current workflow is shown. Full audit-history browsing is not available in this release.</p>
          {auditTimeline.length === 0 ? (
            <p style={{ padding: '1rem', color: '#666' }}>Workflow events will appear here after query execution.</p>
          ) : (
            <ul className="timeline">
              {auditTimeline.map((event, idx) => (
                <li key={idx}>{event}</li>
              ))}
            </ul>
          )}
          {currentAudit?.status === 'error' ? (
            <div role="alert"><p>The stored audit record couldn't be loaded; this is only the query response summary.</p><button type="button" onClick={() => queryResult && loadAuditRecord(queryResult.workflow_id)}>Retry audit</button></div>
          ) : null}
        </article>
      </section>

      <section className="panel approval-actions" id="governance">
        <h2>Approval Gate</h2>
        <p>AMBER actions require authorised human approval before commitment.</p>
        {!queryResult ? (
          <p>Run a query to evaluate whether a proposed action requires approval.</p>
        ) : queryResult.guard_decision === 'blocked' ? <p>Blocked by policy. These actions cannot be approved or executed.</p> : queryResult.approval_required ? (
          <p>
            The Guard has paused this recommendation for authorised human review. This build records the draft only;
            no business action has been committed.
          </p>
        ) : (
          <p>The Guard found no approval requirement. No external business action was submitted.</p>
        )}
        {currentAudit?.status === 'ready' && <ApprovalControls key={currentAudit.data.workflow_id} event={currentAudit.data} reload={() => loadAuditRecord(currentAudit.data.workflow_id)} />}
      </section>
      <footer className="hint">Synthetic business data · Authenticated access · Approval records decisions only; no payments, messages or purchases are executed.</footer>
    </main>
    </div>
  )
}
