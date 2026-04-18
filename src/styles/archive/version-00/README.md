# Design version 00 — Archive

Visual research phase. **Dashboard on dark mode was the satisfying reference.**

- **Token system**: Grayscale 95/90/5/10 rule, no pure black/white. Escrow orange, status colors, accent set.
- **Sidebar**: Dark-theme–oriented active state (white text, glow). Collapsible 240px/64px.
- **Typography**: DM Sans + JetBrains Mono only (no Outfit).
- **Landing**: Used separate classes (`bg-navy`, `bg-brand-500`, etc.) not wired to dashboard tokens.

**Preview (saved address):** [http://localhost:3000/version-00](http://localhost:3000/version-00) — static mock of the v00 dark dashboard. Link “Back to Dashboard (v1.0)” returns to the app.

**Full restore:** Copy `version-00-globals.css` to `src/app/globals.css` and apply `tailwind-extension-snapshot.ts` into `tailwind.config.ts` if needed.
