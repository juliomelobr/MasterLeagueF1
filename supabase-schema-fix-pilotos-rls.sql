-- =====================================================
-- FIX RLS - Tabela PILOTOS (Remover política conflitante)
-- =====================================================
-- Este script remove a política conflitante "Allow update for own record"
-- e mantém apenas a política "pilotos_update" que permite UPDATE sempre.
-- =====================================================

-- Remover a política conflitante que exige auth.email() = email
DROP POLICY IF EXISTS "Allow update for own record" ON pilotos;

-- Verificar se a política pilotos_update existe e está correta
-- Se não existir, criar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pilotos' 
        AND policyname = 'pilotos_update' 
        AND cmd = 'UPDATE'
    ) THEN
        CREATE POLICY pilotos_update ON pilotos 
        FOR UPDATE 
        USING (true)
        WITH CHECK (true);
    ELSE
        -- Se já existe, garantir que está correta
        DROP POLICY IF EXISTS pilotos_update ON pilotos;
        CREATE POLICY pilotos_update ON pilotos 
        FOR UPDATE 
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Verificar políticas finais
SELECT 
    policyname, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'pilotos' AND cmd = 'UPDATE';

-- Deve mostrar apenas uma política: pilotos_update com qual=true e with_check=true
