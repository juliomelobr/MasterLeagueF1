-- =====================================================
-- SOLUÇÃO FINAL: Política RLS corrigida
-- =====================================================
-- IMPORTANTE: auth.jwt() retorna NULL no SQL Editor (normal!)
-- Mas funciona na aplicação React quando usuário está logado
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "notificacoes_admin_update_pilotos_defesa" ON public.notificacoes_admin;

-- Criar política corrigida com comparação flexível de email
CREATE POLICY "notificacoes_admin_update_pilotos_defesa"
ON public.notificacoes_admin
FOR UPDATE
USING (
  tipo = 'nova_acusacao'
  -- Comparar emails normalizados (lowercase + trim)
  AND lower(trim(COALESCE(dados -> 'acusado' ->> 'email', ''))) = 
      lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
  AND (dados ->> 'status') = 'aguardando_defesa'
  AND (dados ->> 'defesa') IS NULL
)
WITH CHECK (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL
  -- Verificar email novamente no WITH CHECK
  AND lower(trim(COALESCE(dados -> 'acusado' ->> 'email', ''))) = 
      lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
);

-- =====================================================
-- PRÓXIMO PASSO:
-- 1. Verificar qual é o email do acusado no registro STW-L2012
-- 2. Verificar qual é o email usado no login da aplicação
-- 3. Se forem diferentes, atualizar o registro para usar o email correto
-- =====================================================

-- QUERY PARA VERIFICAR EMAIL DO ACUSADO:
-- SELECT dados->'acusado'->>'email' as email_acusado,
--        dados->'acusado'->>'nome' as nome_acusado
-- FROM notificacoes_admin
-- WHERE dados->>'codigoLance' = 'STW-L2012';

-- QUERY PARA CORRIGIR EMAIL (substitua EMAIL_CORRETO):
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(dados, '{acusado,email}', to_jsonb('EMAIL_CORRETO'::text))
-- WHERE dados->>'codigoLance' = 'STW-L2012';
-- =====================================================