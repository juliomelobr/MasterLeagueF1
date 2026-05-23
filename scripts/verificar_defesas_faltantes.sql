-- =====================================================
-- VERIFICAR: Por que STW-L2007 e STW-L2016 não aparecem
-- =====================================================

-- 1. VERIFICAR SE OS REGISTROS EXISTEM (mesmo sem defesa)
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'acusado'->>'nome' as acusado,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' IN ('STW-L2007', 'STW-L2016', 'STW-L2012')
ORDER BY dados->>'codigoLance';

-- 2. VERIFICAR TODAS AS ACUSAÇÕES CONTRA JOÃO DARTH
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'acusado'->>'nome' as acusado,
    dados->'acusado'->>'email' as email_acusado,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->'acusado'->>'nome' ILIKE '%JOÃO DARTH%'
ORDER BY created_at DESC;

-- 3. CONTAR TOTAL DE ACUSAÇÕES
SELECT COUNT(*) as total_acusacoes
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao';

-- 4. VERIFICAR SE HÁ REGISTROS RECENTES SEM DEFESA
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    dados->'acusado'->>'nome' as acusado,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NULL
  AND dados->>'status' = 'aguardando_defesa'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- ANÁLISE:
-- - Se query 1 não mostra STW-L2007 e STW-L2016: registros não existem
-- - Se query 2 mostra mas sem defesa: defesas não foram salvas
-- - Se query 4 mostra muitos: há acusações aguardando defesa
-- =====================================================