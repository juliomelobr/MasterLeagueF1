-- =====================================================
-- ENCONTRAR O ID PARA TESTE MANUAL
-- =====================================================

-- 1. ENCONTRAR O ID DO REGISTRO STW-L2012
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status_atual,
    dados->'acusado'->>'nome' as acusado_nome,
    dados->'acusado'->>'email' as acusado_email
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 2. COPIE O ID ENCONTRADO ACIMA E USE NO COMANDO ABAIXO
-- Substitua SEU_ID_AQUI pelo ID que apareceu na query 1

-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(
--     jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     '{defesa}',
--     '{
--       "defensor": {"nome": "JOÃO DARTH", "email": "EMAIL_DO_PILOTO"},
--       "descricaoDefesa": "TESTE MANUAL - Verificar se RLS permite update",
--       "dataEnvioDefesa": "2025-01-13T12:00:00.000Z"
--     }'
--   ),
--   lido = false
-- WHERE id = SEU_ID_AQUI;

-- 3. VERIFICAR SE FUNCIONOU
-- SELECT
--     dados->>'status' as status,
--     dados->>'defesa' as defesa_existe
-- FROM notificacoes_admin
-- WHERE id = SEU_ID_AQUI;

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute a query 1 para encontrar o ID
-- 2. Copie o ID e use no comando de UPDATE (remova os --)
-- 3. Execute o UPDATE
-- 4. Execute a query 3 para verificar se funcionou
-- =====================================================