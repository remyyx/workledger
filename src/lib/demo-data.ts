import type {
  User,
  Contract,
  Milestone,
  MCCRecord,
  WalletBalance,
  TransactionRecord,
  ContractMessage,
} from '@/types';

// --- Demo Users ---
// Creator: Alice Martin (default dev user)
export const demoUser: User = {
  id: 'u-001',
  email: 'alice@studioledger.io',
  display_name: 'Alice Martin',
  xrpl_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  pub_key_hash: 'abc123',
  role: 'creator',
  verified: true,
  avatar_url: null,
  bio: 'Full-stack developer specializing in blockchain integrations and Web3 applications.',
  skills: ['React', 'TypeScript', 'XRPL', 'Solidity', 'Node.js', 'PostgreSQL'],
  payout_config: {
    strategy: 'split',
    allocations: [
      { currency: 'RLUSD', percentage: 60, action: 'withdraw' },
      { currency: 'XRP', percentage: 30, action: 'stack' },
      { currency: 'EUR', percentage: 10, action: 'withdraw' },
    ],
    auto_withdraw: {
      enabled: true,
      threshold: 500,
      destination: 'bank',
      frequency: 'weekly',
    },
  },
  created_at: '2024-11-15T10:00:00Z',
  updated_at: '2025-02-20T14:30:00Z',
};

// Marketplace: Mondelez International (virtual tester)
export const demoMarketplaceUser: User = {
  id: 'u-006',
  email: 'marketplace1@test.studioledger.local',
  display_name: 'Marketplace 1 (virtual tester)',
  xrpl_address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
  pub_key_hash: 'def456',
  role: 'marketplace',
  verified: true,
  avatar_url: null,
  bio: 'Global brand looking for creative talent.',
  skills: [],
  payout_config: null,
  created_at: '2024-12-01T08:00:00Z',
  updated_at: '2025-03-01T10:00:00Z',
};

// Lookup by role for dev-mode filtering
export const demoUsers: Record<string, User> = {
  'creator': demoUser,
  'marketplace': demoMarketplaceUser,
};

// XRPL addresses for role-based MCC filtering
export const DEMO_CREATOR_ADDRESS = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
export const DEMO_MARKETPLACE_ADDRESS = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

// --- Demo Milestones ---
const milestonesDesignSystem: Milestone[] = [
  {
    id: 'm-001',
    contract_id: 'c-001',
    sequence: 1,
    title: 'Design System & Wireframes',
    description: 'Complete UI kit with component library',
    amount: 800,
    deadline: '2025-02-15T00:00:00Z',
    status: 'released',
    escrow_tx_hash: 'A1B2C3D4E5F6...',
    escrow_sequence: 12345,
    release_tx_hash: 'F6E5D4C3B2A1...',
    condition: 'cond_001',
    fulfillment: 'fulf_001',
    deliverable_hash: 'sha256_abc123',
    mcc_token_id: 'mcc-001',
    deliverable_notes: null,
    deliverable_media_url: null,
    deliverable_doc_url: null,
    submitted_at: '2025-02-13T10:00:00Z',
    approved_at: '2025-02-14T09:00:00Z',
    changes_requested_at: null,
    released_at: '2025-02-14T09:05:00Z',
  },
  {
    id: 'm-002',
    contract_id: 'c-001',
    sequence: 2,
    title: 'Frontend Implementation',
    description: 'Build all pages with React + Tailwind',
    amount: 1200,
    deadline: '2025-03-01T00:00:00Z',
    status: 'submitted',
    escrow_tx_hash: 'B2C3D4E5F6A1...',
    escrow_sequence: 12346,
    release_tx_hash: null,
    condition: 'cond_002',
    fulfillment: null,
    deliverable_hash: 'sha256_def456',
    mcc_token_id: null,
    deliverable_notes: null,
    deliverable_media_url: null,
    deliverable_doc_url: null,
    submitted_at: '2025-02-22T16:00:00Z',
    approved_at: null,
    changes_requested_at: null,
    released_at: null,
  },
  {
    id: 'm-003',
    contract_id: 'c-001',
    sequence: 3,
    title: 'Backend & API Integration',
    description: 'Connect frontend to XRPL and Supabase',
    amount: 1000,
    deadline: '2025-03-15T00:00:00Z',
    status: 'funded',
    escrow_tx_hash: 'C3D4E5F6A1B2...',
    escrow_sequence: 12347,
    release_tx_hash: null,
    condition: 'cond_003',
    fulfillment: null,
    deliverable_hash: null,
    mcc_token_id: null,
    deliverable_notes: null,
    deliverable_media_url: null,
    deliverable_doc_url: null,
    submitted_at: null,
    approved_at: null,
    changes_requested_at: null,
    released_at: null,
  },
];

// --- Demo Contracts ---
export const demoContracts: Contract[] = [
  {
    id: 'c-001',
    creator_id: 'u-001',
    marketplace_id: 'u-002',
    template: 'milestone',
    title: 'E-Commerce Platform Redesign',
    description: 'Full redesign of the TechCo e-commerce platform with modern UI.',
    status: 'active',
    currency: 'RLUSD',
    total_amount: 3000,
    platform_fee: 15.71,
    license_terms: null,
    contract_hash: 'hash_c001',
    metadata: null,
    milestones: milestonesDesignSystem,
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-02-22T16:00:00Z',
  },
  {
    id: 'c-002',
    creator_id: 'u-001',
    marketplace_id: 'u-003',
    template: 'fixed_price',
    title: 'Brand Identity Package',
    description: 'Logo, color palette, typography, and brand guidelines for StartupXYZ.',
    status: 'funded',
    currency: 'RLUSD',
    total_amount: 1500,
    platform_fee: 7.85,
    license_terms: null,
    contract_hash: 'hash_c002',
    metadata: null,
    milestones: [
      {
        id: 'm-004',
        contract_id: 'c-002',
        sequence: 1,
        title: 'Full Delivery',
        description: 'Complete brand identity package',
        amount: 1500,
        deadline: '2025-03-10T00:00:00Z',
        status: 'funded',
        escrow_tx_hash: 'D4E5F6A1B2C3...',
        escrow_sequence: 12348,
        release_tx_hash: null,
        condition: 'cond_004',
        fulfillment: null,
        deliverable_hash: null,
        mcc_token_id: null,
        deliverable_notes: null,
        deliverable_media_url: null,
        deliverable_doc_url: null,
        submitted_at: null,
        approved_at: null,
        changes_requested_at: null,
        released_at: null,
      },
    ],
    created_at: '2025-02-10T10:00:00Z',
    updated_at: '2025-02-12T14:00:00Z',
  },
  {
    id: 'c-003',
    creator_id: 'u-001',
    marketplace_id: 'u-004',
    template: 'fixed_price',
    title: 'Mobile App Prototype',
    description: 'Interactive Figma prototype for a fitness tracking app.',
    status: 'completed',
    currency: 'XRP',
    total_amount: 2000,
    platform_fee: 10.47,
    license_terms: null,
    contract_hash: 'hash_c003',
    metadata: null,
    milestones: [
      {
        id: 'm-005',
        contract_id: 'c-003',
        sequence: 1,
        title: 'Full Delivery',
        description: 'Complete prototype with interactions',
        amount: 2000,
        deadline: '2025-01-30T00:00:00Z',
        status: 'released',
        escrow_tx_hash: 'E5F6A1B2C3D4...',
        escrow_sequence: 12349,
        release_tx_hash: 'A1B2C3D4...',
        condition: 'cond_005',
        fulfillment: 'fulf_005',
        deliverable_hash: 'sha256_ghi789',
        mcc_token_id: 'mcc-003',
        deliverable_notes: null,
        deliverable_media_url: null,
        deliverable_doc_url: null,
        submitted_at: '2025-01-28T10:00:00Z',
        approved_at: '2025-01-29T09:00:00Z',
        changes_requested_at: null,
        released_at: '2025-01-29T09:05:00Z',
      },
    ],
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-29T09:05:00Z',
  },
  {
    id: 'c-004',
    creator_id: 'u-001',
    marketplace_id: 'u-005',
    template: 'fixed_price',
    title: 'Smart Contract Audit',
    description: 'Security audit of DeFi protocol smart contracts.',
    status: 'draft',
    currency: 'RLUSD',
    total_amount: 5000,
    platform_fee: 26.18,
    license_terms: null,
    contract_hash: null,
    metadata: null,
    milestones: [],
    created_at: '2025-02-23T10:00:00Z',
    updated_at: '2025-02-23T10:00:00Z',
  },
  {
    id: 'c-005',
    creator_id: 'u-001',
    marketplace_id: 'u-006',
    template: 'milestone',
    title: 'Oreo Brand Creative Direction',
    description: 'Creative direction, visual identity refresh, and full campaign asset suite for the Oreo global brand project.',
    status: 'completed',
    currency: 'RLUSD',
    total_amount: 5616.72,
    platform_fee: 112.33,
    license_terms: null,
    contract_hash: 'hash_c005',
    metadata: null,
    milestones: [
      {
        id: 'm-006',
        contract_id: 'c-005',
        sequence: 1,
        title: 'Brand Creative Direction Delivery',
        description: 'Creative direction, visual identity refresh, and campaign assets',
        amount: 5616.72,
        deadline: '2025-03-10T00:00:00Z',
        status: 'released',
        escrow_tx_hash: 'F6A1B2C3D4E5...',
        escrow_sequence: 12350,
        release_tx_hash: 'MNO123...',
        condition: 'cond_006',
        fulfillment: 'fulf_006',
        deliverable_hash: 'sha256_oreo2025',
        mcc_token_id: 'mcc-005',
        deliverable_notes: null,
        deliverable_media_url: 'https://img.freepik.com/premium-photo/ethereal-cipher-gorgeous-geisha-ghost-shell-code-generative-ai_978425-847.jpg?w=996',
        deliverable_doc_url: null,
        submitted_at: '2025-03-08T14:00:00Z',
        approved_at: '2025-03-09T10:00:00Z',
        changes_requested_at: null,
        released_at: '2025-03-10T11:30:00Z',
      },
    ],
    created_at: '2025-02-01T10:00:00Z',
    updated_at: '2025-03-10T11:30:00Z',
  },
];

// --- Demo Balances ---
export const demoBalances: WalletBalance[] = [
  { currency: 'RLUSD', value: '3230.85', issuer: 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3', display_value: '3,230.85 RLUSD', usd_equivalent: 3230.85 },
  { currency: 'XRP', value: '12840.00', display_value: '12,840.00 XRP', usd_equivalent: 8988.00 },
  { currency: 'USD', value: '2100.00', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', display_value: '2,100.00 USD', usd_equivalent: 2100.00 },
  { currency: 'EUR', value: '1120.00', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq', display_value: '1,120.00 EUR', usd_equivalent: 1220.80 },
  { currency: 'USDC', value: '500.00', issuer: 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu', display_value: '500.00 USDC', usd_equivalent: 500.00 },
  { currency: 'USDT', value: '750.00', issuer: 'rcvxE9PS9YBwxtGg1qNeewV6ZB3wGubZq', display_value: '750.00 USDT', usd_equivalent: 750.00 },
];

// --- Demo MCCs (Minted Craft Credentials) ---
export const demoMCCs: MCCRecord[] = [
  {
    id: 'mcc-001',
    mcc_token_id: '000800006203F49C21D5D6E022CB16DE3538F248662FC73C00000001',
    taxon: 1,
    issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    contract_id: 'c-001',
    milestone_id: 'm-001',
    metadata_uri: 'ipfs://Qm...',
    metadata_cache: {
      name: 'Design System & Wireframes',
      description: 'Complete UI kit with component library, design tokens, and annotated wireframes for all core pages of the TechCo e-commerce platform.',
      image: 'gradient:purple-pink',
      work_title: 'E-Commerce Platform Redesign',
      work_category: 'UI/UX Design',
      client_name: 'TechCo Inc.',
      deliverable_hash: 'sha256_abc123',
      delivery_date: '2025-02-14',
      payment_amount: '800',
      payment_currency: 'RLUSD',
      escrow_tx_hash: 'A1B2C3D4E5F6...',
      escrow_sequence: 12345,
      milestone_sequence: 1,
      contract_hash: 'hash_c001',
      marketplace_rating: 5,
      marketplace_comment: 'Excellent work, exceeded expectations.',
    },
    mint_tx_hash: 'TX001ABC...',
    minted_at: '2025-02-14T09:05:00Z',
  },
  {
    id: 'mcc-002',
    mcc_token_id: '000800006203F49C21D5D6E022CB16DE3538F248662FC73C00000002',
    taxon: 2,
    issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    contract_id: 'c-003',
    milestone_id: null,
    metadata_uri: 'ipfs://Qm...',
    metadata_cache: {
      name: 'Fitness App UI License',
      description: 'Non-exclusive license for fitness app UI designs',
      rights: 'Use in mobile applications',
      territory: 'Worldwide',
      duration: '2 years',
      exclusivity: 'non-exclusive',
      modifications_allowed: true,
      sublicensing: false,
    },
    mint_tx_hash: 'TX002DEF...',
    minted_at: '2025-01-29T10:00:00Z',
  },
  {
    id: 'mcc-003',
    mcc_token_id: '000800006203F49C21D5D6E022CB16DE3538F248662FC73C00000003',
    taxon: 1,
    issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    contract_id: 'c-003',
    milestone_id: 'm-005',
    metadata_uri: 'ipfs://Qm...',
    metadata_cache: {
      name: 'Mobile App Prototype',
      description: 'High-fidelity interactive Figma prototype for the FitTrack fitness tracking app, covering 24 screens with full interaction flows.',
      image: 'gradient:blue-cyan',
      work_title: 'Mobile App Prototype',
      work_category: 'Product Design',
      client_name: 'FitTrack Labs',
      deliverable_hash: 'sha256_ghi789',
      delivery_date: '2025-01-29',
      payment_amount: '2000',
      payment_currency: 'XRP',
      escrow_tx_hash: 'E5F6A1B2C3D4...',
      escrow_sequence: 12349,
      milestone_sequence: 1,
      contract_hash: 'hash_c003',
      marketplace_rating: 4,
      marketplace_comment: 'Great prototype, minor revisions needed.',
    },
    mint_tx_hash: 'TX003GHI...',
    minted_at: '2025-01-29T09:10:00Z',
  },
  {
    id: 'mcc-004',
    mcc_token_id: '000800006203F49C21D5D6E022CB16DE3538F248662FC73C00000004',
    taxon: 3,
    issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    contract_id: null,
    milestone_id: null,
    metadata_uri: 'ipfs://Qm...',
    metadata_cache: {
      name: 'Premium Client Pass',
      description: 'Priority booking and 10% discount on all services',
    },
    mint_tx_hash: 'TX004JKL...',
    minted_at: '2025-02-01T12:00:00Z',
  },
  {
    id: 'mcc-006',
    mcc_token_id: '000800006203F49C21D5D6E022CB16DE3538F248662FC73C00000006',
    taxon: 4,
    issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    owner: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    contract_id: 'c-005',
    milestone_id: 'm-006',
    metadata_uri: 'ipfs://Qm...',
    metadata_cache: {
      name: 'Oreo Brand Creative Direction — Project Completion',
      description: 'Verified record of project completion for the Oreo Brand Creative Direction engagement. Work delivered on time, escrow released on-chain.',
      image: 'gradient:pastel-blue',
      work_title: 'Oreo Brand Creative Direction',
      work_category: 'Brand & Creative',
      deliverable_media_url: 'https://img.freepik.com/premium-photo/ethereal-cipher-gorgeous-geisha-ghost-shell-code-generative-ai_978425-847.jpg?w=996',
      deliverable_hash: 'sha256_oreo2025',
      delivery_date: '2025-03-10',
      payment_amount: '5616.72',
      payment_currency: 'RLUSD',
      escrow_tx_hash: 'MNO123...',
      escrow_sequence: 12350,
      milestone_sequence: 1,
      contract_hash: 'hash_c005',
      client_name: 'Mondelez International',
      creator_name: 'Alice Martin',
      creator_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      marketplace_rating: 5,
      marketplace_comment: 'Exceptional creative vision. Delivered on time with zero revisions needed.',
      delivery_doc: `StudioLedger.ai — Work Delivery & License Summary

1. Project
   Project name: Oreo Brand Creative Direction
   Client / Brand: Mondelez International
   Creator: Alice Martin (Art Director / Brand Strategist)
   Contract ID (StudioLedger): CON-2025-00005
   Milestone: M1 — Brand Creative Direction Delivery

2. Work Delivered
   2.1 Title & description
       Work title: Oreo Brand Creative Direction
       Type of work: Brand identity refresh, art direction, campaign creative
       Short description: Full creative direction package for the Oreo global brand project. Includes brand book refresh, art direction guidelines, colour system update, typography selection, and 3 campaign concepts with hero visuals.

   2.2 Files included (media)
       Oreo_BrandBook_v3_Final.pdf
           Type/format: PDF, 48 pages
           Role: Primary brand book (print + digital)
           Notes: Includes logo usage, colour system, typography, imagery guidelines.

       Oreo_Campaign_Concepts_x3.pdf
           Type/format: PDF, 24 pages
           Role: 3 hero campaign concepts with rationale
           Notes: Each concept includes mood board, hero visual, tagline, and channel breakdown.

       Oreo_HeroVisual_Campaign1_HR.png
           Type/format: PNG, 4800×3200, 300 DPI
           Role: Hero visual — Campaign 1 "Twist of Wonder"
           Notes: Final approved artwork, CMYK + RGB versions.

       Oreo_ColourSystem_Tokens.json
           Type/format: JSON design tokens
           Role: Colour system for dev handoff
           Notes: CSS variables, Figma tokens, and Tailwind config included.

3. Delivery hash
   SHA-256: sha256_oreo2025
   Computed at: 2025-03-08T14:00:00Z

4. Escrow & Payment
   Payment amount: 5,616.72 RLUSD
   Escrow TX: MNO123...
   Escrow sequence: 12350
   Released: 2025-03-10T11:30:00Z

5. License Terms
   Rights granted: Use in global brand communications, packaging, digital, and print advertising
   Territory: Worldwide
   Duration: Perpetual
   Exclusivity: Exclusive to Mondelez International
   Modifications: Allowed with creator credit
   Sublicensing: Not permitted
   Royalties: None (full buyout)
   Revocation: Non-revocable after payment release`,
      deliverable_files: [
        { name: 'Oreo_BrandBook_v3_Final.pdf', format: 'PDF, 48 pages', role: 'Primary brand book', notes: 'Logo usage, colour system, typography, imagery guidelines.' },
        { name: 'Oreo_Campaign_Concepts_x3.pdf', format: 'PDF, 24 pages', role: '3 hero campaign concepts', notes: 'Mood boards, hero visuals, taglines, channel breakdowns.' },
        { name: 'Oreo_HeroVisual_Campaign1_HR.png', format: 'PNG, 4800×3200, 300 DPI', role: 'Hero visual — Campaign 1', notes: 'Final approved artwork, CMYK + RGB.' },
        { name: 'Oreo_ColourSystem_Tokens.json', format: 'JSON design tokens', role: 'Colour system for dev', notes: 'CSS variables, Figma tokens, Tailwind config.' },
      ],
    },
    mint_tx_hash: 'TX006PQR...',
    minted_at: '2025-03-10T11:32:00Z',
  },
  {
    id: 'mcc-005',
    mcc_token_id: '000800006203F49C21D5D6E022CB16DE3538F248662FC73C00000005',
    taxon: 1,
    issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    owner: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    contract_id: 'c-005',
    milestone_id: 'm-006',
    metadata_uri: 'ipfs://Qm...',
    metadata_cache: {
      name: 'Oreo Project — Brand Creative Direction',
      description: 'Creative direction, visual identity refresh, and campaign assets delivered for the Oreo global brand project. Includes brand book, art direction guidelines, and 3 campaign concepts.',
      image: 'gradient:orange-red',
      work_title: 'Oreo Brand Creative Direction',
      work_category: 'Brand & Creative',
      client_name: 'Mondelez International',
      creator_name: 'Alice Martin',
      deliverable_media_url: 'https://img.freepik.com/premium-photo/ethereal-cipher-gorgeous-geisha-ghost-shell-code-generative-ai_978425-847.jpg?w=996',
      deliverable_hash: 'sha256_oreo2025',
      delivery_date: '2025-03-10',
      payment_amount: '5616.72',
      payment_currency: 'RLUSD',
      escrow_tx_hash: 'F6A1B2C3D4E5...',
      escrow_sequence: 12350,
      milestone_sequence: 1,
      contract_hash: 'hash_c005',
      marketplace_rating: 5,
      marketplace_comment: 'Exceptional creative vision. Delivered on time with zero revisions needed.',
      // ── Full Delivery & License Summary (captured at submission) ──
      delivery_doc: `StudioLedger.ai — Work Delivery & License Summary

1. Project
   Project name: Oreo Brand Creative Direction
   Client / Brand: Mondelez International
   Creator: Alice Martin (Art Director / Brand Strategist)
   Contract ID (StudioLedger): CON-2025-00005
   Milestone: M1 — Brand Creative Direction Delivery

2. Work Delivered
   2.1 Title & description
       Work title: Oreo Brand Creative Direction
       Type of work: Brand identity refresh, art direction, campaign creative
       Short description: Full creative direction package for the Oreo global brand project. Includes brand book refresh, art direction guidelines, colour system update, typography selection, and 3 campaign concepts with hero visuals.

   2.2 Files included (media)
       Oreo_BrandBook_v3_Final.pdf
           Type/format: PDF, 48 pages
           Role: Primary brand book (print + digital)
           Notes: Includes logo usage, colour system, typography, imagery guidelines.

       Oreo_Campaign_Concepts_x3.pdf
           Type/format: PDF, 24 pages
           Role: 3 hero campaign concepts with rationale
           Notes: Each concept includes mood board, hero visual, tagline, and channel breakdown.

       Oreo_HeroVisual_Campaign1_HR.png
           Type/format: PNG, 4800×3200, 300 DPI
           Role: Hero visual — Campaign 1 "Twist of Wonder"
           Notes: Final approved artwork, CMYK + RGB versions.

       Oreo_ColourSystem_Tokens.json
           Type/format: JSON design tokens
           Role: Colour system for dev handoff
           Notes: CSS variables, Figma tokens, and Tailwind config included.

3. Delivery hash
   SHA-256: sha256_oreo2025
   Computed at: 2025-03-08T14:00:00Z

4. Escrow & Payment
   Payment amount: 5,616.72 RLUSD
   Escrow TX: F6A1B2C3D4E5...
   Escrow sequence: 12350
   Released: 2025-03-10T11:30:00Z

5. License Terms
   Rights granted: Use in global brand communications, packaging, digital, and print advertising
   Territory: Worldwide
   Duration: Perpetual
   Exclusivity: Exclusive to Mondelez International
   Modifications: Allowed with creator credit
   Sublicensing: Not permitted
   Royalties: None (full buyout)
   Revocation: Non-revocable after payment release`,
      deliverable_files: [
        { name: 'Oreo_BrandBook_v3_Final.pdf', format: 'PDF, 48 pages', role: 'Primary brand book', notes: 'Logo usage, colour system, typography, imagery guidelines.' },
        { name: 'Oreo_Campaign_Concepts_x3.pdf', format: 'PDF, 24 pages', role: '3 hero campaign concepts', notes: 'Mood boards, hero visuals, taglines, channel breakdowns.' },
        { name: 'Oreo_HeroVisual_Campaign1_HR.png', format: 'PNG, 4800×3200, 300 DPI', role: 'Hero visual — Campaign 1', notes: 'Final approved artwork, CMYK + RGB.' },
        { name: 'Oreo_ColourSystem_Tokens.json', format: 'JSON design tokens', role: 'Colour system for dev', notes: 'CSS variables, Figma tokens, Tailwind config.' },
      ],
    },
    mint_tx_hash: 'TX005MNO...',
    minted_at: '2025-03-10T11:30:00Z',
  },
];

// --- Demo Transactions ---
export const demoTransactions: TransactionRecord[] = [
  {
    id: 'tx-001',
    tx_hash: 'F6E5D4C3B2A1...',
    tx_type: 'EscrowFinish',
    from_address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    to_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    amount: '800',
    currency: 'RLUSD',
    contract_id: 'c-001',
    milestone_id: 'm-001',
    status: 'confirmed',
    ledger_index: 45678901,
    created_at: '2025-02-14T09:05:00Z',
  },
  {
    id: 'tx-002',
    tx_hash: 'A1B2C3D4...',
    tx_type: 'EscrowFinish',
    from_address: 'rN7n3473SaZBCG4dFL83w7p1W9cgPBKaq6',
    to_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    amount: '2000',
    currency: 'XRP',
    contract_id: 'c-003',
    milestone_id: 'm-005',
    status: 'confirmed',
    ledger_index: 45678800,
    created_at: '2025-01-29T09:05:00Z',
  },
  {
    id: 'tx-003',
    tx_hash: 'B2C3D4E5F6A1...',
    tx_type: 'EscrowCreate',
    from_address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    to_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    amount: '1200',
    currency: 'RLUSD',
    contract_id: 'c-001',
    milestone_id: 'm-002',
    status: 'confirmed',
    ledger_index: 45678850,
    created_at: '2025-02-05T14:00:00Z',
  },
  {
    id: 'tx-004',
    tx_hash: 'D4E5F6A1B2C3...',
    tx_type: 'EscrowCreate',
    from_address: 'rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv',
    to_address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    amount: '1500',
    currency: 'RLUSD',
    contract_id: 'c-002',
    milestone_id: 'm-004',
    status: 'confirmed',
    ledger_index: 45678860,
    created_at: '2025-02-12T14:00:00Z',
  },
];

// --- Demo Dashboard Stats ---
export const demoStats = {
  totalEarned: '6,250.50',
  totalEarnedCurrency: 'RLUSD',
  activeContracts: 2,
  escrowHeld: '3,700.00',
  escrowHeldCurrency: 'RLUSD',
  workCredentials: 2,
  completedJobs: 3,
  avgRating: 4.7,
};

// --- Demo Marketplace Names (for display) ---
export const demoClients: Record<string, string> = {
  'u-002': 'TechCo Inc.',
  'u-003': 'StartupXYZ',
  'u-004': 'FitTrack Labs',
  'u-005': 'DeFi Protocol',
  'u-006': 'Mondelez International',
};

// --- Demo Contract Messages ---
// Keyed by contract_id for easy lookup
export const demoMessages: Record<string, ContractMessage[]> = {
  'c-001': [
    {
      id: 'msg-001',
      contract_id: 'c-001',
      milestone_id: 'm-001',
      sender_id: 'u-001',
      type: 'deliverable_submit',
      content: 'Deliverable submitted for review.',
      attachments: [],
      metadata: {
        media_url: 'https://img.freepik.com/premium-photo/ethereal-cipher-gorgeous-geisha-ghost-shell-code-generative-ai_978425-847.jpg?w=996',
        media_hash: 'sha256_abc123',
        doc_url: null,
        doc_hash: null,
        notes: 'Design system and wireframes package ready for review.',
      },
      read_by: ['u-001', 'u-002'],
      created_at: '2025-02-13T10:00:00Z',
      sender: { display_name: 'Alice Martin', avatar_url: null, role: 'creator' },
    },
  ],
  'c-005': [
    {
      id: 'msg-010',
      contract_id: 'c-005',
      milestone_id: 'm-006',
      sender_id: 'u-006',
      type: 'message',
      content: 'Welcome aboard Alice. Looking forward to the creative direction package for the Oreo brand refresh.',
      attachments: [],
      metadata: {},
      read_by: ['u-006', 'u-001'],
      created_at: '2025-02-20T09:00:00Z',
      sender: { display_name: 'Mondelez International', avatar_url: null, role: 'marketplace' },
    },
    {
      id: 'msg-011',
      contract_id: 'c-005',
      milestone_id: 'm-006',
      sender_id: 'u-001',
      type: 'message',
      content: 'Thank you! Excited to work on this. I\'ll start with mood boards and initial concepts this week.',
      attachments: [],
      metadata: {},
      read_by: ['u-001', 'u-006'],
      created_at: '2025-02-20T10:30:00Z',
      sender: { display_name: 'Alice Martin', avatar_url: null, role: 'creator' },
    },
    {
      id: 'msg-012',
      contract_id: 'c-005',
      milestone_id: 'm-006',
      sender_id: 'u-001',
      type: 'deliverable_submit',
      content: 'Brand creative direction package submitted — includes brand book, 3 campaign concepts, hero visual, and colour system tokens.',
      attachments: [],
      metadata: {
        media_url: 'https://img.freepik.com/premium-photo/ethereal-cipher-gorgeous-geisha-ghost-shell-code-generative-ai_978425-847.jpg?w=996',
        media_hash: 'sha256_oreo2025',
        doc_url: null,
        doc_hash: null,
        notes: 'Full creative direction delivery. All files included.',
      },
      read_by: ['u-001', 'u-006'],
      created_at: '2025-03-08T14:00:00Z',
      sender: { display_name: 'Alice Martin', avatar_url: null, role: 'creator' },
    },
    {
      id: 'msg-013',
      contract_id: 'c-005',
      milestone_id: 'm-006',
      sender_id: 'u-006',
      type: 'message',
      content: 'Exceptional creative vision. Delivered on time with zero revisions needed. Releasing escrow now.',
      attachments: [],
      metadata: {},
      read_by: ['u-006', 'u-001'],
      created_at: '2025-03-09T10:00:00Z',
      sender: { display_name: 'Mondelez International', avatar_url: null, role: 'marketplace' },
    },
  ],
};
