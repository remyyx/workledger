// ============================================
// Landing Page — StudioLedger (v1.0)
// Uses same design tokens as dashboard (var(--*))
// ============================================

import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm font-display"
            style={{ backgroundColor: 'var(--escrow)', color: 'var(--bg)' }}
          >
            S
          </div>
          <span className="font-semibold text-lg" style={{ color: 'var(--text)' }}>
            StudioLedger
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm transition-colors hover:opacity-90"
            style={{ color: 'var(--text-muted)' }}
          >
            Sign In
          </Link>
          <Link href="/login" className="btn-primary text-sm px-5 py-2">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border"
            style={{
              backgroundColor: 'var(--escrow-bg)',
              borderColor: 'var(--escrow)',
              color: 'var(--escrow-light)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--status-active)' }}
            />
            Built on XRPL
          </div>
          <h1
            className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
            style={{ color: 'var(--text)' }}
          >
            Bill, protect, and prove
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, var(--escrow-light), var(--accent-purple))`,
              }}
            >
              your work.
            </span>
          </h1>
          <p
            className="text-xl max-w-2xl mx-auto mb-10"
            style={{ color: 'var(--text-muted)' }}
          >
            StudioLedger is a creator wallet with escrow-protected invoicing,
            smart contracts, and Minted Craft Credentials. 0.98% fees. Instant payouts.
            Your reputation travels with you.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-lg px-8 py-3">
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section
        id="how-it-works"
        className="py-20 border-t"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <h2
            className="text-3xl font-bold text-center mb-4"
            style={{ color: 'var(--text)' }}
          >
            Everything Upwork does, without the 20% tax.
          </h2>
          <p
            className="text-center mb-16 max-w-xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            Decentralized escrow. On-chain proof. Your rules.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div
              className="card text-center transition-all duration-300 hover:shadow-lg"
              style={{ borderLeft: '3px solid var(--escrow)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl"
                style={{ backgroundColor: 'var(--escrow-bg)' }}
              >
                🔒
              </div>
              <h3
                className="text-xl font-semibold mb-3"
                style={{ color: 'var(--text)' }}
              >
                Escrow Protection
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Funds locked on-chain. Marketplace buyer can&apos;t ghost you.
                No middleman decides disputes.
              </p>
            </div>

            <div
              className="card text-center transition-all duration-300 hover:shadow-lg"
              style={{ borderLeft: '3px solid var(--accent-green)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl"
                style={{ backgroundColor: 'var(--accent-green-bg)' }}
              >
                💰
              </div>
              <h3
                className="text-xl font-semibold mb-3"
                style={{ color: 'var(--text)' }}
              >
                0.98% Fees
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Keep 99.02% of what you earn. Pay in 7+ currencies.
                Instant settlement. No waiting for &quot;processing.&quot;
              </p>
            </div>

            <div
              className="card text-center transition-all duration-300 hover:shadow-lg"
              style={{ borderLeft: '3px solid var(--accent-purple)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl"
                style={{ backgroundColor: 'var(--accent-purple-bg)' }}
              >
                🏆
              </div>
              <h3
                className="text-xl font-semibold mb-3"
                style={{ color: 'var(--text)' }}
              >
                Portable Reputation
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Every completed job mints a credential proving your work.
                Leave any platform — your track record follows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 text-center border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2
          className="text-3xl font-bold mb-4"
          style={{ color: 'var(--text)' }}
        >
          Ready to own your creative career?
        </h2>
        <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
          Join the beta. First 100 creators get free premium for life.
        </p>
        <Link href="/login" className="btn-primary text-lg px-8 py-3">
          Join the Beta
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <p>StudioLedger by StudioLedger Pty Ltd — Built on XRPL</p>
      </footer>
    </main>
  );
}
