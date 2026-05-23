-- =====================================================
-- TESTE MANUAL: Simular update de defesa como piloto
-- =====================================================

-- 1. ENCONTRAR O ID DO REGISTRO PARA TESTAR
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->>'status' as status_atual,
    dados->'acusado'->>'email' as email_acusado
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 2. SIMULAR UPDATE MANUAL (execute como usuário logado)
-- Substitua SEU_ID_AQUI pelo ID encontrado acima
-- IMPORTANTE: Execute este comando LOGADO como o piloto acusado

-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(
--     jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     '{defesa}',
--     '{
--       "defensor": {"nome": "JOÃO DARTH", "email": "EMAIL_DO_PILOTO"},
--       "descricaoDefesa": "Teste manual de defesa - verificar se RLS permite",
--       "videoLinkDefesa": "https://twitch.tv/test",
--       "videoEmbedDefesa": null,
--       "dataEnvioDefesa": "2025-01-13T12:00:00.000Z"
--     }'
--   ),
--   lido = false
-- WHERE id = SEU_ID_AQUI;

-- 3. VERIFICAR SE O UPDATE FUNCIONOU
-- SELECT
--     dados->>'status' as status,
--     dados->>'defesa' as defesa
-- FROM notificacoes_admin
-- WHERE id = SEU_ID_AQUI;

-- 4. SE FUNCIONOU: RLS está OK, problema pode ser na aplicação
--    SE FALHOU: RLS não está permitindo, precisa reaplicar política

-- =====================================================