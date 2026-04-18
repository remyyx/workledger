# Skill: Migration Generator

**Trigger**: "new table", "add column", "migration", "schema change", "database change"

## Context
Supabase migrations live in `supabase/migrations/`. Currently 001 through 011 (no gaps). Migration numbering is the unique key in `schema_migrations` table — duplicates cause conflicts.

## Steps

1. **Check current migration number**
   - List files in `supabase/migrations/`
   - Last migration = 011 (nft_registry taxon 4 support)
   - Next migration = 012, 013, etc.

2. **Follow conventions**
   - File name: `0XX_description.sql` (e.g., `012_asset_listings.sql`)
   - UUID primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
   - Trigger for updated_at: `CREATE TRIGGER set_updated_at BEFORE UPDATE ON table_name FOR EACH ROW EXECUTE FUNCTION update_updated_at()`
   - Foreign keys: explicit `REFERENCES table(column) ON DELETE CASCADE` (or SET NULL depending on semantics)

3. **RLS policies (mandatory)**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view their own rows"
     ON table_name FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert their own rows"
     ON table_name FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update their own rows"
     ON table_name FOR UPDATE
     USING (auth.uid() = user_id);
   ```
   - Adjust policies based on who needs access (e.g., both contract parties can view a contract)
   - In dev mode, admin client bypasses RLS — but policies must still be correct for production

4. **Indexes**
   - Always index foreign keys: `CREATE INDEX idx_table_foreign_key ON table_name(foreign_key_column);`
   - Index commonly filtered columns (status, created_at, email)
   - Composite indexes for common query patterns

5. **CHECK constraints**
   - Status columns: `CHECK (status IN ('value1', 'value2', ...))` — same pattern as existing tables
   - Amount columns: store as TEXT (blockchain precision), validate format in application layer

6. **After creating migration**
   - Run `npm run db:migrate` (or `supabase db push`) to apply
   - Update METACONTEXT.md migration numbering section
   - If adding new types: update `src/types/index.ts` or run `npm run db:types`

## Known Gotchas
- Migration 006/007 were renumbered (session 2026-03-24) due to parallel Claude session conflicts — don't reuse
- `nft_registry` table name kept for DB compatibility even though UI says "MCC" — don't rename
- `role` column in users table uses `marketplace` value (not "marketmaker") — DB column stays as-is
- Supabase uses numeric prefix as unique key — never have two migrations with the same number
