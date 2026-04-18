-- ==========================================
-- Allow Taxon 4 (Client Completion Record) in nft_registry
-- ==========================================
-- Taxon 1 = Work Credential (Creator)
-- Taxon 2 = License
-- Taxon 3 = Access Pass
-- Taxon 4 = Client Completion Record (Marketplace)

ALTER TABLE nft_registry DROP CONSTRAINT IF EXISTS nft_registry_taxon_check;
ALTER TABLE nft_registry ADD CONSTRAINT nft_registry_taxon_check CHECK (taxon IN (1, 2, 3, 4));
