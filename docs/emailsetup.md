# Email Setup — studioledger.ai

> **Status**: Pending setup
> **DNS**: Cloudflare (DO NOT transfer — stays on Cloudflare always)
> **Provider**: Google Workspace Business Starter (~$10 AUD/month direct)

---

## Addresses to Create

| Address | Purpose | Who |
|---------|---------|-----|
| remy@studioledger.ai | Founder primary — all correspondence | Remy |
| hello@studioledger.ai | Public-facing, landing page, general enquiries | Alias → remy@ |
| legal@studioledger.ai | Lawyer correspondence, AUSTRAC, compliance | Alias → remy@ |
| support@studioledger.ai | User support (activate when live) | Alias → remy@ |
| no-reply@studioledger.ai | Transactional emails (contracts, escrow, MCCs) | System |
| admin@studioledger.ai | Platform administration (later) | Alias → remy@ |
| disputes@studioledger.ai | Dispute resolution inbox (later) | Alias → remy@ |

Start with: **remy@**, **hello@**, **legal@**. Add the rest when needed.

---

## Setup Steps (Google Workspace + Cloudflare DNS)

### 1. Sign up for Google Workspace
- Go to **workspace.google.com**
- Choose **Business Starter** (~$10 AUD/month)
- Enter **studioledger.ai** as your domain
- Create **remy@studioledger.ai** as the admin account

### 2. Verify domain ownership (manual TXT record)
- Google will give you a TXT verification string
- **DO NOT** let Google manage your DNS or transfer nameservers
- Choose the **manual verification** option
- Go to Cloudflare → studioledger.ai → DNS → Add record:
  - Type: **TXT**
  - Name: **@**
  - Content: (paste the verification string Google gives you)
  - TTL: Auto

### 3. Add Google MX records in Cloudflare
- Cloudflare → studioledger.ai → DNS → Add record (5 MX records):

| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | @ | aspmx.l.google.com | 1 |
| MX | @ | alt1.aspmx.l.google.com | 5 |
| MX | @ | alt2.aspmx.l.google.com | 5 |
| MX | @ | alt3.aspmx.l.google.com | 10 |
| MX | @ | alt4.aspmx.l.google.com | 10 |

### 4. Add SPF, DKIM, and DMARC records (anti-spoofing)

**SPF** (prevents others from sending as @studioledger.ai):
- Type: **TXT**
- Name: **@**
- Content: `v=spf1 include:_spf.google.com ~all`

**DKIM** (Google will provide this in admin.google.com → Apps → Google Workspace → Gmail → Authenticate email):
- Type: **TXT**
- Name: **google._domainkey**
- Content: (paste the DKIM key Google generates)

**DMARC** (reporting on failed auth):
- Type: **TXT**
- Name: **_dmarc**
- Content: `v=DMARC1; p=quarantine; rua=mailto:remy@studioledger.ai`

### 5. Set up aliases
- In **admin.google.com** → Directory → Users → remy@studioledger.ai → User information → Alternate email addresses
- Add: hello@, legal@, support@ as aliases
- All mail to those addresses lands in remy@studioledger.ai inbox

### 6. Set up "Send as" (optional, recommended)
- In Gmail → Settings → Accounts → Send mail as → Add another address
- Add hello@studioledger.ai, legal@studioledger.ai
- Choose which "From" address to use when replying

---

## Critical Rules

- **DNS stays on Cloudflare.** Never transfer nameservers to Google, Bluehost, or anyone else.
- **Manual verification only.** When Google asks to verify the domain, always choose "Add a TXT record" — never "Let Google do it for you."
- **MX records don't affect other DNS.** Adding Google MX records only routes email — your Vercel A/CNAME records and everything else are unaffected.
- **Aliases are free.** Google Workspace allows unlimited aliases within the plan — no extra cost per address.

---

## Cancelled / Avoided

- **Google Workspace Business Plus** — was active on studioledger.ai at $37/month. Cancelled 30 March 2026 (within trial, no charges). Was forcing DNS transfer to access billing.
- **Bluehost** — offered Workspace Standard at $7/month but required $37/month hosting bundle. Cancelled within 14 days.

---

## Later (When Team Grows)

- Each new team member gets their own Workspace licence (~$10/month)
- Convert aliases to shared inboxes (support@, disputes@) when volume justifies it
- Add Google Groups for team distribution lists
- Consider Collaborative Inbox for support@ when hiring Community Manager (50 users trigger)
