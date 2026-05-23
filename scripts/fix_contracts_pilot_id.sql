-- Script para tornar a coluna pilot_id opcional na tabela contracts
-- Execute este script no Supabase SQL Editor

DO $$
BEGIN
    -- Verificar se a tabela contracts existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contracts') THEN
        -- Verificar se a coluna pilot_id existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'pilot_id'
        ) THEN
            -- Verificar se a coluna é NOT NULL
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'contracts' 
                AND column_name = 'pilot_id' 
                AND is_nullable = 'NO'
            ) THEN
                -- Tornar a coluna pilot_id opcional (permite NULL)
                ALTER TABLE contracts ALTER COLUMN pilot_id DROP NOT NULL;
                RAISE NOTICE 'Coluna pilot_id tornada opcional (permite NULL) na tabela contracts.';
            ELSE
                RAISE NOTICE 'Coluna pilot_id já permite NULL na tabela contracts.';
            END IF;
        ELSE
            RAISE NOTICE 'Coluna pilot_id não existe na tabela contracts.';
        END IF;
        
        -- Garantir que pilot_cod_idml existe e é NOT NULL
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'pilot_cod_idml'
        ) THEN
            ALTER TABLE contracts ADD COLUMN pilot_cod_idml VARCHAR(50);
            RAISE NOTICE 'Coluna pilot_cod_idml adicionada à tabela contracts.';
        END IF;
        
        -- Tornar pilot_cod_idml NOT NULL se ainda não for
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' 
            AND column_name = 'pilot_cod_idml' 
            AND is_nullable = 'YES'
        ) THEN
            -- Primeiro, atualizar registros NULL com um valor temporário se houver
            -- (isso é apenas uma precaução, não deve ser necessário se a migração foi feita corretamente)
            UPDATE contracts 
            SET pilot_cod_idml = 'TEMP-' || id::text 
            WHERE pilot_cod_idml IS NULL;
            
            -- Agora tornar NOT NULL
            ALTER TABLE contracts ALTER COLUMN pilot_cod_idml SET NOT NULL;
            RAISE NOTICE 'Coluna pilot_cod_idml tornada NOT NULL na tabela contracts.';
        ELSE
            RAISE NOTICE 'Coluna pilot_cod_idml já é NOT NULL na tabela contracts.';
        END IF;
    ELSE
        RAISE NOTICE 'Tabela contracts não existe.';
    END IF;
END $$;








