-- =====================================================
-- ADICIONAR COLUNA cod_idml NA TABELA PILOTOS
-- =====================================================
-- Este script adiciona a coluna cod_idml para armazenar
-- o COD IDML da planilha "Pilotos PR"
-- =====================================================

-- Adicionar coluna cod_idml (se não existir)
ALTER TABLE pilotos 
ADD COLUMN IF NOT EXISTS cod_idml VARCHAR;

-- Criar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_pilotos_cod_idml ON pilotos(cod_idml);

-- Comentário da coluna
COMMENT ON COLUMN pilotos.cod_idml IS 'COD IDML da planilha Pilotos PR (ex: MLF1-0001)';




































