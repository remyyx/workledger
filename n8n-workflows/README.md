# StudioLedger — n8n Workflow Templates

## Setup

1. Import each `.json` file into your n8n instance via **Workflows → Import from File**
2. Configure credentials in n8n:
   - **Supabase API**: Your Supabase URL + service role key
   - **SMTP / Email**: For notification emails
   - **Webhook Secret**: Match `N8N_WEBHOOK_SECRET` in your `.env.local`
3. Activate each workflow after import
4. Enable MCP access: **Settings → Instance-level MCP → toggle on each workflow**

## Environment Variables (Next.js side)

Add to `.env.local`:
```
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook
N8N_WEBHOOK_SECRET=your-shared-secret-here
```

## Workflows

### 1. user-onboarding.json
**Trigger**: `user.registered` webhook
**Actions**:
- Set up XRPL trust lines for new user's platform-managed wallet
- Send welcome email
- Queue phone verification SMS
- Log onboarding status to Supabase

### 2. contract-lifecycle.json
**Trigger**: Multiple webhooks (`contract.*`, `milestone.*`)
**Actions**:
- Send email notifications to both parties on milestone transitions
- In-app notification insert to Supabase `notifications` table
- Auto-reminder if marketplace doesn't review within 5 days

### 3. dispute-escalation.json
**Trigger**: `dispute.opened` webhook
**Actions**:
- Notify the other party immediately
- Start 7-day direct resolution timer
- If no resolution → escalate to admin review
- If admin can't resolve → find 3 MCC-holding arbitrators
- Send evidence packets to arbitrators
- Enforce decision deadline

### 4. escrow-monitor.json
**Trigger**: Cron schedule (daily at 06:00 UTC)
**Actions**:
- Query Supabase for milestones with CancelAfter approaching (< 72 hours)
- Send warning notifications to both parties
- Query for stale submitted milestones (> 5 days without review)
- Send reminder to marketplace

### 5. mcc-historic.json
**Trigger**: `mcc.historic.recalc` webhook + weekly cron
**Actions**:
- Update creator's MCC count in user profile
- Recalculate craft standing (tier: Bronze → Silver → Gold → Platinum → Diamond)
- Check arbitration eligibility (standing ≥ 10, 5+ MCCs)

## Webhook URL Pattern

All webhooks follow: `{N8N_WEBHOOK_URL}/{event-name}`

Example: `https://your-n8n.app.n8n.cloud/webhook/milestone.submitted`
