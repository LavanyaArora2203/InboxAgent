export default function Spinner({ size = 'sm' }) {
  return <span className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'} aria-hidden="true" />
}
