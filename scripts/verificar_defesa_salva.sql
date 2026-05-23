-- =====================================================
-- VERIFICAR: Se a defesa está salva corretamente no banco
-- =====================================================

-- 1. VERIFICAR ESTRUTURA COMPLETA DA DEFESA
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    dados->'defesa' as defesa_completa,
    dados->'defesa'->>'descricaoDefesa' as descricao_defesa,
    dados->'defesa'->>'videoLinkDefesa' as video_link,
    dados->'defesa'->>'dataEnvioDefesa' as data_envio,
    dados->'defesa'->'defensor'->>'nome' as defensor_nome
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 2. VERIFICAR SE O CAMPO DEFESA EXISTE
SELECT
    CASE 
        WHEN (dados ->> 'defesa') IS NOT NULL THEN '✅ DEFESA EXISTE'
        ELSE '❌ DEFESA NÃO EXISTE'
    END as status_defesa,
    jsonb_typeof(dados->'defesa') as tipo_campo_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 3. VERIFICAR CAMPOS ESPECÍFICOS DA DEFESA
SELECT
    dados->'defesa'->>'descricaoDefesa' as tem_descricao,
    dados->'defesa'->>'videoLinkDefesa' as tem_video,
    dados->'defesa'->>'defensor' as tem_defensor
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- =====================================================
-- INTERPRETAÇÃO:
-- - Se defesa_completa for NULL: defesa não foi salva
-- - Se descricao_defesa for NULL: campo descricaoDefesa não existe
-- - Se video_link for NULL: não há vídeo (normal se não foi enviado)
-- =====================================================