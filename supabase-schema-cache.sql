-- =====================================================
-- SCHEMA DE CACHE PARA DADOS DO GOOGLE SHEETS
-- =====================================================
-- Este schema cria tabelas de cache para armazenar dados
-- sincronizados do Google Sheets, melhorando performance
-- e garantindo integridade dos dados.

-- Tabela de cache de classificação
CREATE TABLE IF NOT EXISTS classificacao_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grid VARCHAR NOT NULL, -- 'carreira' ou 'light'
    season INTEGER NOT NULL,
    data JSONB NOT NULL, -- Dados completos da classificação
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sheet_url VARCHAR,
    sheet_gid VARCHAR,
    data_hash VARCHAR, -- Hash dos dados para detectar mudanças
    UNIQUE(grid, season)
);

-- Tabela de cache de Power Ranking
CREATE TABLE IF NOT EXISTS power_ranking_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data JSONB NOT NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sheet_url VARCHAR,
    data_hash VARCHAR -- Hash dos dados para detectar mudanças
);

-- Tabela de cache de calendário
CREATE TABLE IF NOT EXISTS calendario_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season INTEGER NOT NULL,
    data JSONB NOT NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sheet_url VARCHAR,
    data_hash VARCHAR, -- Hash dos dados para detectar mudanças
    UNIQUE(season)
);

-- Tabela de cache de tracks
CREATE TABLE IF NOT EXISTS tracks_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data JSONB NOT NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sheet_url VARCHAR,
    data_hash VARCHAR -- Hash dos dados para detectar mudanças
);

-- Tabela de cache de Minicup
CREATE TABLE IF NOT EXISTS minicup_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data JSONB NOT NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sheet_url VARCHAR,
    data_hash VARCHAR -- Hash dos dados para detectar mudanças
);

-- Log de sincronizações
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR NOT NULL, -- 'google_sheets'
    sheet_name VARCHAR,
    sheet_gid VARCHAR,
    status VARCHAR NOT NULL, -- 'success', 'error', 'partial'
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_classificacao_grid_season ON classificacao_cache(grid, season);
CREATE INDEX IF NOT EXISTS idx_classificacao_last_synced ON classificacao_cache(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_power_ranking_last_synced ON power_ranking_cache(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendario_season ON calendario_cache(season);
CREATE INDEX IF NOT EXISTS idx_calendario_last_synced ON calendario_cache(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_last_synced ON tracks_cache(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_minicup_last_synced ON minicup_cache(last_synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_sheet_gid ON sync_log(sheet_gid);

-- Row Level Security (RLS)
ALTER TABLE classificacao_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_ranking_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE minicup_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Policies: Todos podem ler os caches (dados públicos)
CREATE POLICY classificacao_cache_read ON classificacao_cache FOR SELECT USING (true);
CREATE POLICY power_ranking_cache_read ON power_ranking_cache FOR SELECT USING (true);
CREATE POLICY calendario_cache_read ON calendario_cache FOR SELECT USING (true);
CREATE POLICY tracks_cache_read ON tracks_cache FOR SELECT USING (true);
CREATE POLICY minicup_cache_read ON minicup_cache FOR SELECT USING (true);

-- Apenas service role pode escrever nos caches (via Edge Functions)
-- Nota: As Edge Functions usarão service_role key, então essas policies
-- serão aplicadas apenas para operações diretas do cliente

-- Policies para sync_log: Apenas admins podem ler
CREATE POLICY sync_log_read ON sync_log FOR SELECT USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);

-- Comentários para documentação
COMMENT ON TABLE classificacao_cache IS 'Cache de dados de classificação sincronizados do Google Sheets';
COMMENT ON TABLE power_ranking_cache IS 'Cache de dados de Power Ranking sincronizados do Google Sheets';
COMMENT ON TABLE calendario_cache IS 'Cache de dados de calendário sincronizados do Google Sheets';
COMMENT ON TABLE tracks_cache IS 'Cache de dados de tracks/circuitos sincronizados do Google Sheets';
COMMENT ON TABLE minicup_cache IS 'Cache de dados da Minicup sincronizados do Google Sheets';
COMMENT ON TABLE sync_log IS 'Log de todas as sincronizações realizadas para auditoria';










































