// ============================================
// XRPL Client — Connection Manager
// ============================================
// This file handles connecting to the XRP Ledger.
// Think of it like opening a phone line to the blockchain.
//
// The singleton client auto-reconnects on disconnect.
// When the connection drops, xrpl.js fires 'disconnected' — we null the
// reference so the next getXrplClient() call creates a fresh connection.
// Once reconnected, we emit 'connected' so the transaction listener can
// re-subscribe to accounts it was watching.

import { Client } from 'xrpl';
import { XRPL_CONFIG } from '@/config/constants';

// Which network are we on? (testnet for development, mainnet for real)
const network = (process.env.NEXT_PUBLIC_XRPL_NETWORK || 'testnet') as keyof typeof XRPL_CONFIG;
const config = XRPL_CONFIG[network];

// Singleton pattern — we only want ONE connection open at a time
let client: Client | null = null;

// Reconnection callbacks — registered by the listener module
type ReconnectCallback = () => void | Promise<void>;
const reconnectCallbacks: Set<ReconnectCallback> = new Set();

/**
 * Register a callback to be invoked when the XRPL client reconnects.
 * The transaction listener uses this to re-subscribe to accounts.
 */
export function onReconnect(cb: ReconnectCallback): () => void {
  reconnectCallbacks.add(cb);
  // Return unsubscribe function
  return () => { reconnectCallbacks.delete(cb); };
}

/**
 * Get a connected XRPL client.
 * If we already have a connection, reuse it. Otherwise, create a new one.
 *
 * Usage:
 *   const client = await getXrplClient();
 *   // now you can talk to the XRPL
 */
export async function getXrplClient(): Promise<Client> {
  if (client && client.isConnected()) {
    return client;
  }

  const isReconnection = client !== null; // had a client before → this is a reconnect
  client = new Client(config.wss);
  await client.connect();

  // Auto-reconnect if the connection drops
  client.on('disconnected', () => {
    console.log('[XRPL] Disconnected. Will reconnect on next request.');
    client = null;
  });

  console.log(`[XRPL] Connected to ${network} (${config.wss})`);

  // Notify listeners so they can re-subscribe to accounts
  if (isReconnection && reconnectCallbacks.size > 0) {
    console.log(`[XRPL] Reconnected — notifying ${reconnectCallbacks.size} listener(s).`);
    for (const cb of Array.from(reconnectCallbacks)) {
      try { await cb(); } catch (err) {
        console.error('[XRPL] Reconnect callback failed:', err);
      }
    }
  }

  return client;
}

/**
 * Cleanly disconnect from XRPL.
 * Call this when shutting down the server.
 */
export async function disconnectXrpl(): Promise<void> {
  if (client && client.isConnected()) {
    await client.disconnect();
    client = null;
    console.log('[XRPL] Disconnected.');
  }
}

/**
 * Get the current network configuration.
 */
export function getNetworkConfig() {
  return { network, ...config };
}
