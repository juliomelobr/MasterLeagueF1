-- =====================================================
-- VERIFICAR SE A POLÍTICA RLS PARA DEFESAS FOI APLICADA
-- =====================================================

-- 1. LISTAR TODAS AS POLÍTICAS DA TABELA
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notificacoes_admin'
ORDER BY policyname;

-- 2. VERIFICAR ESPECIFICAMENTE A POLÍTICA PARA PILOTOS
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';

-- 3. SE A POLÍTICA NÃO EXISTIR, APLICAR NOVAMENTE
-- Execute o conteúdo do arquivo: scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql

-- =====================================================
-- RESULTADO ESPERADO:
-- Deve haver uma política chamada 'notificacoes_admin_update_pilotos_defesa'
-- com cmd = 'UPDATE' e qual contendo verificações para acusado e status
-- =====================================================