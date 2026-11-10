export default function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '72px 20px', textAlign: 'center', color: '#2B2B2B' }}>
      <p style={{ fontSize: 64, fontWeight: 800, color: '#D62828', margin: 0 }}>404</p>
      <h1 style={{ fontSize: 24, margin: '8px 0 12px' }}>We couldn't find that page</h1>
      <p style={{ margin: '0 0 24px', lineHeight: 1.5 }}>
        The link may be old or mistyped. Let's get you back to the pastries.
      </p>
      <a
        href="#/"
        style={{ display: 'inline-block', background: '#D62828', color: '#fff', padding: '12px 24px', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}
      >
        Back to home
      </a>
    </div>
  )
}