-- Keep retired Discord-only identities as aliases when the same person proves
-- both accounts. Existing sessions resolve to the shared canonical account.
ALTER TABLE wiki_users ADD COLUMN canonical_id TEXT REFERENCES wiki_users(github_id);
ALTER TABLE wiki_users ADD COLUMN display_name TEXT;
