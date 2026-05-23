-- =====================================================
-- FIX ALTERNATIVO: Política RLS usando NOME em vez de EMAIL
-- =====================================================
-- Problema: Email do acusado no registro não corresponde ao email logado
-- Solução: Usar comparação por NOME do piloto (mais confiável)
-- =====================================================

-- Remover política antiga baseada em email
DROP POLICY IF EXISTS "notificacoes_admin_update_pilotos_defesa" ON public.notificacoes_admin;

-- Criar nova política usando NOME do piloto
CREATE POLICY "notificacoes_admin_update_pilotos_defesa"
ON public.notificacoes_admin
FOR UPDATE
USING (
  tipo = 'nova_acusacao'
  -- Comparar por NOME (case-insensitive) em vez de email
  AND lower(trim(dados -> 'acusado' ->> 'nome')) = lower(trim((SELECT nome FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1)))
  AND (dados ->> 'status') = 'aguardando_defesa'
  AND (dados ->> 'defesa') IS NULL
)
WITH CHECK (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL
  -- Verificar nome novamente no WITH CHECK
  AND lower(trim(dados -> 'acusado' ->> 'nome')) = lower(trim((SELECT nome FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1)))
);

-- =====================================================
-- VANTAGENS:
-- - Não depende de email corresponder exatamente
-- - Usa nome do piloto que é mais estável
-- - Busca nome na tabela pilotos usando email logado
-- =====================================================