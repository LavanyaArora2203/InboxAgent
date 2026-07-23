function EmailCard({ subject, sender, category, priority, actions, children }) {
  return (
    <div className="card">
      <div className="card-title">{subject}</div>
      <div className="card-meta">From: {sender}</div>
      <div className="card-meta">Category: {category} | Priority: {priority}</div>
      {actions && actions.length > 0 && (
        <div className="card-actions">Actions: {actions.join(', ')}</div>
      )}
      {children}
    </div>
  )
}

export default EmailCard