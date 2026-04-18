# MONTHLY-ROADMAP.md — April 2026

> **Status**: Active execution plan
> **Created**: 2026-04-14 (Session 18)
> **Owner**: Remy Ruozzi
> **Goal**: Testnet launch + beta users + AUSTRAC enrollment + industry notoriety

---

## Executive Summary

April 2026 is about **moving from code to product to market**. We enroll AUSTRAC, launch testnet, go live with admin + skill taxonomy, build X presence, and gather beta user feedback to inform lawyer review in May.

**Key outcomes by May 1:**
- AUSTRAC enrolled ✅
- Testnet live with 20–30 beta users ✅
- Admin dashboard operational ✅
- Skill taxonomy live ✅
- Industry feedback captured via X + direct outreach ✅
- Compliance data ready for Chamberlains ✅

---

## Week 1: Planning + Admin + Skill Taxonomy (Apr 14–18)

### High Priority
- **[TODAY] AUSTRAC Enrollment**
  - Fill portal form (30 min)
  - Submit ACN/ABN, business type (VASP), contact details
  - Receive registration number
  - Status: → Enrolled

- **Admin Accounts Implementation**
  - Build API routes: `/api/admin/login`, `/api/admin/disputes`, `/api/admin/audit-log`, `/api/admin/activity`
  - Create admin login page (@studioledger.ai email + password only)
  - Build admin dashboard: dispute review queue, activity log, permissions overview
  - Seed first account: remy@studioledger.ai (boss role, full access)
  - Test permission matrix (all 17 resources × 5 roles)
  - Status: → Live by Friday

- **Skill Taxonomy Design + Migration**
  - Finalize category/specialty structure (see below)
  - Create migration: `skill_category`, `skill_specialty`, `skill_tags` columns (users table)
  - Run migration locally, test
  - Status: → Migration ready by Friday

### Medium Priority
- Test suite: Run all 216 tests locally (verify nothing broke)
- X strategy: Draft content calendar (7 posts for next week)

### Deliverables
- AUSTRAC registration number (email confirmation)
- Admin dashboard live on dev (testnet-ready)
- Skill taxonomy migration file (ready to deploy)
- X content calendar (7 posts drafted)

---

## Week 2: Testnet Launch + Creator Profile Updates (Apr 21–25)

### High Priority
- **Deploy Testnet**
  - Push all code to testnet environment
  - Verify: contracts, escrow, MCC minting, admin dashboard, skill taxonomy
  - Test full E2E flow (creator signup → skill selection → create contract → escrow → release → MCC)
  - Status: → Live (possibly before)

- **Creator Profile Form Update**
  - Update signup form: Display name → role → skill category → skill specialty → tags → bio
  - Skill picker: interactive category → specialty dropdown (populated from taxonomy table)
  - Test with 3–5 manual signups
  - Status: → Live

- **Admin Dashboard Go-Live**
  - Seed test accounts with different roles (dev, accounting, commercial, protocol, boss)
  - Test admin login, permissions, dispute review queue
  - Verify audit log captures all actions
  - Status: → Operational

### Medium Priority
- X content rollout (Posts 1–3 this week: hype, technical, skill taxonomy)
- Beta-user recruitment starts (friends, XRPL community, LinkedIn outreach)

### Deliverables
- Testnet URL (accessible to beta users)
- Admin dashboard operational (all 5 roles tested)
- Creator skill selection live (testnet signup flow includes taxonomy picker)
- X posts published (3/7 this week)

---

## Week 3–4: Beta Users + Content + Feedback Loop (Apr 28–May 9)

### High Priority
- **Beta User Onboarding** (20–30 users)
  - Manual outreach: Discord, Twitter, email (XRPL community, freelancers)
  - Onboarding doc: testnet access, how to use skill taxonomy, how to report bugs
  - Support: Discord channel or direct messages for issues
  - Target: 5–10 contracts per week

- **Monitor Testnet**
  - Daily check: Are contracts being created? Are escrows funding? Are MCCs minting?
  - Capture bugs, UX friction, skill taxonomy feedback
  - Admin logs: Review dispute flow, compliance data, transaction patterns
  - Status: → Weekly metrics report

- **X Engagement**
  - Posts 4–7 live (founder story, admin rigor, beta announcement, RippleX tag)
  - Respond to replies, build community
  - Direct DM @RippleXdev (reference testnet, ask for feedback)
  - Status: → Growing followers + engagement

- **Industry Feedback**
  - Reach out to 5–10 industry people (designers, developers, creators with followings)
  - Share testnet access, ask for honest feedback
  - Capture: UX pain points, skill taxonomy accuracy, escrow clarity
  - Status: → Feedback doc compiled

### Medium Priority
- Dispute testing: Intentionally create 2–3 test disputes, resolve via admin dashboard (prove 3-tier flow)
- Compliance logging: Ensure every transaction is logged (KYC check, escrow lock, release, MCC mint)

### Deliverables
- 20–30 beta users onboarded (testnet active)
- Weekly metrics: X contracts, Y escrow volume, Z MCCs minted
- Feedback compilation: UX pain points, feature requests, skill taxonomy notes
- Industry testimonials: 3–5 quotes from builders/creators
- Admin audit logs: Complete transaction history (for Chamberlains)

---

## Skill Taxonomy Structure (to finalize Week 1)

### Design
- Graphic Design
  - Logo & Branding
  - Print Design
  - Social Media Graphics
- UI/UX Design
  - Web Design
  - Mobile App Design
  - Design Systems
- Motion Design
  - 2D Animation
  - 3D Animation
  - Motion Graphics
- Illustration
  - Character Design
  - Concept Art
  - Comic/Storyboard

### Video
- Video Editing
- Color Grading
- Motion Graphics
- VFX
- Animation

### Music & Audio
- Music Production
- Mixing & Mastering
- Sound Design
- Composition
- Voiceover

### Code & Development
- Frontend Development
- Backend Development
- Full-Stack Development
- DevOps / Infrastructure
- Mobile App Development

### Photography
- Portrait Photography
- Product Photography
- Event Photography
- Commercial Photography
- Stock Photography

### Writing & Content
- Copywriting
- Content Writing
- Technical Writing
- Editing & Proofreading
- Journalism

### Professional Services
- Consulting
- Coaching
- Training
- Project Management
- Other

---

## X Content Calendar (Week 2 start)

| Day | Post | Purpose | Tags |
|-----|------|---------|------|
| Mon | Testnet launch hype (short teaser) | Build anticipation | #XRPL #Creator |
| Tue | XLS-85 technical deep-dive (escrow mechanics) | Credibility with devs | @RippleXdev #XRPL |
| Wed | Skill taxonomy angle (discovery, reputation) | Show product thinking | #CreatorEconomy |
| Thu | Founder story (Launceston → XRPL builder) | Personal connection | @StudioLedgerCEO |
| Fri | Beta signup link + RippleX mention | Direct RippleX outreach | @RippleXdev |
| Sat | Admin dashboard + compliance rigor (show AUSTRAC prep) | Regulatory credibility | #AUSTRAC #Compliance |
| Sun | Testnet live + beta user CTA (call to action) | Drive signups | #XRPL #Testnet |

---

## Success Metrics (by May 1)

| Metric | Target | Status |
|--------|--------|--------|
| AUSTRAC enrolled | ✅ Registered | — |
| Testnet live | ✅ All features deployed | — |
| Beta users active | ✅ 20–30 onboarded | — |
| Test contracts completed | ✅ 15–20 full E2E flows | — |
| MCCs minted on testnet | ✅ 30–40 credentials | — |
| Admin dashboard operational | ✅ All 5 roles tested | — |
| Skill taxonomy in use | ✅ Beta creators picking skills | — |
| X followers | ✅ 500+ (from 0) | — |
| RippleX engagement | ✅ Reply or retweet from @RippleXdev | — |
| Compliance data ready | ✅ Transaction logs for Chamberlains | — |
| Industry feedback captured | ✅ 5+ testimonials | — |

---

## Blockers & Mitigations

| Blocker | Mitigation | Owner |
|---------|-----------|-------|
| Admin API routes incomplete by Wed | Start Mon, daily standup, prioritize | Remy |
| Skill taxonomy structure not finalized | Lock by Tue EOD, no more changes | Remy |
| Beta users hard to recruit | Pre-recruit via Discord + email (Week 1) | Remy |
| Testnet deploy fails | Run full test suite Thu, deploy Fri night | Remy |
| RippleX doesn't reply on X | Send DM + email (remy.ruozzi@proton.me) | Remy |

---

## Governance

- **Daily standup**: This roadmap, check progress
- **Weekly review** (every Fri): Update metrics, capture blockers, adjust Week N+1 plan
- **Checkpoint** (Apr 28): Assess testnet readiness, beta user feedback, adjust May plan
- **Final review** (May 1): Compile all data for Chamberlains + AUSTRAC

---

## Notes

### Why Admin Accounts Matter
- You need to monitor testnet in real-time (see disputes, transactions, compliance logs)
- Chamberlains + AUSTRAC will ask: "How do you manage disputes?" Answer: Show the dashboard.
- Shows you're thinking about operations, not just code.

### Why Skill Taxonomy Matters
- Beta users will sign up as "Designer" but there are 50 types of designers. Taxonomy makes matching real.
- Lawyer will ask: "How do you prevent scope creep / disputes?" Answer: Granular skill definitions + clear deliverables.
- Demonstrates you understand creator verticals, not just generic freelance.

### Why X Presence Matters
- Industry feedback on testnet > lawyer review in vacuum
- @RippleXdev sees momentum + commitment (not just a pitch deck request)
- Early users come from Twitter momentum, not landing page
- Builds founder credibility (Remy voice, not corporate BS)

### Why This Approach Works with Chamberlains
- By May, you have *working testnet* + *real user data* + *admin logs*
- Lawyer reviews proven system → faster sign-off → cheaper engagement
- You're not asking "Is this compliant?" You're asking "Fix these gaps."

---

## Next Steps

1. **Today (Apr 14)**: AUSTRAC enrollment, plan admin + taxonomy
2. **This week**: Build admin, migration, X calendar
3. **Next week**: Deploy testnet, go live
4. **Weeks 3–4**: Beta users, feedback, metrics
5. **May 1**: Hand off to Chamberlains with data

---

*Updated: 2026-04-14 | Owner: Remy Ruozzi | Status: IN PROGRESS*
