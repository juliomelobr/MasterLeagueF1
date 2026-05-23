-- Script para adicionar a coluna cod_idml à tabela draft_pilotos
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna cod_idml se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'draft_pilotos' 
        AND column_name = 'cod_idml'
    ) THEN
        ALTER TABLE draft_pilotos 
        ADD COLUMN cod_idml VARCHAR(50);
        
        RAISE NOTICE 'Coluna cod_idml adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna cod_idml já existe na tabela.';
    END IF;
END $$;

-- Criar índice para melhorar performance nas buscas
CREATE INDEX IF NOT EXISTS idx_draft_pilotos_cod_idml ON draft_pilotos(cod_idml);

-- Comentário na coluna
COMMENT ON COLUMN draft_pilotos.cod_idml IS 'Código único do piloto na liga (ex: MLF1-0115)';








