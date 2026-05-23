-- Script de migração rápida para corrigir a coluna pilot_id na tabela interests
-- Execute este script no Supabase SQL Editor para resolver o erro imediatamente

-- Tornar pilot_id opcional (permitir NULL) se existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'pilot_id'
    ) THEN
        -- Verificar se a coluna é NOT NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' 
            AND column_name = 'pilot_id' 
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE interests ALTER COLUMN pilot_id DROP NOT NULL;
            RAISE NOTICE '✅ Coluna pilot_id tornada opcional (permite NULL).';
        ELSE
            RAISE NOTICE 'ℹ️ Coluna pilot_id já permite NULL.';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Coluna pilot_id não existe na tabela.';
    END IF;
    
    -- Garantir que pilot_cod_idml existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'pilot_cod_idml'
    ) THEN
        ALTER TABLE interests ADD COLUMN pilot_cod_idml VARCHAR(50);
        RAISE NOTICE '✅ Coluna pilot_cod_idml adicionada.';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna pilot_cod_idml já existe.';
    END IF;
END $$;








