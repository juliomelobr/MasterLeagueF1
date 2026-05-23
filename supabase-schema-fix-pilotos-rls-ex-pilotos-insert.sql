-- =====================================================
-- FIX RLS - Tabela PILOTOS (Permitir INSERT/UPDATE para Ex-Pilotos)
-- =====================================================
-- Motivo: Ex-pilotos em cadastro não têm sessão autenticada ainda
-- Solução: Permitir INSERT/UPDATE para registros com tipo_piloto='ex-piloto' e status='pendente'
-- =====================================================

ALTER TABLE pilotos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas de INSERT
DROP POLICY IF EXISTS pilotos_insert ON pilotos;

-- Nova política de INSERT: 
-- 1. Se autenticado, pode inserir normalmente
-- 2. Se não autenticado, pode inserir apenas ex-pilotos pendentes (para cadastro)
CREATE POLICY pilotos_insert ON pilotos
  FOR INSERT
  WITH CHECK (
    -- Se autenticado, permitir (para pilotos ativos e outros casos)
    auth.uid() IS NOT NULL
    OR
    -- Se não autenticado, permitir apenas para ex-pilotos pendentes (cadastro)
    -- O WITH CHECK verifica os valores que estão sendo inseridos
    (
      auth.uid() IS NULL
      AND tipo_piloto = 'ex-piloto'
      AND status = 'pendente'
    )
  );

-- Política adicional de UPDATE: Permitir UPDATE para ex-pilotos pendentes não autenticados
-- (necessário porque upsert pode fazer UPDATE se o email já existir)
-- NOTA: Esta política funciona em conjunto com a política pilotos_update existente
-- Se pilotos_update já permite tudo (USING true), esta política adicional garante
-- que ex-pilotos não autenticados também possam fazer UPDATE
CREATE POLICY pilotos_update_ex_piloto_pendente ON pilotos
  FOR UPDATE
  USING (
    -- Se autenticado, deixar a política pilotos_update padrão cuidar
    auth.uid() IS NOT NULL
    OR
    -- Se não autenticado, permitir UPDATE apenas para ex-pilotos pendentes
    (
      auth.uid() IS NULL
      AND tipo_piloto = 'ex-piloto'
      AND status = 'pendente'
    )
  )
  WITH CHECK (
    -- Garantir que após UPDATE ainda seja ex-piloto pendente (ou permitir se autenticado)
    auth.uid() IS NOT NULL
    OR
    (
      auth.uid() IS NULL
      AND tipo_piloto = 'ex-piloto'
      AND status = 'pendente'
    )
  );

