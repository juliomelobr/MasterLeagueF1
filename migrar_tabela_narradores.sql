-- =====================================================
-- MIGRAÇÃO: Atualizar tabela narradores existente
-- =====================================================
-- Execute este script se a tabela narradores já existe
-- URL: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/sql/new

-- Adicionar coluna whatsapp se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'narradores' 
        AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE public.narradores ADD COLUMN whatsapp VARCHAR(20);
    END IF;
END $$;

-- Tornar senha_hash opcional (permitir NULL)
ALTER TABLE public.narradores ALTER COLUMN senha_hash DROP NOT NULL;

-- Adicionar coluna senha_definida se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'narradores' 
        AND column_name = 'senha_definida'
    ) THEN
        ALTER TABLE public.narradores ADD COLUMN senha_definida BOOLEAN DEFAULT false;
        
        -- Atualizar registros existentes: se tem senha_hash, senha_definida = true
        UPDATE public.narradores 
        SET senha_definida = (senha_hash IS NOT NULL AND senha_hash != '');
    END IF;
END $$;

-- Verificar estrutura atualizada
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'narradores'
ORDER BY ordinal_position;

