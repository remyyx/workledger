// ============================================
// StudioLedger Type Definitions
// ============================================

// --- User Types ---
// Creator = service provider (was "freelancer")
// Marketplace = service buyer (was "client")
export type UserRole = 'creator' | 'marketplace' | 'both';

export interface User {
  id: string;
  email: string;
  display_name: string;
  xrpl_address: string;
  pub_key_hash: string;
  role: UserRole;
  verified: boolean;
  avatar_url: string | null;
  bio: string | null;
  skills: string[];
  payout_config: PayoutConfig | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayoutConfig {
  strategy: 'single' | 'split' | 'stack';
  allocations: CurrencyAllocation[];
  auto_withdraw: {
    enabled: boolean;
    threshold: number;
    destination: 'bank' | 'external_wallet';
    frequency: 'daily' | 'weekly' | 'monthly';
  };
}

export interface CurrencyAllocation {
  currency: string;
  percentage: number;
  action: 'withdraw' | 'stack';
}

// --- Contract Types ---
export type ContractStatus =
  | 'draft'
  | 'funded'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export type ContractTemplate =
  | 'fixed_price'
  | 'milestone'
  | 'retainer'
  | 'pay_per_use'
  | 'license_deal'
  | 'subscription';

export interface ContractMetadata {
  marketplace_email?: string;
  pending_invite?: boolean;
  retainer?: {
    monthly_amount: number;
    start_date: string;
    duration_months: number;
    hours_per_month: number | null;
  };
}

export interface Contract {
  id: string;
  creator_id: string;
  marketplace_id: string | null;
  template: ContractTemplate;
  title: string;
  description: string;
  status: ContractStatus;
  currency: string;
  total_amount: number;
  platform_fee: number;
  license_terms: LicenseTerms | null;
  contract_hash: string | null;
  metadata: ContractMetadata | null;
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

// --- Milestone Types ---
export type MilestoneStatus =
  | 'pending'
  | 'funded'
  | 'submitted'
  | 'approved'
  | 'released'
  | 'disputed';

export interface Milestone {
  id: string;
  contract_id: string;
  sequence: number;
  title: string;
  description: string;
  amount: number;
  deadline: string;
  status: MilestoneStatus;
  escrow_tx_hash: string | null;
  escrow_sequence: number | null;
  release_tx_hash: string | null;
  condition: string | null;
  fulfillment: string | null;
  deliverable_hash: string | null;
  deliverable_notes: string | null;
  deliverable_media_url: string | null;
  deliverable_doc_url: string | null;
  mcc_token_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  changes_requested_at: string | null;
  released_at: string | null;
}

// --- MCC Types (Minted Craft Credential) ---
// On-chain copyright tokens: proof of work, licensed rights, or access passes.
// Taxon 1 = Work Credential (creator), 2 = License, 3 = Access Pass, 4 = Client Completion Record
export type MCCTaxon = 1 | 2 | 3 | 4;

export interface MCCRecord {
  id: string;
  mcc_token_id: string;
  taxon: MCCTaxon;
  issuer: string;
  owner: string;
  contract_id: string | null;
  milestone_id: string | null;
  metadata_uri: string;
  metadata_cache: MCCMetadata;
  mint_tx_hash: string;
  minted_at: string;
}

export interface MCCMetadata {
  name: string;
  description: string;
  image?: string;
  // Work credential specific (taxon 1)
  work_title?: string;
  work_category?: string;
  deliverable_hash?: string;
  delivery_date?: string;
  payment_amount?: string;
  payment_currency?: string;
  escrow_tx_hash?: string;
  escrow_sequence?: number;          // XRPL escrow sequence number
  milestone_sequence?: number;       // milestone index within the contract
  contract_hash?: string;            // on-chain contract integrity hash
  marketplace_rating?: number;       // 1–5 stars, set by client at release
  marketplace_comment?: string;      // client's public comment on the work
  // Client Completion Record (taxon 4)
  client_name?: string;              // organisation / client display name
  creator_name?: string;             // creator's display name
  creator_address?: string;          // creator XRPL address
  // License specific (taxon 2)
  rights?: string;
  territory?: string;
  duration?: string;
  exclusivity?: 'exclusive' | 'non-exclusive';
  modifications_allowed?: boolean;
  sublicensing?: boolean;
  revocation_conditions?: string;
  linked_mcc?: string;
  // Delivery document — full Work Delivery & License Summary captured at submission
  // Stored on IPFS alongside the image; rendered in the MCC card and readable by any wallet.
  delivery_doc?: string;             // full plain-text delivery summary document
  deliverable_media_url?: string;    // IPFS URI or HTTP URL to deliverable preview (low-res)
  deliverable_files?: Array<{        // files included in the delivery
    name: string;
    format?: string;
    role?: string;
    notes?: string;
  }>;
  // Standard XRPL/OpenSea NFT attributes — serialised at mint for wallet compatibility
  // Each entry maps to {"trait_type": string, "value": string|number} in the on-chain JSON
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface LicenseTerms {
  rights: string;
  territory: string;
  duration: string;
  exclusivity: 'exclusive' | 'non-exclusive';
  modifications_allowed: boolean;
  sublicensing: boolean;
  transferable: boolean;
  royalty_percent: number;
  revocation_conditions: string;
  /** Full plain-text capture of the uploaded license document, stored alongside the structured fields. */
  source_doc?: string;
}

// --- Wallet Types ---
export interface WalletBalance {
  currency: string;
  value: string;
  issuer?: string;
  display_value: string;
  usd_equivalent: number;
}

export interface TransactionRecord {
  id: string;
  tx_hash: string;
  tx_type: string;
  from_address: string;
  to_address: string;
  amount: string;
  currency: string;
  contract_id: string | null;
  milestone_id: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  ledger_index: number;
  created_at: string;
}

// --- Dispute Types ---
export interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string;
  raised_by: string;
  reason: string;
  status: 'open' | 'evidence' | 'review' | 'resolved';
  resolution: 'creator_wins' | 'marketplace_wins' | 'compromise' | null;
  arbitrator_id: string | null;
  evidence: DisputeEvidence[];
  created_at: string;
  resolved_at: string | null;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  description: string;
  file_hash: string | null;
  file_url: string | null;
  created_at: string;
}

// --- Project Brief Types ---
// MK posts briefs to attract CR proposals; CR browses briefs in "Find Work"
export type BriefStatus = 'open' | 'in_negotiation' | 'filled' | 'cancelled';

export interface ProjectBrief {
  id: string;
  author_id: string;                 // MK who posted the brief
  title: string;
  description: string;
  category: string;                  // e.g. 'design', 'development', 'music', 'video'
  skills_required: string[];
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  deadline: string | null;           // desired completion date
  template: ContractTemplate;        // preferred contract type
  status: BriefStatus;
  proposals_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: {
    display_name: string;
    avatar_url: string | null;
    role: UserRole;
  };
}

// --- Proposal & Negotiation Types ---
// Bi-directional: CR proposes on a brief, OR MK sends offer to a CR
export type ProposalStatus =
  | 'pending'       // awaiting response from other party
  | 'countered'     // other party sent a counter-offer
  | 'accepted'      // both parties agreed — ready to create contract
  | 'withdrawn'     // initiator withdrew
  | 'declined';     // recipient rejected

export type ProposalDirection = 'cr_to_mk' | 'mk_to_cr';

export interface ProposalMilestone {
  sequence: number;
  title: string;
  description: string;
  amount: number;
  deadline: string;
}

export interface ProposalTerms {
  template: ContractTemplate;
  title: string;
  description: string;
  currency: string;
  total_amount: number;
  milestones: ProposalMilestone[];
  deadline: string | null;            // overall deadline
  retainer?: {
    monthly_amount: number;
    start_date: string;
    duration_months: number;
    hours_per_month: number | null;
  };
  notes: string;                      // cover letter / pitch / message
}

export interface Proposal {
  id: string;
  brief_id: string | null;           // null if direct offer (MK→CR)
  creator_id: string;
  marketplace_id: string;
  direction: ProposalDirection;
  status: ProposalStatus;
  current_round: number;             // increments on each counter
  contract_id: string | null;        // set when accepted → contract created
  created_at: string;
  updated_at: string;
  // Joined fields
  brief?: ProjectBrief;
  creator?: { display_name: string; avatar_url: string | null };
  marketplace?: { display_name: string; avatar_url: string | null };
  rounds?: ProposalRound[];
  latest_terms?: ProposalTerms;      // convenience: latest round's terms
}

export interface ProposalRound {
  id: string;
  proposal_id: string;
  round_number: number;
  author_id: string;                 // who submitted this round
  terms: ProposalTerms;
  message: string | null;            // optional message with the counter
  created_at: string;
}

// --- Contract Message Types ---
// Unified activity timeline: system events + user messages + structured actions
export type MessageType =
  | 'system'
  | 'message'
  | 'contract_created'
  | 'invitation_sent'
  | 'revision_request'
  | 'deliverable_submit'
  | 'approval'
  | 'release'
  | 'dispute_open'
  | 'deadline_warning'
  | 'escalation';

export interface MessageAttachment {
  name: string;
  url: string;
  hash: string | null;
  size: number;
  mime_type: string;
}

export interface RevisionRequestData {
  issues: string[];
  requested_changes: string;
  severity: 'minor' | 'major' | 'critical';
}

export interface SystemEventData {
  action: string;
  old_status?: string;
  new_status?: string;
  tx_hash?: string;
  amount?: string;
  currency?: string;
}

export interface DeliverableSubmitData {
  media_hash: string | null;
  doc_hash: string | null;
  media_url: string | null;
  doc_url: string | null;
  notes: string | null;
}

export interface DeadlineWarningData {
  milestone_seq: number;
  deadline: string;
  days_remaining: number;
}

export interface EscalationData {
  days_waiting: number;
  escalation_level: 1 | 2 | 3;
  auto_action_at: string | null;
}

export type MessageMetadata =
  | RevisionRequestData
  | SystemEventData
  | DeliverableSubmitData
  | DeadlineWarningData
  | EscalationData
  | Record<string, unknown>;

export interface ContractMessage {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  sender_id: string | null;
  type: MessageType;
  content: string | null;
  attachments: MessageAttachment[];
  metadata: MessageMetadata;
  read_by: string[];
  created_at: string;
  // Joined fields (populated by API)
  sender?: {
    display_name: string;
    avatar_url: string | null;
    role: UserRole;
  };
}
