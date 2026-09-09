export default function Badge({ children, tone = 'neutral', dot = false, className = '' }) {
  const classes = ['badge', `badge-${tone}`, className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  )
}
