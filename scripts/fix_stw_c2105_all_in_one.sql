-- =====================================================
-- ALL-IN-ONE: Diagnosticar + corrigir STW-C2105 + garantir RLS
-- =====================================================
-- Caso: Piloto Alexandre Henrique nao consegue enviar defesa (erro permissao)
-- Lance: STW-C2105
--
-- O que este script faz:
-- 1) Mostra diagnostico inicial do lance e do cadastro do piloto
-- 2) Corrige email do acusado no JSON do lance (se divergente)
-- 3) Recria policy RLS de update de defesa (robusta por email/whatsapp/gamertag/nome)
-- 4) Exibe validacao final
--
-- Execute este script inteiro no SQL Editor do Supabase.
-- =====================================================

-- -----------------------------------------------------
-- ETAPA 1: Diagnostico inicial
-- -----------------------------------------------------
SELECT
  'DIAGNOSTICO_LANCE_INICIAL' AS etapa,
  id,
  tipo,
  dados ->> 'codigoLance' AS codigo_lance,
  dados ->> 'status' AS status,
  dados -> 'acusador' ->> 'nome' AS acusador_nome,
  dados -> 'acusado' ->> 'nome' AS acusado_nome,
  dados -> 'acusado' ->> 'email' AS acusado_email,
  dados -> 'acusado' ->> 'gamertag' AS acusado_gamertag,
  dados -> 'acusado' ->> 'whatsapp' AS acusado_whatsapp,
  CASE WHEN (dados ->> 'defesa') IS NULL THEN 'NAO' ELSE 'SIM' END AS ja_tem_defesa
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2105';

SELECT
  'DIAGNOSTICO_PILOTO_CADASTRO' AS etapa,
  nome,
  email,
  gamertag,
  whatsapp,
  grid,
  is_steward
FROM public.pilotos
WHERE lower(trim(nome)) = lower(trim('Alexandre Henrique'))
ORDER BY created_at DESC NULLS LAST;

-- -----------------------------------------------------
-- ETAPA 2: Corrigir email do acusado no JSON do lance
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- ETAPA 3: Recriar policy RLS de defesa (definitiva)
-- -----------------------------------------------------
DROP POLICY IF EXISTS "notificacoes_admin_update_pilotos_defesa" ON public.notificacoes_admin;

CREATE POLICY "notificacoes_admin_update_pilotos_defesa"
ON public.notificacoes_admin
FOR UPDATE
USING (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_defesa'
  AND (dados ->> 'defesa') IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.pilotos p
    WHERE lower(trim(COALESCE(p.email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
      AND (
        lower(trim(COALESCE(dados -> 'acusado' ->> 'email', ''))) = lower(trim(COALESCE(p.email, '')))
        OR regexp_replace(COALESCE(dados -> 'acusado' ->> 'whatsapp', ''), '\D', '', 'g')
           = regexp_replace(COALESCE(p.whatsapp, ''), '\D', '', 'g')
        OR lower(trim(COALESCE(dados -> 'acusado' ->> 'gamertag', ''))) = lower(trim(COALESCE(p.gamertag, '')))
        OR lower(trim(COALESCE(dados -> 'acusado' ->> 'nome', ''))) = lower(trim(COALESCE(p.nome, '')))
      )
  )
)
WITH CHECK (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.pilotos p
    WHERE lower(trim(COALESCE(p.email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
      AND (
        lower(trim(COALESCE(dados -> 'acusado' ->> 'email', ''))) = lower(trim(COALESCE(p.email, '')))
        OR regexp_replace(COALESCE(dados -> 'acusado' ->> 'whatsapp', ''), '\D', '', 'g')
           = regexp_replace(COALESCE(p.whatsapp, ''), '\D', '', 'g')
        OR lower(trim(COALESCE(dados -> 'acusado' ->> 'gamertag', ''))) = lower(trim(COALESCE(p.gamertag, '')))
        OR lower(trim(COALESCE(dados -> 'acusado' ->> 'nome', ''))) = lower(trim(COALESCE(p.nome, '')))
      )
  )
);

-- -----------------------------------------------------
-- ETAPA 4: Validacao final
-- -----------------------------------------------------
SELECT
  'VALIDACAO_FINAL_LANCE' AS etapa,
  dados ->> 'codigoLance' AS codigo_lance,
  dados ->> 'status' AS status,
  dados -> 'acusado' ->> 'nome' AS acusado_nome,
  dados -> 'acusado' ->> 'email' AS acusado_email,
  CASE WHEN (dados ->> 'defesa') IS NULL THEN 'NAO' ELSE 'SIM' END AS ja_tem_defesa
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2105';

SELECT
  'VALIDACAO_POLICY' AS etapa,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';
