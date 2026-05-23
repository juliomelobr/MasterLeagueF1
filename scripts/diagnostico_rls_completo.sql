-- =====================================================
-- DIAGNÓSTICO COMPLETO: Verificar estado do RLS
-- =====================================================

-- 1. VERIFICAR SE RLS ESTÁ HABILITADO NA TABELA
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin';

-- 2. VERIFICAR TODAS AS POLÍTICAS DA TABELA (método correto)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as comando,
    qual as condicao_using,
    with_check as condicao_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin'
ORDER BY policyname;

-- 3. VERIFICAR SE A POLÍTICA ESPECÍFICA PARA PILOTOS EXISTE
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✅ POLÍTICA EXISTE'
        ELSE '❌ POLÍTICA NÃO EXISTE - PRECISA APLICAR'
    END as status_politica_pilotos
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';

-- 4. VERIFICAR POLÍTICAS USANDO pg_policy (método alternativo)
SELECT
    polname as nome_politica,
    polcmd as comando,
    polroles as roles,
    pg_get_expr(polqual, polrelid) as condicao_using,
    pg_get_expr(polwithcheck, polrelid) as condicao_check
FROM pg_policy
WHERE polrelid = 'public.notificacoes_admin'::regclass
ORDER BY polname;

-- =====================================================
-- INTERPRETAÇÃO:
-- - Se RLS não estiver habilitado: precisa executar ALTER TABLE ENABLE ROW LEVEL SECURITY
-- - Se não houver políticas: precisa aplicar scripts/fix_notificacoes_admin_rls_pilotos_defesa.sql
-- - Se houver políticas mas não a de pilotos: precisa aplicar apenas a política de pilotos
-- =====================================================