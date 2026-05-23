-- =====================================================
-- DIAGNÓSTICO COMPLETO APÓS UPDATE MANUAL
-- =====================================================

-- 1. O REGISTRO AINDA EXISTE?
SELECT COUNT(*) as registro_existe
FROM notificacoes_admin
WHERE id = '8c79122e-70a1-40b3-8167-594b49111777';

-- 2. VERIFICAR SE FOI MODIFICADO
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    updated_at
FROM notificacoes_admin
WHERE dados->>'codigoLance' = 'STW-L2012';

-- 3. TODAS AS ACUSAÇÕES COM DEFESA AGORA
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
ORDER BY dados->'defesa'->>'dataEnvioDefesa' DESC;

-- 4. CONTAGEM ATUAL
SELECT
    COUNT(*) as total_acusacoes,
    SUM(CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 1 ELSE 0 END) as com_defesa,
    SUM(CASE WHEN (dados ->> 'status') = 'aguardando_analise' AND (dados ->> 'defesa') IS NOT NULL THEN 1 ELSE 0 END) as defesas_no_juri
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao';

-- =====================================================
-- INTERPRETAÇÃO DOS RESULTADOS:
--
-- Query 1 = 0: Registro foi deletado ou ID mudou
-- Query 1 = 1: Registro existe
-- Query 2 mostra defesa SIM: UPDATE funcionou
-- Query 4 mostra defesas_no_juri > 0: Problema RESOLVIDO
-- =====================================================