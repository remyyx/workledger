# Skill: n8n Wiring

**Trigger**: "n8n not firing", "webhook not working", "notification not sent", "event not received", "wire up n8n"

## Context
n8n is StudioLedger's async automation layer. The client in `src/lib/n8n/client.ts` fires 14 event types as non-blocking webhooks. Architecture is fire-and-forget: if n8n is down, XRPL + DB operations still succeed.

## Event Types (from client.ts)
```
user.registered       contract.created      contract.funded
contract.completed    milestone.funded      milestone.submitted
milestone.approved    milestone.released    milestone.disputed
dispute.opened        dispute.escalated     dispute.resolved
mcc.minted            escrow.expiring
```

## Debug Steps

1. **Check env var**
   - `N8N_WEBHOOK_URL` must be set in `.env.local`
   - Format: `https://your-instance.app.n8n.cloud/webhook` (no trailing slash)
   - Optional: `N8N_WEBHOOK_SECRET` for auth header

2. **Verify the fire point**
   - Find where `n8n.eventName()` is called in the API route
   - It should be AFTER the DB write and XRPL tx, not before
   - The call is non-blocking (no await needed in calling context)

3. **Check URL construction**
   - URL pattern: `${N8N_WEBHOOK_BASE}/${event}`
   - Example: `https://n8n.studioledger.ai/webhook/milestone.released`
   - Common issue: base URL has trailing slash → double slash in final URL
   - Common issue: n8n webhook path doesn't match event name (periods vs dashes)

4. **Test the webhook**
   - Fire manually: `n8n_webhook_test` with a sample payload
   - Check n8n execution history for the incoming trigger
   - Check if the workflow is active (inactive workflows don't respond to webhooks)

5. **Check n8n workflow structure**
   - Webhook trigger node → must match the URL path
   - Auth: if `N8N_WEBHOOK_SECRET` is set, n8n must check `X-Webhook-Secret` header
   - Timeout: 5 seconds (from AbortSignal in client.ts) — n8n must respond within 5s or the client drops it

6. **Verify payload shape**
   - All events send: `{ event, timestamp, data }`
   - Each event's `data` shape is typed in client.ts (the convenience helpers)
   - n8n workflow must parse `data` correctly — check for snake_case vs camelCase mismatches

## Workflow Design Patterns

### Notification workflow
```
Webhook trigger → Switch (by event type) → Format message → Send (email/Slack/Telegram)
```

### Escrow expiration watcher
```
Schedule trigger (every 1h) → Query Supabase for milestones with escrow_cancel_after < now + 24h → Send warning notifications
```

### MCC mint queue
```
Webhook (mcc.minted) → Verify on-chain (xrpl_tx_lookup) → Update nft_registry if needed → Notify creator
```

## Common Issues
- **n8n not deployed yet**: client.ts silently skips with console.log — this is by design
- **5-second timeout too short**: increase AbortSignal.timeout in client.ts for long workflows
- **Double-firing**: if API route retries on error, n8n gets the event twice — make workflows idempotent
