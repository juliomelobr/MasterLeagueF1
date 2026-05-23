-- FIX RLS - Adicionar política DELETE para tabela PILOTOS (Versão Admin)
-- Esta versão permite DELETE para usuários autenticados (necessário para o painel Admin)
-- O painel Admin usa autenticação por senha local, não via Supabase Auth

-- Remover política DELETE existente se houver (para recriar)
DROP POLICY IF EXISTS pilotos_delete ON pilotos;

-- Opção 1: Permitir DELETE para qualquer usuário autenticado (para funcionar com Admin)
-- Esta é a opção mais simples e permite que o painel Admin funcione
CREATE POLICY pilotos_delete ON pilotos 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Opção 2: Se preferir manter mais seguro, pode usar service_role key no código
-- Mas isso requer mudanças no código do Admin.jsx para usar service_role
-- Por enquanto, a Opção 1 é a mais prática

-- Verificar se a política foi criada
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'pilotos' AND cmd = 'DELETE';































