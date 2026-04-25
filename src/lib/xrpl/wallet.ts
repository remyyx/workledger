// ============================================
// XRPL Wallet — Account Creation & Management
// ============================================
// This handles creating XRPL wallets, setting up trust lines,
// and checking balances. The "engine room" of WorkLedger.

import { Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import type { TrustSet, AccountInfoRequest } from 'xrpl';
import { getXrplClient } from './client';
import { GATEHUB_ISSUERS, RLUSD_ISSUER, RLUSD_CURRENCY, PLATFORM, STATIC_EXCHANGE_RATES } from '@/config/constants';
import { cmpAmount } from '@/lib/math';
import type { WalletBalance } from '@/types';

/**
 * Generate a new XRPL wallet (keypair).
 * This creates the cryptographic keys — the wallet doesn't exist
 * on the ledger until it's funded with the base reserve (1 XRP).
 *
 * IMPORTANT: The seed (secret) must be encrypted before storage!
 */
export function generateWallet() {
  const wallet = Wallet.generate();
  return {
    address: wallet.classicAddress,
    publicKey: wallet.publicKey,
    seed: wallet.seed!, // Encrypt this before storing anywhere!
  };
}

/**
 * Fund a new wallet on testnet using the faucet.
 * Only works on testnet — on mainnet, we'll fund from the platform wallet.
 */
export async function fundTestnetWallet(address: string) {
  const client = await getXrplClient();
  const result = await client.fundWallet(Wallet.fromSeed(address));
  return result;
}

/**
 * Set up trust lines for all supported currencies.
 * A trust line is like telling XRPL "I'm willing to hold this currency."
 * Without trust lines, you can only hold XRP.
 *
 * Each trust line costs 0.2 XRP in reserve (locked, not spent).
 */
export async function setupTrustLines(wallet: Wallet): Promise<string[]> {
  const client = await getXrplClient();
  const results: string[] = [];

  // Currencies we want to support
  const trustLines = [
    { currency: RLUSD_CURRENCY, issuer: RLUSD_ISSUER },
    { currency: 'USD', issuer: GATEHUB_ISSUERS.USD },
    { currency: 'EUR', issuer: GATEHUB_ISSUERS.EUR },
    { currency: 'USDC', issuer: GATEHUB_ISSUERS.USDC },
    { currency: 'USDT', issuer: GATEHUB_ISSUERS.USDT },
  ];

  for (const line of trustLines) {
    try {
      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: wallet.classicAddress,
        LimitAmount: {
          currency: line.currency,
          issuer: line.issuer,
          value: '1000000', // Max we'll accept (high limit)
        },
      };

      const result = await client.submitAndWait(tx, { wallet });
      results.push(`${line.currency}: ${result.result.meta?.toString()}`);
    } catch (error) {
      console.error(`[XRPL] Failed to set trust line for ${line.currency}:`, error);
      results.push(`${line.currency}: FAILED`);
    }
  }

  return results;
}

/**
 * Get all balances for a wallet address.
 * Returns XRP + all issued currency balances.
 */
export async function getBalances(address: string): Promise<WalletBalance[]> {
  const client = await getXrplClient();
  const balances: WalletBalance[] = [];

  try {
    // Get XRP balance
    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    } as AccountInfoRequest);

    const xrpBalanceRaw = dropsToXrp(accountInfo.result.account_data.Balance);
    const xrpBalance = String(xrpBalanceRaw);
    const reservedXrp = PLATFORM.BASE_RESERVE_XRP +
      (accountInfo.result.account_data.OwnerCount * PLATFORM.OWNER_RESERVE_XRP);

    const xrpUsd = parseFloat(xrpBalance) / (STATIC_EXCHANGE_RATES['XRP'] ?? 1);
    balances.push({
      currency: 'XRP',
      value: xrpBalance,
      display_value: `${parseFloat(xrpBalance).toFixed(2)} XRP`,
      usd_equivalent: xrpUsd,
    });

    // Get issued currency balances (trust line balances)
    const lines = await client.request({
      command: 'account_lines',
      account: address,
      ledger_index: 'validated',
    });

    for (const line of lines.result.lines) {
      const lineUsd = parseFloat(line.balance) / (STATIC_EXCHANGE_RATES[line.currency] ?? 1);
      balances.push({
        currency: line.currency,
        value: line.balance,
        issuer: line.account,
        display_value: `${parseFloat(line.balance).toFixed(2)} ${line.currency}`,
        usd_equivalent: lineUsd,
      });
    }
  } catch (error: any) {
    // Account not found means it hasn't been funded yet
    if (error.data?.error === 'actNotFound') {
      balances.push({
        currency: 'XRP',
        value: '0',
        display_value: '0.00 XRP',
        usd_equivalent: 0,
      });
    } else {
      throw error;
    }
  }

  return balances;
}

/**
 * Check if a wallet has sufficient balance for a transaction.
 */
export async function hasBalance(
  address: string,
  currency: string,
  amount: string,
  issuer?: string
): Promise<boolean> {
  const balances = await getBalances(address);
  const balance = balances.find(b =>
    b.currency === currency && (issuer ? b.issuer === issuer : true)
  );

  if (!balance) return false;
  return cmpAmount(balance.value, amount) >= 0;
}
