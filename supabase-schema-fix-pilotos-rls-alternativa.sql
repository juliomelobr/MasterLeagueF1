-- =====================================================
-- SOLUÇÃO ALTERNATIVA - Desabilitar RLS temporariamente
-- =====================================================
-- Use este script APENAS se o script principal não funcionar
-- 
-- ATENÇÃO: Isso remove TODA a segurança RLS da tabela pilotos!
-- Use apenas para desenvolvimento/admin interno.
-- =====================================================

-- Desabilitar RLS completamente na tabela pilotos
ALTER TABLE pilotos DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- Para reativar RLS depois (quando implementar Edge Function):
-- =====================================================
-- ALTER TABLE pilotos ENABLE ROW LEVEL SECURITY;
-- 
-- E então criar uma Edge Function que use SERVICE_ROLE_KEY
-- =====================================================




































