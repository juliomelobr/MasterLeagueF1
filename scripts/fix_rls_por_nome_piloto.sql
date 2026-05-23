-- =====================================================
-- FIX ALTERNATIVO: Política RLS usando NOME do piloto
-- =====================================================
-- Problema: auth.jwt() retorna NULL no SQL Editor
-- Solução: Usar comparação por NOME do piloto + buscar email na tabela pilotos
-- =====================================================

-- Remover política antiga baseada em email
DROP POLICY IF EXISTS "notificacoes_admin_update_pilotos_defesa" ON public.notificacoes_admin;

-- Criar nova política usando NOME do piloto
-- Busca o nome do piloto na tabela 'pilotos' usando o email do JWT
CREATE POLICY "notificacoes_admin_update_pilotos_defesa"
ON public.notificacoes_admin
FOR UPDATE
USING (
  tipo = 'nova_acusacao'
  -- Comparar nome do acusado com nome do piloto logado (da tabela pilotos)
  AND EXISTS (
    SELECT 1
    FROM pilotos p
    WHERE lower(trim(p.email)) = lower(trim(auth.jwt() ->> 'email'))
      AND lower(trim(p.nome)) = lower(trim(dados -> 'acusado' ->> 'nome'))
  )
  AND (dados ->> 'status') = 'aguardando_defesa'
  AND (dados ->> 'defesa') IS NULL
)
WITH CHECK (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL
  -- Verificar nome novamente no WITH CHECK
  AND EXISTS (
    SELECT 1
    FROM pilotos p
    WHERE lower(trim(p.email)) = lower(trim(auth.jwt() ->> 'email'))
      AND lower(trim(p.nome)) = lower(trim(dados -> 'acusado' ->> 'nome'))
  )
);

-- =====================================================
-- VANTAGENS:
-- - Usa nome do piloto que é mais estável que email
-- - Busca na tabela pilotos usando email do JWT
-- - Comparação case-insensitive e com trim
-- =====================================================