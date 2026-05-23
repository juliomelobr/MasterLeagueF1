-- =====================================================
-- CRIAR TABELA NARRADORES - Master League F1
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- URL: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new

-- Criar tabela
CREATE TABLE IF NOT EXISTS public.narradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    senha_hash VARCHAR(255) DEFAULT NULL,
    senha_definida BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_narradores_email ON public.narradores(email);
CREATE INDEX IF NOT EXISTS idx_narradores_ativo ON public.narradores(ativo);

-- Habilitar RLS
ALTER TABLE public.narradores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "narradores_select" ON public.narradores;
DROP POLICY IF EXISTS "narradores_insert" ON public.narradores;
DROP POLICY IF EXISTS "narradores_update" ON public.narradores;
DROP POLICY IF EXISTS "narradores_delete" ON public.narradores;

-- Criar políticas RLS
CREATE POLICY "narradores_select" ON public.narradores
    FOR SELECT USING (true);

CREATE POLICY "narradores_insert" ON public.narradores
    FOR INSERT WITH CHECK (true);

CREATE POLICY "narradores_update" ON public.narradores
    FOR UPDATE USING (true);

CREATE POLICY "narradores_delete" ON public.narradores
    FOR DELETE USING (true);

-- Verificar se foi criada
SELECT 'Tabela narradores criada com sucesso!' as status;

