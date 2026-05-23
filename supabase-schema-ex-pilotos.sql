-- =====================================================
-- ADICIONAR CAMPOS PARA EX-PILOTOS NA TABELA PILOTOS
-- =====================================================
-- Este script adiciona campos necessários para suportar
-- ex-pilotos no sistema
-- =====================================================

-- Adicionar coluna status (ativo/inativo)
ALTER TABLE pilotos 
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'ativo';

-- Adicionar coluna senha (hash da senha para ex-pilotos)
ALTER TABLE pilotos 
ADD COLUMN IF NOT EXISTS senha_hash VARCHAR;

-- Adicionar coluna tipo_piloto (ativo/ex-piloto)
ALTER TABLE pilotos 
ADD COLUMN IF NOT EXISTS tipo_piloto VARCHAR DEFAULT 'ativo';

-- Adicionar coluna nome_piloto_historico (para ex-pilotos)
ALTER TABLE pilotos 
ADD COLUMN IF NOT EXISTS nome_piloto_historico VARCHAR;

-- Criar índice para melhorar buscas por status
CREATE INDEX IF NOT EXISTS idx_pilotos_status ON pilotos(status);
CREATE INDEX IF NOT EXISTS idx_pilotos_tipo ON pilotos(tipo_piloto);

-- Comentários das colunas
COMMENT ON COLUMN pilotos.status IS 'Status do piloto: ativo, inativo, pendente';
COMMENT ON COLUMN pilotos.senha_hash IS 'Hash da senha (apenas para ex-pilotos)';
COMMENT ON COLUMN pilotos.tipo_piloto IS 'Tipo: ativo ou ex-piloto';
COMMENT ON COLUMN pilotos.nome_piloto_historico IS 'Nome do piloto histórico (coluna A - Drivers da planilha Pilotos PR)';

-- Atualizar registros existentes para ter status 'ativo' e tipo_piloto 'ativo'
UPDATE pilotos 
SET status = 'ativo', tipo_piloto = 'ativo' 
WHERE status IS NULL OR tipo_piloto IS NULL;

