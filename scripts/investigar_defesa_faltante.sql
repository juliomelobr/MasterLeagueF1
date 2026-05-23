-- =====================================================
-- INVESTIGAR: Por que ainda há 1 defesa fora do júri
-- =====================================================

-- 1. VER TODAS AS DEFESAS E SEUS STATUS
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status_atual,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'acusado'->>'nome' as acusado,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa,
    id
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
ORDER BY dados->'defesa'->>'dataEnvioDefesa' DESC;

-- 2. VERIFICAR SE HÁ ALGUM STATUS DIFERENTE
SELECT
    dados->>'status' as status,
    COUNT(*) as quantidade
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
GROUP BY dados->>'status';

-- 3. VERIFICAR SE A DEFESA FALTANTE TEM ALGUM PROBLEMA ESPECÍFICO
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    dados->'defesa'->>'defesa' as campo_defesa,
    jsonb_typeof(dados->'defesa') as tipo_campo_defesa,
    dados->'defesa'->>'dataEnvioDefesa' as data_envio
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND (dados ->> 'status') != 'aguardando_analise';

-- 4. CORREÇÃO MANUAL PARA A DEFESA ESPECÍFICA (se encontrada)
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     lido = false
-- WHERE dados->>'codigoLance' = 'CODIGO_DA_DEFESA_FALTANTE';

-- =====================================================
-- POSSÍVEIS CAUSAS:
-- - Status diferente de 'aguardando_defesa'
-- - Campo defesa mal formado
-- - Problema específico nesta defesa
-- =====================================================