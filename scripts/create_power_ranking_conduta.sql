-- Criar tabela POWER_RANKING_CONDUTA
-- Checklist de conduta por piloto/etapa para cálculo do Pilar 02 do Power Ranking

CREATE TABLE IF NOT EXISTS power_ranking_conduta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piloto_id UUID NOT NULL REFERENCES pilotos(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    round INTEGER NOT NULL,
    
    -- Flags de infração (por etapa, exceto foto_oficial)
    foto_oficial_enviada BOOLEAN DEFAULT false, -- Único por temporada
    lista_presenca_respondida BOOLEAN DEFAULT true,
    telemetria_fechada BOOLEAN DEFAULT false,
    numeracao_errada BOOLEAN DEFAULT false,
    defesa_nao_enviada BOOLEAN DEFAULT false,
    falta_wo BOOLEAN DEFAULT false, -- Detecção automática
    nc BOOLEAN DEFAULT false, -- Pilar 01: Performance (+1 ponto)
    punish_race BOOLEAN DEFAULT false, -- Pilar 01: Performance (+1 ponto)
    
    -- Metadados
    pontos_descontados DECIMAL(5,2) DEFAULT 0, -- Total de pontos descontados nesta etapa
    observacoes TEXT, -- Notas dos Stewards
    steward_id UUID REFERENCES pilotos(id), -- Quem marcou (se manual)
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(piloto_id, season, round) -- Um registro por piloto/etapa
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conduta_piloto_season ON power_ranking_conduta(piloto_id, season);
CREATE INDEX IF NOT EXISTS idx_conduta_season_round ON power_ranking_conduta(season, round);
CREATE INDEX IF NOT EXISTS idx_conduta_piloto_season_round ON power_ranking_conduta(piloto_id, season, round);

-- Habilitar RLS
ALTER TABLE power_ranking_conduta ENABLE ROW LEVEL SECURITY;

-- Policy: Stewards podem ler e escrever tudo
CREATE POLICY power_ranking_conduta_all ON power_ranking_conduta
    FOR ALL
    USING (
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1) = true
    )
    WITH CHECK (
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1) = true
    );

-- Policy: Todos podem ler (para visualização pública futura)
CREATE POLICY power_ranking_conduta_read ON power_ranking_conduta
    FOR SELECT
    USING (true);

-- Comentários
COMMENT ON TABLE power_ranking_conduta IS 'Checklist de conduta por piloto/etapa para cálculo do Pilar 02 do Power Ranking';
COMMENT ON COLUMN power_ranking_conduta.foto_oficial_enviada IS 'Flag único por temporada (não por etapa)';
COMMENT ON COLUMN power_ranking_conduta.lista_presenca_respondida IS 'Flag por etapa - default true';
COMMENT ON COLUMN power_ranking_conduta.falta_wo IS 'Detecção automática - se piloto não aparece em resultados da etapa';
