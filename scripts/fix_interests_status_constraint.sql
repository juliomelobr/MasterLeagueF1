-- Script para corrigir a constraint de status na tabela interests
-- Adiciona 'WITHDRAWN' como valor válido para o campo status

DO $$
BEGIN
    -- Verificar se a constraint existe e removê-la
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'interests_status_check'
        AND conrelid = 'interests'::regclass
    ) THEN
        ALTER TABLE interests DROP CONSTRAINT interests_status_check;
        RAISE NOTICE 'Constraint interests_status_check removida.';
    END IF;
    
    -- Criar nova constraint com todos os valores válidos
    ALTER TABLE interests 
    ADD CONSTRAINT interests_status_check 
    CHECK (status IN ('OFFER_SENT', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'));
    
    RAISE NOTICE 'Constraint interests_status_check criada com sucesso incluindo WITHDRAWN.';
END $$;








