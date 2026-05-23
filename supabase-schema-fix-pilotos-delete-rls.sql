-- FIX RLS - Adicionar política DELETE para tabela PILOTOS
-- Este script adiciona uma política que permite deletar pilotos para usuários autenticados
-- (Ajuste conforme necessário para suas regras de negócio)

-- Remover política DELETE existente se houver (para recriar)
DROP POLICY IF EXISTS pilotos_delete ON pilotos;

-- Criar política DELETE para pilotos
-- Opção 1: Permitir DELETE para qualquer usuário autenticado (menos seguro)
-- CREATE POLICY pilotos_delete ON pilotos FOR DELETE USING (auth.uid() IS NOT NULL);

-- Opção 2: Permitir DELETE apenas para stewards (mais seguro - RECOMENDADO)
-- Usando auth.email() que retorna o email diretamente como text
CREATE POLICY pilotos_delete ON pilotos 
FOR DELETE 
USING (
    auth.uid() IS NOT NULL AND 
    (SELECT is_steward FROM pilotos WHERE email = auth.email() LIMIT 1) = true
);

-- Opção 3: Permitir DELETE apenas para o próprio piloto ou stewards
-- CREATE POLICY pilotos_delete ON pilotos 
-- FOR DELETE 
-- USING (
--     auth.uid() IS NOT NULL AND (
--         id = (SELECT id FROM pilotos WHERE email = auth.email() LIMIT 1) OR
--         (SELECT is_steward FROM pilotos WHERE email = auth.email() LIMIT 1) = true
--     )
-- );

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

