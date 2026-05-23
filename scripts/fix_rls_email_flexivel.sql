-- =====================================================
-- FIX: Política RLS com comparação de email mais flexível
-- =====================================================
-- Problema: Email do acusado pode ter diferenças de case/espaços
-- Solução: Comparar emails normalizados (lowercase + trim)
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "notificacoes_admin_update_pilotos_defesa" ON public.notificacoes_admin;

-- Criar nova política com comparação flexível de email
CREATE POLICY "notificacoes_admin_update_pilotos_defesa"
ON public.notificacoes_admin
FOR UPDATE
USING (
  tipo = 'nova_acusacao'
  -- Comparar emails normalizados (lowercase + trim)
  AND lower(trim(dados -> 'acusado' ->> 'email')) = lower(trim(auth.jwt() ->> 'email'))
  AND (dados ->> 'status') = 'aguardando_defesa'
  AND (dados ->> 'defesa') IS NULL
)
WITH CHECK (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL
  -- Verificar email novamente no WITH CHECK
  AND lower(trim(dados -> 'acusado' ->> 'email')) = lower(trim(auth.jwt() ->> 'email'))
);

-- =====================================================
-- TESTE: Verificar se agora passa
-- Execute logado como o piloto e teste:
-- SELECT
--     CASE
--         WHEN lower(trim(dados -> 'acusado' ->> 'email')) = lower(trim(auth.jwt() ->> 'email'))
--         THEN '✅ EMAIL CORRESPONDE'
--         ELSE '❌ EMAIL NÃO CORRESPONDE'
--     END as verificacao
-- FROM notificacoes_admin
-- WHERE dados->>'codigoLance' = 'STW-L2012';
-- =====================================================