-- =====================================================
-- HOTFIX: Corrigir email do acusado no lance STW-C2105
-- Caso o RLS dependa de email e o JSON esteja divergente
-- =====================================================
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1) Validar email atual no lance
SELECT
  dados ->> 'codigoLance' AS codigo_lance,
  dados -> 'acusado' ->> 'nome' AS acusado_nome,
  dados -> 'acusado' ->> 'email' AS email_atual_no_lance
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2105';

-- 2) Validar email oficial no cadastro de pilotos
SELECT
  nome,
  email AS email_correto_cadastro
FROM public.pilotos
WHERE lower(trim(nome)) = lower(trim('Alexandre Henrique'))
LIMIT 1;

-- 3) Aplicar correção no JSON do lance (somente se o email estiver diferente)
UPDATE public.notificacoes_admin na
SET dados = jsonb_set(
  na.dados,
  '{acusado,email}',
  to_jsonb(p.email::text),
  true
)
FROM public.pilotos p
WHERE na.tipo = 'nova_acusacao'
  AND na.dados ->> 'codigoLance' = 'STW-C2105'
  AND lower(trim(p.nome)) = lower(trim('Alexandre Henrique'))
  AND lower(trim(COALESCE(na.dados -> 'acusado' ->> 'email', ''))) <> lower(trim(COALESCE(p.email, '')));

-- 4) Conferir resultado
SELECT
  dados ->> 'codigoLance' AS codigo_lance,
  dados -> 'acusado' ->> 'nome' AS acusado_nome,
  dados -> 'acusado' ->> 'email' AS email_corrigido
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2105';
