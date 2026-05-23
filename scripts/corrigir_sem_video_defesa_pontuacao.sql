-- =====================================================
-- FIX RETROATIVO: aplicar -5 por ausência de vídeo de defesa
-- =====================================================
-- Regra: em lances finalizados (analise_realizada), quando não for retirada de bug
-- e não houver link de vídeo na defesa, aplicar semVideo=true e somar +5 pontos
-- ao veredito.pontosPerdidos caso ainda não esteja aplicado.
--
-- Este script corrige casos já julgados (ex.: STW-C2103).
-- =====================================================

-- 1) Diagnóstico dos casos afetados
SELECT
  dados ->> 'codigoLance' AS codigo_lance,
  dados -> 'acusado' ->> 'nome' AS acusado,
  dados ->> 'status' AS status,
  dados -> 'veredito' ->> 'culpado' AS culpado,
  dados -> 'veredito' ->> 'semVideo' AS sem_video_atual,
  dados -> 'veredito' ->> 'pontosPerdidos' AS pontos_atuais,
  dados -> 'defesa' ->> 'videoLinkDefesa' AS video_link_defesa
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'status' = 'analise_realizada'
  AND COALESCE(dados ->> 'tipoSolicitacao', '') <> 'retirada_bug'
  AND COALESCE(dados -> 'acusado' ->> 'nome', '') <> 'Administração Master League F1'
  AND NULLIF(TRIM(COALESCE(dados -> 'defesa' ->> 'videoLinkDefesa', '')), '') IS NULL
  AND COALESCE((dados -> 'veredito' ->> 'semVideo')::boolean, false) = false
ORDER BY created_at DESC;

-- 2) Aplicar correção
UPDATE public.notificacoes_admin na
SET dados =
  jsonb_set(
    jsonb_set(
      na.dados,
      '{veredito,semVideo}',
      'true'::jsonb,
      true
    ),
    '{veredito,pontosPerdidos}',
    to_jsonb(COALESCE((na.dados -> 'veredito' ->> 'pontosPerdidos')::int, 0) + 5),
    true
  )
WHERE na.tipo = 'nova_acusacao'
  AND na.dados ->> 'status' = 'analise_realizada'
  AND COALESCE(na.dados ->> 'tipoSolicitacao', '') <> 'retirada_bug'
  AND COALESCE(na.dados -> 'acusado' ->> 'nome', '') <> 'Administração Master League F1'
  AND NULLIF(TRIM(COALESCE(na.dados -> 'defesa' ->> 'videoLinkDefesa', '')), '') IS NULL
  AND COALESCE((na.dados -> 'veredito' ->> 'semVideo')::boolean, false) = false;

-- 3) Conferência rápida do STW-C2103
SELECT
  dados ->> 'codigoLance' AS codigo_lance,
  dados -> 'veredito' ->> 'semVideo' AS sem_video,
  dados -> 'veredito' ->> 'pontosPerdidos' AS pontos_perdidos
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2103';
