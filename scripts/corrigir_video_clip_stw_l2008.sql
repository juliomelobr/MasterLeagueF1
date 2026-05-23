-- Script para corrigir o link do vídeo do lance STW-L2008
-- O vídeo é um YouTube Clip e precisa estar no formato correto

-- 1. Verificar o estado atual
SELECT 
    id,
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link_atual,
    dados->>'videoEmbed' as video_embed_atual
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Atualizar o videoLink para o formato correto (com www e sem parâmetros ?si=)
UPDATE notificacoes_admin
SET dados = jsonb_set(
    dados,
    '{videoLink}',
    '"https://www.youtube.com/clip/Ugkx6fAvrNFmlE6A0YzBoak5SwE8AgtdBD6m"'
)
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
  AND (dados->>'videoLink' IS NULL OR dados->>'videoLink' != 'https://www.youtube.com/clip/Ugkx6fAvrNFmlE6A0YzBoak5SwE8AgtdBD6m');

-- 3. Verificar se foi atualizado corretamente
SELECT 
    id,
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link_atualizado,
    CASE 
        WHEN dados->>'videoLink' LIKE '%/clip/%' THEN '✅ É um YouTube Clip'
        ELSE '❌ Não é um Clip'
    END as tipo_video
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
ORDER BY created_at DESC
LIMIT 1;
