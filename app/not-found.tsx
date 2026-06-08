import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="set-card" style={{ maxWidth: 520, textAlign: 'center' }}>
        <h1 className="page-title" style={{ marginBottom: 12 }}>Page not found</h1>
        <p style={{ color: 'var(--fg-2)', marginBottom: 20 }}>
          The page you requested does not exist or has been removed.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
