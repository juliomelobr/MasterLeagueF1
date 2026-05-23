-- ============================================
-- FIX RLS: Adicionar políticas DELETE para 
-- tabelas INTERESTS e CONTRACTS
-- ============================================

-- Política DELETE para INTERESTS (permitir deletar para usuários autenticados)
-- Isso permite que o painel Admin possa resetar o mercado
DROP POLICY IF EXISTS "interests_delete_policy" ON interests;
CREATE POLICY "interests_delete_policy" ON interests
    FOR DELETE USING (true); -- Permitir deletar (necessário para resetar mercado)

-- Política DELETE para CONTRACTS (permitir deletar para usuários autenticados)
-- Isso permite que o painel Admin possa resetar o mercado
DROP POLICY IF EXISTS "contracts_delete_policy" ON contracts;
CREATE POLICY "contracts_delete_policy" ON contracts
    FOR DELETE USING (true); -- Permitir deletar (necessário para resetar mercado)

-- Verificar se as políticas foram criadas
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename IN ('interests', 'contracts') 
AND cmd = 'DELETE'
ORDER BY tablename, policyname;










