# Skill: MCC Mint Verification

**Trigger**: "MCC not minted", "credential missing", "NFT not showing", "token not in portfolio"

## Context
MCC = Minted Craft Credential. Implemented as XRPL XLS-20 NFTs with 4 taxons:
- Taxon 1: Work Credential (issued to creator on milestone release)
- Taxon 2: License (usage rights for assets)
- Taxon 3: Access Pass (membership/loyalty)
- Taxon 4: Client Completion (issued to marketplace on milestone release)

On milestone release, both T1 (creator) and T4 (marketplace) are auto-minted.

## Verification Steps

1. **Check nft_registry in database**
   - Query by `contract_id` + `milestone_id`
   - Expect: 2 rows (T1 for creator, T4 for marketplace)
   - Check `mint_tx_hash` — null means mock-minted (test mode), populated means on-chain

2. **For test mode (NEXT_PUBLIC_SKIP_AUTH=true)**
   - Mock mint writes directly to `nft_registry` with `mint_tx_hash = 'test_mock_...'`
   - No on-chain transaction — the row is purely a DB record
   - `/api/test/milestones/release` handles this
   - Check: did the release endpoint actually run the mock mint code path?

3. **For production mode**
   - `mintWorkCredentialOnRelease()` in `src/lib/xrpl/mint-credential.ts`
   - Calls `MCCtokenMint()` from `src/lib/xrpl/nft.ts`
   - Requires platform wallet seed (`XRPL_PLATFORM_SECRET`) — mints from platform account
   - MCC metadata includes: contract terms, deliverable hash, license conditions
   - After mint: `MCCtokenCreateOffer()` to transfer the token to the creator/marketplace

4. **Check on-chain**
   - `getMCCs(address)` returns all NFTokens owned by an address
   - Filter by taxon to find the relevant credential
   - Cross-reference `NFTokenID` with `nft_registry.nft_token_id`

5. **Common failure modes**
   - **Platform wallet has no XRP**: Minting costs ~12 drops + reserve. Check platform balance.
   - **Missing trust lines on platform**: If minting involves issued currency fees.
   - **taxon mismatch**: Code uses `MCC_TAXONS.WORK_CREDENTIAL` (1) and `MCC_TAXONS.CLIENT_COMPLETION` (4). If wrong taxon is passed, MCC mints but with wrong type.
   - **Offer not created**: Token minted to platform but `MCCtokenCreateOffer` failed → token stuck on platform account, user doesn't see it.
   - **DB row not created**: On-chain mint succeeded but nft_registry insert failed → orphaned on-chain token.

6. **Verify the full chain**
   ```
   Milestone released
     → mintWorkCredentialOnRelease() called
       → MCCtokenMint() → on-chain tx → NFTokenID
       → MCCtokenCreateOffer() → offer for creator/marketplace
       → INSERT into nft_registry (nft_token_id, mint_tx_hash, taxon, owner, etc.)
     → n8n.mccMinted() fired
   ```

## Resolution Patterns
- If DB row missing but on-chain exists: manually insert into nft_registry
- If on-chain missing but DB says minted: check tx_hash in transaction_log — was it actually submitted?
- If offer not accepted: user needs to accept the NFToken offer to see it in their wallet
- For test mode debugging: check `/api/test/milestones/release` response — it returns the mock MCC data
