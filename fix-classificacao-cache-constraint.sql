-- Script para garantir que a constraint única está correta na tabela classificacao_cache
-- Execute este script no Supabase SQL Editor se o erro persistir

-- Remover constraint única existente se houver (caso não esteja nomeada corretamente)
ALTER TABLE classificacao_cache 
DROP CONSTRAINT IF EXISTS classificacao_cache_grid_season_key;

-- Criar constraint única nomeada explicitamente
ALTER TABLE classificacao_cache 
ADD CONSTRAINT classificacao_cache_grid_season_unique UNIQUE (grid, season);

-- Verificar se a constraint foi criada
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'classificacao_cache'::regclass
AND contype = 'u';







