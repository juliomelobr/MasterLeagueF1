-- =====================================================
-- TESTE MANUAL: Verificar se RLS permite update de defesa
-- =====================================================

-- 1. VERIFICAR SE A POLÍTICA PARA PILOTOS FOI CRIADA
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';

-- 2. ENCONTRAR UM REGISTRO PARA TESTAR
SELECT id, dados->>'codigoLance' as codigo, dados->>'status' as status,
       dados->'acusado'->>'email' as email_acusado
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 3. TESTE MANUAL: TENTE ATUALIZAR UM REGISTRO (execute como usuário piloto)
-- Substitua o ID abaixo pelo ID encontrado na query 2
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(
--     jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     '{defesa}',
--     '{
--       "defensor": {"nome": "JOÃO DARTH", "email": "seu@email.com"},
--       "descricaoDefesa": "Teste de defesa",
--       "dataEnvioDefesa": "2025-01-13T12:00:00Z"
--     }'
--   )
-- WHERE id = SEU_ID_AQUI;

-- 4. VERIFICAR SE O UPDATE FUNCIONOU
-- SELECT dados->>'status' as status, dados->>'defesa' as defesa
-- FROM notificacoes_admin WHERE id = SEU_ID_AQUI;

-- =====================================================
-- SE O UPDATE FUNCIONAR, A RLS ESTÁ OK
-- SE FALHAR, PRECISAMOS REAPLICAR A POLÍTICA
-- =====================================================