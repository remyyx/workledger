import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        This page doesn’t exist or the app cache may be out of date.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn-primary px-4 py-2 text-sm">
          Home
        </Link>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
