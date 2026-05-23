-- Script para criar a tabela de contratos (contracts)
-- Execute este script no Supabase SQL Editor

-- Verificar se a tabela existe e criar se não existir
DO $$ 
BEGIN
    -- Criar tabela se não existir
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contracts') THEN
        CREATE TABLE contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pilot_cod_idml VARCHAR(50) NOT NULL, -- Código do piloto (ex: MLF1-0115)
            team_id UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
            grid VARCHAR(20) NOT NULL, -- 'carreira' ou 'light'
            season INTEGER NOT NULL DEFAULT 20,
            signed_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(pilot_cod_idml, grid, season) -- Um piloto só pode ter um contrato por grid/season
        );
        RAISE NOTICE 'Tabela contracts criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela contracts já existe. Verificando colunas...';
        
        -- Garantir coluna updated_at (necessária para a trigger)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'contracts' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE contracts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
            RAISE NOTICE 'Coluna updated_at adicionada à tabela contracts.';
        END IF;

        -- Adicionar colunas que podem estar faltando
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'pilot_cod_idml'
        ) THEN
            ALTER TABLE contracts ADD COLUMN pilot_cod_idml VARCHAR(50);
            RAISE NOTICE 'Coluna pilot_cod_idml adicionada à tabela contracts.';
        ELSE
            RAISE NOTICE 'Coluna pilot_cod_idml já existe na tabela contracts.';
        END IF;
        
        -- Verificar e adicionar coluna grid se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'grid'
        ) THEN
            ALTER TABLE contracts ADD COLUMN grid VARCHAR(20);
            RAISE NOTICE 'Coluna grid adicionada à tabela contracts.';
        END IF;
        
        -- Verificar e adicionar coluna season se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'season'
        ) THEN
            ALTER TABLE contracts ADD COLUMN season INTEGER DEFAULT 20;
            RAISE NOTICE 'Coluna season adicionada à tabela contracts.';
        END IF;
        
        -- Adicionar constraint UNIQUE apenas se todas as colunas existirem
        -- Verificar individualmente cada coluna
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'pilot_cod_idml'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'grid'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'season'
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'contracts_pilot_cod_idml_grid_season_key'
            ) THEN
                ALTER TABLE contracts ADD CONSTRAINT contracts_pilot_cod_idml_grid_season_key 
                    UNIQUE(pilot_cod_idml, grid, season);
                RAISE NOTICE 'Constraint UNIQUE adicionada à tabela contracts.';
            ELSE
                RAISE NOTICE 'Constraint UNIQUE já existe na tabela contracts.';
            END IF;
        ELSE
            RAISE NOTICE 'Aviso: Não foi possível criar constraint UNIQUE. Verifique se as colunas pilot_cod_idml, grid e season existem.';
        END IF;
    END IF;
END $$;

-- Criar índices para melhorar performance
DO $$ 
BEGIN
    -- Verificar se a coluna existe antes de criar índices
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' AND column_name = 'pilot_cod_idml'
    ) THEN
        -- Criar índices apenas se a coluna existir
        CREATE INDEX IF NOT EXISTS idx_contracts_pilot_cod_idml ON contracts(pilot_cod_idml);
        CREATE INDEX IF NOT EXISTS idx_contracts_pilot_grid_season ON contracts(pilot_cod_idml, grid, season);
    END IF;
    
    -- Índices que não dependem de pilot_cod_idml
    CREATE INDEX IF NOT EXISTS idx_contracts_team ON contracts(team_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_grid_season ON contracts(grid, season);
END $$;

-- Comentários nas colunas
COMMENT ON TABLE contracts IS 'Tabela de contratos assinados entre pilotos e equipes';
COMMENT ON COLUMN contracts.pilot_cod_idml IS 'Código único do piloto na liga (ex: MLF1-0115) - usado para vincular com draft_pilotos e pilotos';
COMMENT ON COLUMN contracts.team_id IS 'ID da equipe com a qual o piloto assinou contrato';
COMMENT ON COLUMN contracts.grid IS 'Grid do contrato (carreira ou light)';
COMMENT ON COLUMN contracts.signed_at IS 'Data e hora em que o contrato foi assinado';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza se a coluna existir (evita erro em bases antigas)
    BEGIN
        NEW.updated_at = NOW();
    EXCEPTION WHEN undefined_column THEN
        -- no-op
        NULL;
    END;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

