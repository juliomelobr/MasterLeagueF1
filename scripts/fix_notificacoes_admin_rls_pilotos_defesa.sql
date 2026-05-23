-- =====================================================
-- FIX OFICIAL: RLS para pilotos enviarem defesa
-- =====================================================
-- Objetivo:
-- Permitir UPDATE em notificacoes_admin (tipo nova_acusacao) pelo piloto acusado,
-- mesmo quando houver divergencia de email no JSON do lance.
--
-- A identificacao do piloto logado e feita pela tabela pilotos (via auth.jwt email),
-- aceitando correspondencia por:
--   1) email
--   2) whatsapp (somente digitos)
--   3) gamertag
--   4) nome
--
-- Regras de fluxo:
-- - USING (linha original): status deve ser aguardando_defesa e sem defesa
-- - WITH CHECK (linha atualizada): status deve virar aguardando_analise e com defesa
-- =====================================================

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

-- =====================================================
-- Verificacao rapida (opcional)
-- =====================================================
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'notificacoes_admin'
--   AND policyname = 'notificacoes_admin_update_pilotos_defesa';
