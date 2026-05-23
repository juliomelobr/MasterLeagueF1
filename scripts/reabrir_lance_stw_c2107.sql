-- =====================================================
-- REABRIR LANCE: STW-C2107
-- =====================================================
-- Objetivo: tirar de "solicitacao_anulada" e voltar para "aguardando_analise"
-- Execute no SQL Editor do Supabase (com permissao de admin).
-- =====================================================

-- 1) Diagnóstico antes
SELECT
  id,
  tipo,
  dados ->> 'codigoLance' AS codigo_lance,
  dados ->> 'status' AS status_atual,
  dados ->> 'motivoAnulacao' AS motivo_anulacao,
  dados ->> 'dataAnulacao' AS data_anulacao,
  dados -> 'anuladaPorJurado' AS anulada_por_jurado
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2107';

-- 2) Reabertura
UPDATE public.notificacoes_admin na
SET
  dados =
    (na.dados
      || jsonb_build_object(
        'status', 'aguardando_analise',
        'reabertoEm', NOW()::text,
        'reabertoPor', 'ADMIN_MANUAL'
      )
    )
    - 'motivoAnulacao'
    - 'dataAnulacao'
    - 'anuladaPorJurado',
  lido = false
WHERE na.tipo = 'nova_acusacao'
  AND na.dados ->> 'codigoLance' = 'STW-C2107';

-- 3) Validação depois
SELECT
  id,
  dados ->> 'codigoLance' AS codigo_lance,
  dados ->> 'status' AS status_novo,
  dados ->> 'reabertoEm' AS reaberto_em,
  dados ->> 'reabertoPor' AS reaberto_por
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2107';
