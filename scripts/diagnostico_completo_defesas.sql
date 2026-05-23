-- =====================================================
-- DIAGNÓSTICO COMPLETO: Por que defesas não estão sendo salvas
-- =====================================================

-- PASSO 1: VERIFICAR SE POLÍTICA RLS PARA PILOTOS FOI APLICADA
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✅ POLÍTICA RLS APLICADA'
        ELSE '❌ POLÍTICA RLS FALTANDO - PRECISA APLICAR scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql'
    END as status_rls
FROM pg_policies
WHERE tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';

-- PASSO 2: VERIFICAR ESTADO DOS REGISTROS DAS DEFESAS ENVIADAS
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status_atual,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'acusado'->>'nome' as acusado,
    dados->'acusado'->>'email' as email_acusado,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' IN ('STW-L2012', 'STW-L2007', 'STW-L2016');

-- PASSO 3: CONTAR DEFESAS POR STATUS
SELECT
    dados->>'status' as status,
    COUNT(*) as quantidade
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
GROUP BY dados->>'status';

-- PASSO 4: VERIFICAR SE HÁ DEFESAS RECENTES (2025)
SELECT
    COUNT(*) as defesas_2025
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND dados->'defesa'->>'dataEnvioDefesa' >= '2025-01-01';

-- =====================================================
-- ANÁLISE DOS RESULTADOS:
--
-- SE RLS NÃO ESTIVER APLICADA:
-- → Execute: scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql
--
-- SE RLS ESTIVER APLICADA MAS DEFESAS NÃO SALVAM:
-- → Verificar console do navegador por erros
-- → Verificar se usuário está logado corretamente
-- → Testar update manual (ver próximo arquivo)
-- =====================================================
-- Execute estes comandos para diagnóstico completo
-- =====================================================