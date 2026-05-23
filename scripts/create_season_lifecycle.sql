-- =============================================================================
-- Ciclo de temporada (MLF1) — configuração global + auditoria
-- Idempotente: pode ser reexecutado com segurança.
--
-- Chaves em app_config:
--   current_season        — temporada “ativa” do site (ex.: 21)
--   season_phase          — OPEN | CLOSED | PRE_SEASON
--   last_closed_season    — última temporada encerrada oficialmente (ex.: 20)
--   phase_updated_at      — ISO 8601 da última mudança de fase
--
-- Transições sugeridas no painel ADM:
--   Fechar temporada   → CLOSED, last_closed = current_season
--   Pré-temporada      → PRE_SEASON (permanece last_closed)
--   Mudar temporada    → OPEN, current_season incrementada (nova temporada)
--   Abrir temporada    → OPEN (ajuste manual de current_season se necessário)
--
-- Segurança: o painel ADM usa cliente Supabase como anon (auth por senha própria).
-- POLÍTICAS EM app_config / season_lifecycle_events SEGUEM O MESMO MODELO —
-- REVISE EM PRODUÇÃO (ideal: service role ou Edge Function).
-- =============================================================================

-- Garantir tabela app_config (key/value) — usada também por inscrições e senha ADM
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bases antigas só com (key, value): garantir coluna no schema public (evita 42703 no INSERT/upsert)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'app_config'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.app_config ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

COMMENT ON TABLE app_config IS 'Configurações chave/valor (temporada, fases, senhas administrativas, etc.)';

-- Seed / defaults do ciclo (só key+value: funciona mesmo se updated_at acabou de ser criada com DEFAULT)
INSERT INTO app_config (key, value)
VALUES
    ('current_season', '20'),
    ('season_phase', 'OPEN'),
    ('last_closed_season', '19'),
    ('phase_updated_at', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

-- Eventos de auditoria
CREATE TABLE IF NOT EXISTS season_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_phase TEXT,
    to_phase TEXT NOT NULL,
    season_before INTEGER,
    season_after INTEGER,
    last_closed_before INTEGER,
    last_closed_after INTEGER,
    triggered_by TEXT DEFAULT 'admin_panel',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_lifecycle_events_created
    ON season_lifecycle_events (created_at DESC);

COMMENT ON TABLE season_lifecycle_events IS 'Auditoria das transições de fase de temporada';

ALTER TABLE season_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Leitura pública (site precisa ler fase sem login)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'season_lifecycle_events' AND policyname = 'season_lifecycle_events_select_all'
    ) THEN
        CREATE POLICY season_lifecycle_events_select_all
            ON season_lifecycle_events FOR SELECT
            USING (true);
    END IF;
END $$;

-- Inserção anon (painel ADM)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'season_lifecycle_events' AND policyname = 'season_lifecycle_events_insert_anon'
    ) THEN
        CREATE POLICY season_lifecycle_events_insert_anon
            ON season_lifecycle_events FOR INSERT TO anon
            WITH CHECK (true);
    END IF;
END $$;

-- app_config: leitura pública (já usada no formulário de inscrição)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'app_config' AND policyname = 'app_config_select_public'
    ) THEN
        CREATE POLICY app_config_select_public
            ON app_config FOR SELECT
            USING (true);
    END IF;
END $$;

-- Insert/Update anon — painel ADM (sem DELETE aberto)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'app_config' AND policyname = 'app_config_insert_anon'
    ) THEN
        CREATE POLICY app_config_insert_anon
            ON app_config FOR INSERT TO anon
            WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'app_config' AND policyname = 'app_config_update_anon'
    ) THEN
        CREATE POLICY app_config_update_anon
            ON app_config FOR UPDATE TO anon
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
