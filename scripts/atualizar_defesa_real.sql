-- =====================================================
-- ATUALIZAR: Substituir defesa de teste pela defesa real
-- =====================================================
-- Dados da defesa real enviada pelo piloto:
-- - Descrição: "Disputa de posição, o adversário já veio jogando o carro pra cima de mim, no último setor, me fazendo quase roda, disputa lado com o meu carro a frente dele, no momento da rodagem o adversário bateu no meu carro e rodou sozinho"
-- - Vídeo: https://www.twitch.tv/darfijoao877/clip/InquisitiveArtisticStingraySquadGoals-cORi3NhPStDblLfb
-- - Defensor: JOÃO DARTH (DarthJoão877, LIGHT)
-- =====================================================

-- 1. VERIFICAR DADOS ATUAIS
SELECT
    dados->>'codigoLance' as codigo,
    dados->'defesa'->>'descricaoDefesa' as descricao_atual,
    dados->'defesa'->>'videoLinkDefesa' as video_atual
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 2. ATUALIZAR COM A DEFESA REAL
UPDATE notificacoes_admin
SET dados = jsonb_set(
    jsonb_set(
        jsonb_set(
            dados,
            '{defesa,descricaoDefesa}',
            to_jsonb('Disputa de posição, o adversário já veio jogando o carro pra cima de mim, no último setor, me fazendo quase roda, disputa lado com o meu carro a frente dele, no momento da rodagem o adversário bateu no meu carro e rodou sozinho'::text)
        ),
        '{defesa,videoLinkDefesa}',
        to_jsonb('https://www.twitch.tv/darfijoao877/clip/InquisitiveArtisticStingraySquadGoals-cORi3NhPStDblLfb'::text)
    ),
    '{defesa,dataEnvioDefesa}',
    to_jsonb(now()::text)
  )
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 3. VERIFICAR SE FOI ATUALIZADO
SELECT
    dados->>'codigoLance' as codigo,
    dados->'defesa'->>'descricaoDefesa' as descricao_defesa,
    dados->'defesa'->>'videoLinkDefesa' as video_link,
    dados->'defesa'->>'dataEnvioDefesa' as data_envio
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- =====================================================
-- APÓS EXECUTAR:
-- 1. Recarregue o Painel de Veredicto (F5)
-- 2. A defesa real deve aparecer agora
-- =====================================================