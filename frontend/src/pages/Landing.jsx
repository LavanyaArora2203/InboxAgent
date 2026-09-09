import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

const PIPELINE_STAGES = [
  { label: 'Fetch', detail: 'Pull unread email via the Gmail API' },
  { label: 'Guardrails', detail: 'Input validation + prompt-injection screening' },
  { label: 'Understand', detail: 'LLM extracts structured email info' },
  { label: 'Classify', detail: 'Category assigned (Work, Finance, Spam…)' },
  { label: 'Prioritize', detail: 'Urgent / High / Medium / Low' },
  { label: 'Recall memory', detail: 'Pulls relevant long-term memory for context' },
  { label: 'Plan actions', detail: 'LLM proposes reply / archive / flag / etc.' },
  { label: 'Human approval', detail: 'Risky actions pause for your sign-off' },
  { label: 'Execute', detail: 'Approved actions run against real tools' },
  { label: 'Audit + remember', detail: 'Logged for audit; safe facts stored to memory' },
]

const FEATURES = [
  {
    icon: '🧠',
    title: 'Multi-agent pipeline',
    body: 'Five specialized LLM agents — understanding, classification, priority, planning, and execution — orchestrated as a LangGraph state machine.',
  },
  {
    icon: '🛡️',
    title: '9 guardrails',
    body: 'Input validation, prompt-injection detection, confidence thresholds, PII scrubbing, tool-permission checks, and full audit logging.',
  },
  {
    icon: '🙋',
    title: 'Human-in-the-loop',
    body: 'The graph checkpoints and pauses before any risky action (reply, forward, delete), waiting for your explicit approval before resuming.',
  },
  {
    icon: '💾',
    title: 'Memory system',
    body: 'Short-term and long-term memory, with a dedicated guard deciding what is safe to remember across runs.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  function handleCta() {
    navigate(isAuthenticated ? '/dashboard' : '/login')
  }

  return (
    <div className="landing">
      <section className="section hero-section">
        <div className="container stack gap-lg text-center hero-content">
          <Badge tone="brand">Multi-agent · LangGraph · FastAPI · React</Badge>
          <h1>An AI agent that triages your inbox — with you in the loop</h1>
          <p className="text-muted hero-sub">
            Inbox Agent reads unread email, understands and prioritizes it, drafts a plan of
            action, and executes it — pausing for your approval before anything risky (reply,
            forward, delete) actually happens.
          </p>
          <div className="row gap-sm hero-actions">
            <Button size="lg" onClick={handleCta}>
              {isAuthenticated ? 'Go to dashboard' : 'Try the live demo'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
              How it works ↓
            </Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title} hover className="feature-card">
                <span className="feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h4>{feature.title}</h4>
                <p className="text-sm text-muted">{feature.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section pipeline-section">
        <div className="container stack gap-md">
          <div className="stack gap-xs text-center">
            <h2>The pipeline, end to end</h2>
            <p className="text-muted">
              Every run walks through this exact sequence — real nodes in a compiled LangGraph
              state machine, not a simplified diagram.
            </p>
          </div>

          <ol className="pipeline-list">
            {PIPELINE_STAGES.map((stage, index) => (
              <li key={stage.label} className="pipeline-step">
                <span className="pipeline-index">{index + 1}</span>
                <div>
                  <h4>{stage.label}</h4>
                  <p className="text-sm text-muted">{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Card className="cta-card text-center stack gap-md">
            <h2>See it triage a real inbox</h2>
            <p className="text-muted">
              Kick off a run, watch it classify and prioritize incoming email, then approve or
              reject the actions it proposes.
            </p>
            <div>
              <Button size="lg" onClick={handleCta}>
                {isAuthenticated ? 'Go to dashboard' : 'Enter the demo'}
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
