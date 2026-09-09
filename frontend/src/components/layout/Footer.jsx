export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p className="text-sm text-muted">
          Inbox Agent — a multi-agent email automation pipeline (LangGraph + FastAPI + React).
        </p>
        <div className="footer-links text-sm">
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span className="text-muted">·</span>
          <span className="text-muted">Built as a portfolio demo</span>
        </div>
      </div>
    </footer>
  )
}
