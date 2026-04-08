-- Claude Knowledge Base — local queryable index via mcp__postgres
-- Run once: psql -U postgres -d meditrack -f scripts/init-claude-knowledge.sql
-- Or via MCP: mcp__postgres__query with this SQL

CREATE SCHEMA IF NOT EXISTS claude;

CREATE TABLE IF NOT EXISTS claude.knowledge (
    id          SERIAL PRIMARY KEY,
    category    TEXT NOT NULL CHECK (category IN (
        'fix',          -- Bug fix: what broke, why, how fixed
        'principle',    -- User/team preference: coding style, workflow, communication
        'pattern',      -- Code pattern: reusable approach discovered in this project
        'decision',     -- Architectural decision: what was chosen and why
        'gotcha',       -- Non-obvious pitfall: things that surprised us
        'endpoint',     -- API endpoint: method, path, purpose
        'component',    -- UI component: name, location, purpose
        'service'       -- Backend service/class: name, location, purpose
    )),
    key         TEXT NOT NULL,           -- Short identifier (e.g., "stale-closure-in-auth-callback")
    value       TEXT NOT NULL,           -- The knowledge content (markdown OK)
    tags        TEXT[] DEFAULT '{}',     -- Searchable tags (e.g., {"frontend", "react", "hooks"})
    source      TEXT,                    -- Where this came from (file path, PR #, conversation)
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    created_by  TEXT DEFAULT 'claude',   -- Who added it
    UNIQUE(category, key)
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_search
    ON claude.knowledge USING GIN (to_tsvector('english', key || ' ' || value));

-- Category + tags index
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON claude.knowledge (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON claude.knowledge USING GIN (tags);

-- Upsert function: insert or update by category+key
CREATE OR REPLACE FUNCTION claude.upsert_knowledge(
    p_category TEXT, p_key TEXT, p_value TEXT,
    p_tags TEXT[] DEFAULT '{}', p_source TEXT DEFAULT NULL, p_created_by TEXT DEFAULT 'claude'
) RETURNS void AS $$
BEGIN
    INSERT INTO claude.knowledge (category, key, value, tags, source, created_by)
    VALUES (p_category, p_key, p_value, p_tags, p_source, p_created_by)
    ON CONFLICT (category, key) DO UPDATE SET
        value = EXCLUDED.value,
        tags = EXCLUDED.tags,
        source = EXCLUDED.source,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Search function: full-text + category + tag filtering
CREATE OR REPLACE FUNCTION claude.search_knowledge(
    p_query TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_tag TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20
) RETURNS TABLE(category TEXT, key TEXT, value TEXT, tags TEXT[], source TEXT, updated_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT k.category, k.key, k.value, k.tags, k.source, k.updated_at
    FROM claude.knowledge k
    WHERE (p_category IS NULL OR k.category = p_category)
      AND (p_tag IS NULL OR p_tag = ANY(k.tags))
      AND (p_query IS NULL OR to_tsvector('english', k.key || ' ' || k.value) @@ plainto_tsquery('english', p_query))
    ORDER BY
        CASE WHEN p_query IS NOT NULL
            THEN ts_rank(to_tsvector('english', k.key || ' ' || k.value), plainto_tsquery('english', p_query))
            ELSE 0 END DESC,
        k.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
