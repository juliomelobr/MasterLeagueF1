-- =====================================================
-- VERIFICAR O QUE ACONTECEU APÓS O UPDATE
-- =====================================================

-- 1. VERIFICAR SE O REGISTRO AINDA EXISTE
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status_atual,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa
FROM notificacoes_admin
WHERE id = '8c79122e-70a1-40b3-8167-594b49111777';

-- 2. VERIFICAR SE O REGISTRO FOI MODIFICADO
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa,
    updated_at,
    lido
FROM notificacoes_admin
WHERE dados->>'codigoLance' = 'STW-L2012';

-- 3. VERIFICAR TODOS OS REGISTROS COM DEFESA AGORA
SELECT
    COUNT(*) as total_defesas_agora
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL;

-- 4. VERIFICAR SE AGORA APARECE NO JÚRI
SELECT
    COUNT(*) as defesas_no_juri_agora
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL;

-- =====================================================
-- ANÁLISE:
-- - Se query 1 não retorna nada: registro foi deletado (improvável)
-- - Se query 2 mostra defesa SIM: RLS funcionou!
-- - Se query 4 > 0: problema resolvido!
-- =====================================================