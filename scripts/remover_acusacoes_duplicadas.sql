-- =====================================================
-- REMOVER ACUSAÇÕES DUPLICADAS (STW-L2007 e STW-L2016)
-- Manter apenas STW-L2012 que tem defesa funcionando
-- =====================================================

-- 1. VERIFICAR OS REGISTROS ANTES DE DELETAR
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'acusado'->>'nome' as acusado,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' IN ('STW-L2007', 'STW-L2016', 'STW-L2012')
ORDER BY dados->>'codigoLance';

-- 2. DELETAR STW-L2007 (se existir)
DELETE FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2007';

-- 3. DELETAR STW-L2016 (se existir)
DELETE FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2016';

-- 4. VERIFICAR APÓS DELETAR
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'acusado'->>'nome' as acusado
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' IN ('STW-L2007', 'STW-L2016', 'STW-L2012')
ORDER BY dados->>'codigoLance';

-- 5. CONFIRMAR QUE STW-L2012 AINDA EXISTE E TEM DEFESA
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa,
    dados->'defesa'->>'descricaoDefesa' as descricao_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- =====================================================
-- RESULTADO ESPERADO:
-- - Query 4 deve retornar apenas STW-L2012
-- - Query 5 deve mostrar que STW-L2012 tem defesa e status aguardando_analise
-- =====================================================