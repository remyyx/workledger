// ============================================
// Notification Templates — Role-Aware Messaging
// ============================================
// Different notification tones per role for the same platform events.
// Creator (CR): celebration-oriented, earning-focused
// Marketplace (MK): action-oriented, approval/review-focused

export type NotificationEvent =
  | 'milestone_submitted'
  | 'milestone_approved'
  | 'milestone_released'
  | 'payment_received'
  | 'payment_sent'
  | 'mcc_minted'
  | 'contract_created'
  | 'contract_funded'
  | 'escrow_locked'
  | 'escrow_released';

export interface NotificationTemplate {
  title: string;
  body: string;
  tone: 'celebration' | 'action' | 'info';
}

type RoleTemplates = Record<NotificationEvent, NotificationTemplate>;

const creatorTemplates: RoleTemplates = {
  milestone_submitted: {
    title: 'Deliverable submitted!',
    body: 'Your work has been sent for review. You\'ll be notified when the client approves.',
    tone: 'info',
  },
  milestone_approved: {
    title: 'Milestone approved!',
    body: 'Your client approved the deliverable. Payment is being released from escrow.',
    tone: 'celebration',
  },
  milestone_released: {
    title: 'Payment released!',
    body: 'Escrow funds have been released to your wallet. A Work Credential (MCC) has been minted.',
    tone: 'celebration',
  },
  payment_received: {
    title: 'Payment received!',
    body: 'Funds have landed in your wallet.',
    tone: 'celebration',
  },
  payment_sent: {
    title: 'Payment sent',
    body: 'Your transfer has been submitted to the XRPL network.',
    tone: 'info',
  },
  mcc_minted: {
    title: 'New credential minted!',
    body: 'A Work Credential has been added to your portfolio. View it in Credential Assets.',
    tone: 'celebration',
  },
  contract_created: {
    title: 'Contract created',
    body: 'Your new contract is ready. Share it with your client to get it funded.',
    tone: 'info',
  },
  contract_funded: {
    title: 'Contract funded!',
    body: 'Your client has funded the escrow. You\'re clear to start working.',
    tone: 'celebration',
  },
  escrow_locked: {
    title: 'Escrow locked',
    body: 'Funds are now secured on XRPL. Deliver your work to unlock payment.',
    tone: 'info',
  },
  escrow_released: {
    title: 'Escrow released!',
    body: 'Payment has been released to your wallet. Well done!',
    tone: 'celebration',
  },
};

const marketmakerTemplates: RoleTemplates = {
  milestone_submitted: {
    title: 'Deliverable ready for review',
    body: 'A creator has submitted work for your approval. Review the deliverable to release payment.',
    tone: 'action',
  },
  milestone_approved: {
    title: 'Milestone approved',
    body: 'You\'ve approved the deliverable. Escrow funds are being released to the creator.',
    tone: 'info',
  },
  milestone_released: {
    title: 'Payment released to creator',
    body: 'Escrow has been released. A Completion Record (MCC) has been minted for your records.',
    tone: 'info',
  },
  payment_received: {
    title: 'Deposit received',
    body: 'Funds have been added to your account balance.',
    tone: 'info',
  },
  payment_sent: {
    title: 'Payment sent to creator',
    body: 'Funds have been transferred from escrow to the creator\'s wallet.',
    tone: 'info',
  },
  mcc_minted: {
    title: 'Completion record minted',
    body: 'A project Completion Record has been added to your account. View it in Credential Assets.',
    tone: 'info',
  },
  contract_created: {
    title: 'Project posted',
    body: 'Your project offer is live. Fund the escrow to attract creators.',
    tone: 'info',
  },
  contract_funded: {
    title: 'Project funded',
    body: 'Escrow is locked on XRPL. The creator can now begin work.',
    tone: 'info',
  },
  escrow_locked: {
    title: 'Funds secured in escrow',
    body: 'Your funds are locked on XRPL. They\'ll be released when you approve the deliverable.',
    tone: 'info',
  },
  escrow_released: {
    title: 'Escrow released',
    body: 'Payment has been sent to the creator. Project milestone complete.',
    tone: 'info',
  },
};

/**
 * Get the appropriate notification template for a given event and user role.
 */
export function getNotification(
  event: NotificationEvent,
  role: 'creator' | 'marketplace' | 'both'
): NotificationTemplate {
  if (role === 'marketplace') {
    return marketmakerTemplates[event];
  }
  return creatorTemplates[event];
}

/**
 * Get all notification templates for a role (useful for settings/preview).
 */
export function getAllTemplates(role: 'creator' | 'marketplace' | 'both'): RoleTemplates {
  if (role === 'marketplace') {
    return marketmakerTemplates;
  }
  return creatorTemplates;
}
