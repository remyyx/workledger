// ============================================
// StudioLedger Constants
// ============================================

// XRPL Network Configuration
export const XRPL_CONFIG = {
  testnet: {
    wss: 'wss://s.altnet.rippletest.net:51233',
    faucet: 'https://faucet.altnet.rippletest.net/accounts',
    explorer: 'https://testnet.xrpl.org',
  },
  mainnet: {
    wss: 'wss://xrplcluster.com',
    faucet: null,
    explorer: 'https://livenet.xrpl.org',
  },
} as const;

// RLUSD Issuer (mainnet — update when confirmed)
// WARNING: This is a PLACEHOLDER address. Must be replaced with the real
// Ripple-issued RLUSD address before mainnet launch. Trust lines set against
// a wrong issuer will prevent users from holding or transacting in RLUSD.
export const RLUSD_ISSUER = 'rMxCKbEDwqr76QuheSUMo8pKHBuoFKLz3'; // placeholder
export const RLUSD_CURRENCY = 'RLUSD';
export const RLUSD_ISSUER_IS_PLACEHOLDER = true; // flip to false once real issuer is set

/**
 * Runtime guard: throws if the app is running on mainnet with the placeholder RLUSD issuer.
 * Call this at app startup or before any RLUSD transaction.
 */
export function assertRlusdIssuerReady(): void {
  const network = process.env.NEXT_PUBLIC_XRPL_NETWORK || 'testnet';
  if (network === 'mainnet' && RLUSD_ISSUER_IS_PLACEHOLDER) {
    throw new Error(
      '[FATAL] RLUSD_ISSUER is still a placeholder. Cannot run on mainnet. ' +
      'Update RLUSD_ISSUER in src/config/constants.ts with the real Ripple-issued address.'
    );
  }
}

// GateHub Issuers (mainnet)
export const GATEHUB_ISSUERS = {
  USD: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
  EUR: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
  JPY: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
  GBP: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq',
  USDC: 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu',
  USDT: 'rcvxE9PS9YBwxtGg1qNeewV6ZB3wGubZq',
} as const;

// Platform Configuration
export const PLATFORM = {
  FEE_PERCENT: 0.98,             // 0.98% on each escrow release
  MCC_MINT_FEE: '0.1',          // 0.1 RLUSD per MCC mint
  SWAP_FEE_PERCENT: 0.1,        // 0.1% on DEX swaps
  ARBITRATION_FEE_PERCENT: 5,   // 5% from losing party
  BASE_RESERVE_XRP: 1,          // XRPL base reserve
  OWNER_RESERVE_XRP: 0.2,       // Per object on XRPL
} as const;

// MCC Taxon IDs — on-chain copyright tokens (XRPL XLS-20)
export const MCC_TAXONS = {
  WORK_CREDENTIAL: 1,
  LICENSE: 2,
  ACCESS_PASS: 3,
  CLIENT_COMPLETION: 4,
} as const;

// Contract Templates
export const CONTRACT_TEMPLATES = {
  FIXED_PRICE: 'fixed_price',
  MILESTONE: 'milestone',
  RETAINER: 'retainer',
  PAY_PER_USE: 'pay_per_use',
  LICENSE_DEAL: 'license_deal',
  SUBSCRIPTION: 'subscription',
} as const;

// Contract Status Flow
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  FUNDED: 'funded',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
} as const;

// Milestone Status Flow
export const MILESTONE_STATUS = {
  PENDING: 'pending',
  FUNDED: 'funded',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  RELEASED: 'released',
  DISPUTED: 'disputed',
} as const;

// Design — Graphic chart (UI constants)
/** Credential icon = magenta/pink (--accent-purple). Membership icon = true purple (#7f3ac6). */
export const MCC_UI_COLORS = {
  CREDENTIAL: 'var(--accent-purple)',   // magenta/pink — Portfolio / Work Credential
  MEMBERSHIP: '#7f3ac6',                // true purple — Membership Access Token
  MEMBERSHIP_BG: 'rgba(127, 58, 198, 0.18)',
  /** MCC card seal background — token-style credential card */
  CARD_BG: '#5C2C2C',
  CARD_BORDER: '#7A3A3A',
  CARD_TEXT: 'rgba(255, 255, 255, 0.95)',
  CARD_TEXT_MUTED: 'rgba(255, 255, 255, 0.65)',
} as const;

/** Radian badge: status badges with radial halo. Same glow strength for active, funded, completed, draft. Transparent bg, color + drop-shadow only. */
export const RADIAN_BADGE = {
  NAME: 'radian badge',
  GLOW_PX: [4, 10, 20] as const, // drop-shadow blur radii (px)
  STATUSES: ['active', 'funded', 'completed', 'draft'] as const,
} as const;

/** TopBar role badge: "Creator" (blue) vs "Marketmaker" (green, client). The product space is "marketplace"; the term shown in TopBar for client role is Marketmaker. CSS: --marketmaker, --marketmaker-bg, --marketmaker-glow. */
export const TOPBAR_ROLE = {
  CREATOR_LABEL: 'Creator',
  MARKETMAKER_LABEL: 'Marketmaker',
} as const;

/**
 * Static placeholder exchange rates — Phase 1 (no live price feed yet).
 * Values are USD-to-currency: 1 USD = N units of the currency.
 * To get usd_equivalent from a balance: balance / STATIC_EXCHANGE_RATES[currency]
 * Will be replaced by live DEX oracle in Phase 2.
 */
export const STATIC_EXCHANGE_RATES: Record<string, number> = {
  USD:   1,
  RLUSD: 1,
  USDC:  1,
  USDT:  1,
  XRP:   1.85,   // 1 USD ≈ 1.85 XRP (XRP ≈ $0.54) — placeholder
  EUR:   0.92,
  GBP:   0.79,
  AUD:   1.53,
  JPY:   149.5,
};

// Supported Currencies
export const CURRENCIES = [
  { code: 'XRP', name: 'XRP', type: 'native', icon: '⚡' },
  { code: 'RLUSD', name: 'RLUSD', type: 'stablecoin', icon: '💵' },
  { code: 'USD', name: 'US Dollar', type: 'fiat', icon: '🇺🇸' },
  { code: 'EUR', name: 'Euro', type: 'fiat', icon: '🇪🇺' },
  { code: 'JPY', name: 'Japanese Yen', type: 'fiat', icon: '🇯🇵' },
  { code: 'GBP', name: 'British Pound', type: 'fiat', icon: '🇬🇧' },
  { code: 'AUD', name: 'Australian Dollar', type: 'fiat', icon: '🇦🇺' },
  { code: 'USDC', name: 'USD Coin', type: 'stablecoin', icon: '🔵' },
  { code: 'USDT', name: 'Tether', type: 'stablecoin', icon: '🟢' },
] as const;
