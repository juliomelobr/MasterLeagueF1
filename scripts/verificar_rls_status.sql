-- =====================================================
-- VERIFICAR STATUS DO RLS NA TABELA notificacoes_admin
-- =====================================================

-- MÉTODO 1: Verificar se RLS está habilitado
SELECT
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin';

-- MÉTODO 2: Listar todas as políticas (método mais confiável)
SELECT
    policyname as nome_politica,
    cmd as comando,
    qual as condicao_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin';

-- MÉTODO 3: Verificar política específica para pilotos
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';

-- =====================================================
-- SE NÃO HOUVER POLÍTICAS:
-- Execute o arquivo: scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql
-- =====================================================