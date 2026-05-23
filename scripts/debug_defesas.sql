-- =====================================================
-- DEBUG: Investigar por que as defesas não estão sendo salvas
-- =====================================================

-- 1. VERIFICAR POLÍTICAS RLS ATUAIS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notificacoes_admin'
ORDER BY policyname;

-- 2. VERIFICAR REGISTROS COM OS CÓDIGOS DAS DEFESAS ENVIADAS
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado_nome,
    dados->'acusado'->>'email' as acusado_email,
    dados->>'status' as status_atual,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' IN ('STW-L2012', 'STW-L2007', 'STW-L2016')
ORDER BY created_at DESC;

-- 3. VERIFICAR SE HÁ REGISTROS COM DEFESA RECENTE
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado_nome,
    dados->>'status' as status_atual,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa,
    created_at,
    updated_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND dados->'defesa'->>'dataEnvioDefesa' >= '2025-01-01'
ORDER BY dados->'defesa'->>'dataEnvioDefesa' DESC;

-- 4. VERIFICAR TODOS OS REGISTROS RECENTES COM DEFESA
SELECT
    COUNT(*) as total_registros_com_defesa,
    MIN(dados->'defesa'->>'dataEnvioDefesa') as defesa_mais_antiga,
    MAX(dados->'defesa'->>'dataEnvioDefesa') as defesa_mais_recente
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL;

-- 5. TESTAR SE A POLÍTICA RLS ESTÁ FUNCIONANDO (simular update)
-- Execute este comando como um usuário piloto para testar:
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     dados = jsonb_set(dados, '{defesa}', '{"dataEnvioDefesa": "2025-01-13T12:00:00Z", "defensor": {"nome": "TESTE"}}')
-- WHERE id = (SELECT id FROM notificacoes_admin WHERE tipo = 'nova_acusacao' AND dados->>'codigoLance' = 'STW-L2012' LIMIT 1);

-- =====================================================