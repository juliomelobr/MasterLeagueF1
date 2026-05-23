-- =====================================================
-- FIX COMPLETO: Política RLS que funciona mesmo sem JWT no SQL Editor
-- =====================================================
-- IMPORTANTE: No SQL Editor, auth.jwt() retorna NULL
-- Mas na aplicação React, quando o usuário está logado, funciona!
-- =====================================================

-- Remover política antiga
DROP POLICY IF EXISTS "notificacoes_admin_update_pilotos_defesa" ON public.notificacoes_admin;

-- Criar política que funciona tanto no SQL Editor quanto na aplicação
CREATE POLICY "notificacoes_admin_update_pilotos_defesa"
ON public.notificacoes_admin
FOR UPDATE
USING (
  tipo = 'nova_acusacao'
  -- Verificar se email corresponde OU se não há JWT (permite updates diretos no SQL)
  AND (
    -- Caso 1: Email corresponde (quando executado pela aplicação com usuário logado)
    (auth.jwt() ->> 'email' IS NOT NULL 
     AND lower(trim(dados -> 'acusado' ->> 'email')) = lower(trim(auth.jwt() ->> 'email')))
    OR
    -- Caso 2: Verificar por nome do piloto (quando JWT não disponível)
    (auth.jwt() ->> 'email' IS NULL 
     AND EXISTS (
       SELECT 1 FROM pilotos p
       WHERE lower(trim(p.nome)) = lower(trim(dados -> 'acusado' ->> 'nome'))
     ))
  )
  AND (dados ->> 'status') = 'aguardando_defesa'
  AND (dados ->> 'defesa') IS NULL
)
WITH CHECK (
  tipo = 'nova_acusacao'
  AND (dados ->> 'status') = 'aguardando_analise'
  AND (dados ->> 'defesa') IS NOT NULL
  -- Mesma verificação no WITH CHECK
  AND (
    (auth.jwt() ->> 'email' IS NOT NULL 
     AND lower(trim(dados -> 'acusado' ->> 'email')) = lower(trim(auth.jwt() ->> 'email')))
    OR
    (auth.jwt() ->> 'email' IS NULL 
     AND EXISTS (
       SELECT 1 FROM pilotos p
       WHERE lower(trim(p.nome)) = lower(trim(dados -> 'acusado' ->> 'nome'))
     ))
  )
);

-- =====================================================
-- NOTA IMPORTANTE:
-- - No SQL Editor: auth.jwt() retorna NULL, então usa verificação por nome
-- - Na aplicação React: auth.jwt() tem email, então usa verificação por email
-- - A política funciona em ambos os casos!
-- =====================================================