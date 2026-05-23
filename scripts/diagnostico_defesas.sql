-- =====================================================
-- DIAGNÓSTICO COMPLETO: Verificar estado das defesas
-- Execute estes comandos em sequência no SQL Editor
-- =====================================================

-- 1. CONTAGEM GERAL DE ACUSAÇÕES
SELECT
    COUNT(*) as total_acusacoes,
    SUM(CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 1 ELSE 0 END) as com_defesa,
    SUM(CASE WHEN (dados ->> 'defesa') IS NULL THEN 1 ELSE 0 END) as sem_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao';

-- 2. STATUS DOS REGISTROS COM DEFESA
SELECT
    dados->>'status' as status,
    COUNT(*) as quantidade
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
GROUP BY dados->>'status';

-- 3. DETALHES DE TODAS AS DEFESAS
SELECT
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado,
    dados->'acusador'->>'nome' as acusador,
    dados->>'status' as status,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
ORDER BY dados->'defesa'->>'dataEnvioDefesa' DESC;

-- 4. VERIFICAR SE AS DEFESAS ESTÃO VISÍVEIS NO PAINEL DE VEREDICTO
SELECT
    COUNT(*) as defesas_visiveis_no_juri
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL;

-- =====================================================