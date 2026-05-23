-- =====================================================
-- ATUALIZAR DEFESA COMPLETA: STW-L2012
-- =====================================================
-- Dados da defesa real enviada pelo piloto JOÃO DARTH
-- =====================================================

-- ATUALIZAR COM TODOS OS DADOS DA DEFESA REAL
UPDATE notificacoes_admin
SET dados = jsonb_set(
    jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    dados,
                    '{defesa,descricaoDefesa}',
                    to_jsonb('Disputa de posição, o adversário já veio jogando o carro pra cima de mim, no último setor, me fazendo quase roda, disputa lado com o meu carro a frente dele, no momento da rodagem o adversário bateu no meu carro e rodou sozinho'::text)
                ),
                '{defesa,videoLinkDefesa}',
                to_jsonb('https://www.twitch.tv/darfijoao877/clip/InquisitiveArtisticStingraySquadGoals-cORi3NhPStDblLfb'::text)
            ),
            '{defesa,defensor}',
            '{
                "nome": "JOÃO DARTH",
                "gamertag": "DarthJoão877",
                "whatsapp": "",
                "email": "",
                "grid": "light"
            }'::jsonb
        ),
        '{defesa,dataEnvioDefesa}',
        to_jsonb(now()::text)
    ),
    '{defesa,videoEmbedDefesa}',
    to_jsonb('https://clips.twitch.tv/embed?clip=InquisitiveArtisticStingraySquadGoals-cORi3NhPStDblLfb&parent=masterleaguef1.com.br'::text)
  )
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- VERIFICAR RESULTADO
SELECT
    dados->>'codigoLance' as codigo,
    dados->'defesa'->>'descricaoDefesa' as descricao,
    dados->'defesa'->>'videoLinkDefesa' as video_link,
    dados->'defesa'->'defensor'->>'nome' as defensor,
    dados->'defesa'->>'dataEnvioDefesa' as data_envio
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- =====================================================
-- APÓS EXECUTAR:
-- 1. Recarregue o Painel de Veredicto (F5 ou botão Atualizar)
-- 2. A defesa completa deve aparecer agora
-- =====================================================