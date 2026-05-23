-- =====================================================
-- SCRIPT: Criar tabela de Narradores - Master League F1
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- URL: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new

-- 1. Criar tabela de narradores (se não existir)
CREATE TABLE IF NOT EXISTS public.narradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices (se não existirem)
CREATE INDEX IF NOT EXISTS idx_narradores_email ON public.narradores(email);
CREATE INDEX IF NOT EXISTS idx_narradores_ativo ON public.narradores(ativo);

-- 3. Adicionar comentários
COMMENT ON TABLE public.narradores IS 'Tabela para cadastro de narradores que terão acesso somente leitura aos painéis dos pilotos';
COMMENT ON COLUMN public.narradores.nome IS 'Nome do narrador';
COMMENT ON COLUMN public.narradores.email IS 'Email único do narrador para login';
COMMENT ON COLUMN public.narradores.senha_hash IS 'Hash da senha do narrador (SHA-256)';
COMMENT ON COLUMN public.narradores.ativo IS 'Se o narrador está ativo e pode acessar o sistema';

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.narradores ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "narradores_select" ON public.narradores;
DROP POLICY IF EXISTS "narradores_insert" ON public.narradores;
DROP POLICY IF EXISTS "narradores_update" ON public.narradores;
DROP POLICY IF EXISTS "narradores_delete" ON public.narradores;

-- 6. Criar políticas RLS

-- Política para SELECT: Todos podem ler (para verificar login)
CREATE POLICY "narradores_select" ON public.narradores
    FOR SELECT
    USING (true);

-- Política para INSERT: Permitir inserção para usuários autenticados
-- Nota: Se você estiver criando via admin autenticado, isso deve funcionar
CREATE POLICY "narradores_insert" ON public.narradores
    FOR INSERT
    WITH CHECK (true); -- Temporariamente permitir para todos, ajuste conforme necessário

-- Política para UPDATE: Permitir atualização para usuários autenticados
CREATE POLICY "narradores_update" ON public.narradores
    FOR UPDATE
    USING (true); -- Temporariamente permitir para todos, ajuste conforme necessário

-- Política para DELETE: Permitir exclusão para usuários autenticados
CREATE POLICY "narradores_delete" ON public.narradores
    FOR DELETE
    USING (true); -- Temporariamente permitir para todos, ajuste conforme necessário

-- =====================================================
-- VERIFICAÇÃO: Verificar se a tabela foi criada
-- =====================================================
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'narradores'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'narradores';

