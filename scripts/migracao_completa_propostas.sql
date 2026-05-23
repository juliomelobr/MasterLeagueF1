-- =====================================================
-- MIGRAÇÃO COMPLETA: Sistema de Propostas e Contratos
-- =====================================================
-- Este script garante que as tabelas interests e contracts
-- tenham a estrutura correta com pilot_cod_idml
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: TABELA INTERESTS
-- =====================================================

-- Tornar pilot_id opcional (se existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'pilot_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' 
            AND column_name = 'pilot_id' 
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE interests ALTER COLUMN pilot_id DROP NOT NULL;
            RAISE NOTICE '✅ Coluna pilot_id tornada opcional.';
        END IF;
    END IF;
END $$;

-- Adicionar coluna pilot_cod_idml se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'pilot_cod_idml'
    ) THEN
        ALTER TABLE interests ADD COLUMN pilot_cod_idml VARCHAR(50);
        RAISE NOTICE '✅ Coluna pilot_cod_idml adicionada à tabela interests.';
    END IF;
END $$;

-- Adicionar coluna grid se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'grid'
    ) THEN
        ALTER TABLE interests ADD COLUMN grid VARCHAR(20);
        RAISE NOTICE '✅ Coluna grid adicionada à tabela interests.';
    END IF;
END $$;

-- Adicionar coluna season se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'season'
    ) THEN
        ALTER TABLE interests ADD COLUMN season INTEGER DEFAULT 20;
        RAISE NOTICE '✅ Coluna season adicionada à tabela interests.';
    END IF;
END $$;

-- Normalizar todos os pilot_cod_idml existentes (trim + uppercase)
UPDATE interests 
SET pilot_cod_idml = TRIM(UPPER(pilot_cod_idml))
WHERE pilot_cod_idml IS NOT NULL
AND pilot_cod_idml != TRIM(UPPER(pilot_cod_idml));

-- Tornar pilot_cod_idml NOT NULL (após garantir que não há NULL)
DO $$
BEGIN
    -- Primeiro, verificar se há NULLs
    IF EXISTS (SELECT 1 FROM interests WHERE pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '') THEN
        RAISE NOTICE '⚠️ AVISO: Existem registros com pilot_cod_idml NULL. Corrija antes de tornar NOT NULL.';
    ELSE
        -- Se não há NULLs, tornar NOT NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' 
            AND column_name = 'pilot_cod_idml' 
            AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE interests ALTER COLUMN pilot_cod_idml SET NOT NULL;
            RAISE NOTICE '✅ Coluna pilot_cod_idml tornada NOT NULL.';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PARTE 2: TABELA CONTRACTS
-- =====================================================

-- Tornar pilot_id opcional (se existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'pilot_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' 
            AND column_name = 'pilot_id' 
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE contracts ALTER COLUMN pilot_id DROP NOT NULL;
            RAISE NOTICE '✅ Coluna pilot_id tornada opcional na tabela contracts.';
        END IF;
    END IF;
END $$;

-- Adicionar coluna pilot_cod_idml se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'pilot_cod_idml'
    ) THEN
        ALTER TABLE contracts ADD COLUMN pilot_cod_idml VARCHAR(50);
        RAISE NOTICE '✅ Coluna pilot_cod_idml adicionada à tabela contracts.';
    END IF;
END $$;

-- Adicionar coluna grid se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'grid'
    ) THEN
        ALTER TABLE contracts ADD COLUMN grid VARCHAR(20);
        RAISE NOTICE '✅ Coluna grid adicionada à tabela contracts.';
    END IF;
END $$;

-- Garantir coluna updated_at (necessária para trigger/auditoria e para evitar erro em UPDATE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'contracts' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE contracts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✅ Coluna updated_at adicionada à tabela contracts.';
    END IF;
END $$;

-- Normalizar todos os pilot_cod_idml existentes (trim + uppercase)
UPDATE contracts 
SET pilot_cod_idml = TRIM(UPPER(pilot_cod_idml))
WHERE pilot_cod_idml IS NOT NULL
AND pilot_cod_idml != TRIM(UPPER(pilot_cod_idml));

-- Tornar pilot_cod_idml NOT NULL (após garantir que não há NULL)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM contracts WHERE pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '') THEN
        RAISE NOTICE '⚠️ AVISO: Existem registros com pilot_cod_idml NULL. Corrija antes de tornar NOT NULL.';
    ELSE
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' 
            AND column_name = 'pilot_cod_idml' 
            AND is_nullable = 'YES'
        ) THEN
            ALTER TABLE contracts ALTER COLUMN pilot_cod_idml SET NOT NULL;
            RAISE NOTICE '✅ Coluna pilot_cod_idml tornada NOT NULL na tabela contracts.';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PARTE 3: ÍNDICES
-- =====================================================

-- Criar índices para interests
CREATE INDEX IF NOT EXISTS idx_interests_pilot_cod_idml ON interests(pilot_cod_idml);
CREATE INDEX IF NOT EXISTS idx_interests_pilot_status ON interests(pilot_cod_idml, status);
CREATE INDEX IF NOT EXISTS idx_interests_status ON interests(status);
CREATE INDEX IF NOT EXISTS idx_interests_grid_season ON interests(grid, season);

-- Criar índices para contracts
CREATE INDEX IF NOT EXISTS idx_contracts_pilot_cod_idml ON contracts(pilot_cod_idml);
CREATE INDEX IF NOT EXISTS idx_contracts_pilot_grid_season ON contracts(pilot_cod_idml, grid, season);
CREATE INDEX IF NOT EXISTS idx_contracts_grid_season ON contracts(grid, season);

-- =====================================================
-- PARTE 4: CONSTRAINTS
-- =====================================================

-- Remover constraint antiga se existir (pilot_id, team_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'interests_team_id_pilot_id_key'
    ) THEN
        ALTER TABLE interests DROP CONSTRAINT interests_team_id_pilot_id_key;
        RAISE NOTICE '✅ Constraint antiga removida (interests_team_id_pilot_id_key).';
    END IF;
END $$;

-- Adicionar constraint UNIQUE para (pilot_cod_idml, team_id, grid, season) se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'interests_pilot_cod_idml_team_grid_season_key'
    ) THEN
        -- Só criar se não houver duplicatas
        IF NOT EXISTS (
            SELECT pilot_cod_idml, team_id, grid, season, COUNT(*)
            FROM interests
            WHERE pilot_cod_idml IS NOT NULL
            GROUP BY pilot_cod_idml, team_id, grid, season
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE interests 
            ADD CONSTRAINT interests_pilot_cod_idml_team_grid_season_key 
            UNIQUE(pilot_cod_idml, team_id, grid, season);
            RAISE NOTICE '✅ Constraint UNIQUE adicionada (interests).';
        ELSE
            RAISE NOTICE '⚠️ AVISO: Existem duplicatas. Remova duplicatas antes de criar constraint.';
        END IF;
    END IF;
END $$;

-- Garantir constraint UNIQUE para contracts (pilot_cod_idml, grid, season)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'contracts_pilot_cod_idml_grid_season_key'
    ) THEN
        IF NOT EXISTS (
            SELECT pilot_cod_idml, grid, season, COUNT(*)
            FROM contracts
            WHERE pilot_cod_idml IS NOT NULL
            GROUP BY pilot_cod_idml, grid, season
            HAVING COUNT(*) > 1
        ) THEN
            ALTER TABLE contracts 
            ADD CONSTRAINT contracts_pilot_cod_idml_grid_season_key 
            UNIQUE(pilot_cod_idml, grid, season);
            RAISE NOTICE '✅ Constraint UNIQUE adicionada (contracts).';
        ELSE
            RAISE NOTICE '⚠️ AVISO: Existem duplicatas. Remova duplicatas antes de criar constraint.';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PARTE 5: TRIGGER - Rejeitar Propostas ao Criar Contrato
-- =====================================================

CREATE OR REPLACE FUNCTION reject_pilot_proposals_on_contract()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um novo contrato é criado, marcar todas as propostas
    -- OFFER_SENT deste piloto (no mesmo grid e season) como REJECTED
    UPDATE interests 
    SET 
        status = 'REJECTED',
        updated_at = NOW()
    WHERE 
        pilot_cod_idml = NEW.pilot_cod_idml
        AND status = 'OFFER_SENT'
        AND grid = NEW.grid
        AND season = NEW.season;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_reject_proposals_on_contract ON contracts;

-- Criar trigger que executa após INSERT na tabela contracts
CREATE TRIGGER trigger_reject_proposals_on_contract
    AFTER INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION reject_pilot_proposals_on_contract();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    'MIGRAÇÃO CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM interests WHERE pilot_cod_idml IS NOT NULL) as interests_com_cod_idml,
    (SELECT COUNT(*) FROM contracts WHERE pilot_cod_idml IS NOT NULL) as contracts_com_cod_idml,
    (SELECT COUNT(*) FROM interests WHERE pilot_cod_idml IS NULL) as interests_sem_cod_idml,
    (SELECT COUNT(*) FROM contracts WHERE pilot_cod_idml IS NULL) as contracts_sem_cod_idml;

