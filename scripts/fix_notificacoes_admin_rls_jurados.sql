-- =====================================================
-- FIX: Permitir jurados lerem/atualizarem votos do Júri
-- Tabela: notificacoes_admin
-- =====================================================
-- Problema típico: alguns jurados conseguem votar e outros não (voto "não computa"),
-- geralmente por políticas RLS que permitem UPDATE/SELECT apenas para stewards.
--
-- Esta correção cria policies adicionais para jurados ATIVOS (jurados.email_google)
-- poderem:
-- - SELECT nas notificações necessárias ao júri
-- - UPDATE apenas enquanto o lance está aguardando análise
--
-- Execute no SQL Editor do Supabase.
-- =====================================================

-- Garantir que RLS está ligado (apenas por segurança; não altera se já estiver)
ALTER TABLE public.notificacoes_admin ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas com o mesmo nome (se existirem)
DROP POLICY IF EXISTS "notificacoes_admin_read_jurados" ON public.notificacoes_admin;
DROP POLICY IF EXISTS "notificacoes_admin_update_jurados" ON public.notificacoes_admin;

-- Jurados ATIVOS podem ler notificações (necessário para a tela /veredito carregar os lances)
CREATE POLICY "notificacoes_admin_read_jurados"
ON public.notificacoes_admin
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.jurados j
    WHERE j.ativo = true
      AND lower(j.email_google) = lower(auth.jwt() ->> 'email')
  )
);

-- Jurados ATIVOS podem atualizar apenas enquanto o lance está aguardando análise
-- (evita que alterem lances já finalizados).
CREATE POLICY "notificacoes_admin_update_jurados"
ON public.notificacoes_admin
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.jurados j
    WHERE j.ativo = true
      AND lower(j.email_google) = lower(auth.jwt() ->> 'email')
  )
  AND tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.jurados j
    WHERE j.ativo = true
      AND lower(j.email_google) = lower(auth.jwt() ->> 'email')
  )
  AND tipo = 'nova_acusacao'
);

-- =====================================================
-- VERIFICAÇÃO (opcional):
-- 1) Liste as policies da tabela:
-- SELECT polname, polcmd, polroles, polqual, polwithcheck
-- FROM pg_policy
-- WHERE polrelid = 'public.notificacoes_admin'::regclass;
--
-- 2) Faça login como jurado7 e tente votar novamente.
-- =====================================================

