import { FormEvent, useMemo, useState } from 'react'
import './App.css'
import { apiRoutes } from './api/client'

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

const dashboardMetrics = [
  { label: 'Business Health', value: '78/100' },
  { label: 'Sales Trend (WoW)', value: '-18%' },
  { label: 'Overdue Invoices', value: '6' },
  { label: 'Stock Risk Items', value: '3' },
]

const hiveAgents: HiveAgent[] = [
  { name: 'Queen Bee', state: 'Active', note: 'Routing business query' },
  { name: 'Sales Bee', state: 'Active', note: 'Checking category decline' },
  { name: 'Inventory Bee', state: 'Active', note: 'Evaluating stock-out risk' },
  { name: 'Finance Bee', state: 'Idle', note: 'Ready for cash-flow checks' },
  { name: 'Customer Bee', state: 'Active', note: 'Reviewing missed opportunities' },
  { name: 'Advisor Bee', state: 'Idle', note: 'Awaiting specialist evidence' },
  { name: 'Guard Bee', state: 'Idle', note: 'Policy checks pending recommendation' },
  { name: 'Audit Bee', state: 'Idle', note: 'Recording workflow events' },
]

const evidence: EvidenceItem[] = [
  { label: 'Product A stock', value: '14 units (3-day runout risk)' },
  { label: 'Sales decline', value: '-18% week-over-week' },
  { label: 'Unconverted leads', value: '12 high-intent enquiries' },
  { label: 'Overdue invoices', value: 'SGD 48,000 across 6 invoices' },
]

const recommendations: Recommendation[] = [
  {
    title: 'Prepare purchase order draft for Product A',
    risk: 'AMBER',
    detail: 'Draft only. Human approval required before supplier commitment.',
  },
  {
    title: 'Send follow-up responses to top 5 warm leads',
    risk: 'AMBER',
    detail: 'Generate multilingual drafts for owner review.',
  },
  {
    title: 'Review overdue invoices with finance team',
    risk: 'GREEN',
    detail: 'No external transaction is executed automatically.',
  },
]

const auditTimeline = [
  'Workflow bb-workflow-2026-09-23 started by owner@bizzybee',
  'Queen Bee routed to Sales, Customer, Inventory and Finance Bees',
  'Advisor Bee produced ranked recommendations with confidence 0.91',
  'Guard Bee marked reorder action as AMBER (approval required)',
]

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState(supportedLanguages[0])
  const [question, setQuestion] = useState('Why did sales fall this week?')
  const [lastSubmitted, setLastSubmitted] = useState('')

  const languageHint = useMemo(
    () =>
      `Critical values such as SGD, invoice IDs and quantities stay structured regardless of language (${selectedLanguage}).`,
    [selectedLanguage],
  )

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLastSubmitted(question.trim())
  }

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
          <button type="submit">Run Query</button>
        </form>
        <p className="hint">{languageHint}</p>
        <p className="contract-note">Main query endpoint: {apiRoutes.query}</p>
        {lastSubmitted ? (
          <p className="submitted">Submitted: “{lastSubmitted}”</p>
        ) : null}
      </section>

      <section className="panel two-col">
        <article>
          <h2>Hive Activity</h2>
          <ul className="list">
            {hiveAgents.map((agent) => (
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
          <ul className="list">
            {evidence.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel two-col">
        <article>
          <h2>Recommendations</h2>
          <ul className="list">
            {recommendations.map((item) => (
              <li key={item.title}>
                <span className={`badge ${item.risk.toLowerCase()}`}>{item.risk}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h2>Audit Timeline</h2>
          <ul className="timeline">
            {auditTimeline.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
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

export default App
