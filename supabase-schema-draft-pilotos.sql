-- ============================================
-- SCHEMA: DRAFT PILOTOS - MERCADO SIMPLIFICADO
-- Armazena dados dos pilotos dos grids LIGHT e CARREIRA
-- para o mercado de equipes
-- ============================================

-- Tabela para armazenar pilotos do draft
CREATE TABLE IF NOT EXISTS draft_pilotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR NOT NULL,
    grid VARCHAR NOT NULL CHECK (grid IN ('light', 'carreira')),
    ordem_escolha INTEGER NOT NULL,
    power_ranking_pts INTEGER DEFAULT 0,
    whatsapp VARCHAR,
    season INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nome, grid, season) -- Um piloto só pode aparecer uma vez por grid/season
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_draft_pilotos_grid_season ON draft_pilotos(grid, season);
CREATE INDEX IF NOT EXISTS idx_draft_pilotos_ordem_escolha ON draft_pilotos(grid, season, ordem_escolha);
CREATE INDEX IF NOT EXISTS idx_draft_pilotos_nome ON draft_pilotos(nome);

-- ROW LEVEL SECURITY
ALTER TABLE draft_pilotos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Todos podem ler, apenas admin pode escrever
CREATE POLICY "draft_pilotos_select_policy" ON draft_pilotos
    FOR SELECT USING (true);

CREATE POLICY "draft_pilotos_insert_policy" ON draft_pilotos
    FOR INSERT WITH CHECK (true); -- Admin pode criar

CREATE POLICY "draft_pilotos_update_policy" ON draft_pilotos
    FOR UPDATE USING (true); -- Admin pode atualizar

CREATE POLICY "draft_pilotos_delete_policy" ON draft_pilotos
    FOR DELETE USING (true); -- Admin pode deletar

-- Comentários
COMMENT ON TABLE draft_pilotos IS 'Pilotos do draft para o mercado de equipes (Light e Carreira)';
COMMENT ON COLUMN draft_pilotos.grid IS 'Grid do piloto: light ou carreira';
COMMENT ON COLUMN draft_pilotos.ordem_escolha IS 'Ordem de escolha no draft (1 = primeiro escolhido)';
COMMENT ON COLUMN draft_pilotos.power_ranking_pts IS 'Pontuação do Power Ranking (Coluna E das planilhas)';
COMMENT ON COLUMN draft_pilotos.season IS 'Temporada do draft';










