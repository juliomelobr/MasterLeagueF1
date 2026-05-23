-- =====================================================
-- ADICIONAR COLUNA GAMERTAG NA TABELA PILOTOS
-- =====================================================
-- Esta coluna armazena a gamertag/ID do piloto
-- =====================================================

-- Adicionar coluna gamertag
ALTER TABLE pilotos 
ADD COLUMN IF NOT EXISTS gamertag VARCHAR;

-- Criar índice para melhorar buscas por gamertag
CREATE INDEX IF NOT EXISTS idx_pilotos_gamertag ON pilotos(gamertag);

-- Comentário da coluna
COMMENT ON COLUMN pilotos.gamertag IS 'Gamertag ou ID do piloto (ex: Xbox Gamertag, PSN ID, etc)';




































