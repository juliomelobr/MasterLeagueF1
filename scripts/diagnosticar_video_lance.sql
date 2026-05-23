-- Script para diagnosticar por que o vídeo do lance STW-L2008 não está sendo incorporado
-- Execute no Supabase SQL Editor

-- 1. Diagnóstico completo do lance STW-L2008
SELECT 
    id,
    tipo,
    dados->>'codigoLance' as codigo_lance,
    dados->>'videoLink' as video_link,
    dados->>'videoEmbed' as video_embed,
    dados->>'descricao' as descricao,
    dados->>'status' as status,
    CASE 
        WHEN dados->>'videoLink' IS NULL THEN '❌ videoLink está NULL'
        WHEN dados->>'videoLink' = '' THEN '❌ videoLink está vazio'
        WHEN dados->>'videoLink' IS NOT NULL THEN '✅ videoLink existe: ' || LEFT(dados->>'videoLink', 50)
        ELSE '⚠️ Estado desconhecido'
    END as status_video,
    created_at,
    updated_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Verificar todos os campos do JSON (formato completo)
SELECT 
    id,
    dados->>'codigoLance' as codigo,
    jsonb_pretty(dados) as dados_completos
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Verificar se há múltiplos registros para o mesmo lance
SELECT 
    id,
    dados->>'codigoLance' as codigo,
    dados->>'videoLink' as video_link,
    dados->>'status' as status,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2008'
ORDER BY created_at DESC;

-- 4. Comparar com outros lances que têm vídeo funcionando
SELECT 
    dados->>'codigoLance' as codigo,
    CASE 
        WHEN dados->>'videoLink' IS NOT NULL AND dados->>'videoLink' != '' THEN '✅ Tem vídeo'
        ELSE '❌ Sem vídeo'
    END as tem_video,
    LEFT(dados->>'videoLink', 60) as video_link_preview,
    dados->>'status' as status
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'videoLink' IS NOT NULL
  AND dados->>'videoLink' != ''
ORDER BY created_at DESC
LIMIT 5;
