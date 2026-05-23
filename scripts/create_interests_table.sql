-- Script para criar a tabela de propostas (interests)
-- Execute este script no Supabase SQL Editor

-- Verificar se a tabela existe e criar se não existir
DO $$ 
BEGIN
    -- Criar tabela se não existir
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'interests') THEN
        CREATE TABLE interests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pilot_cod_idml VARCHAR(50) NOT NULL, -- Código do piloto (ex: MLF1-0115)
            team_id UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
            grid VARCHAR(20) NOT NULL, -- 'carreira' ou 'light'
            season INTEGER NOT NULL DEFAULT 20,
            status VARCHAR(50) NOT NULL DEFAULT 'OFFER_SENT', -- 'OFFER_SENT', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela interests criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela interests já existe. Verificando e adicionando colunas necessárias...';
        
        -- Tornar pilot_id opcional se existir (permitir NULL)
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
                RAISE NOTICE 'Coluna pilot_id tornada opcional (permite NULL).';
            ELSE
                RAISE NOTICE 'Coluna pilot_id já permite NULL.';
            END IF;
        END IF;
        
        -- Adicionar coluna pilot_cod_idml se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' AND column_name = 'pilot_cod_idml'
        ) THEN
            ALTER TABLE interests ADD COLUMN pilot_cod_idml VARCHAR(50);
            RAISE NOTICE 'Coluna pilot_cod_idml adicionada à tabela interests.';
        ELSE
            RAISE NOTICE 'Coluna pilot_cod_idml já existe na tabela interests.';
        END IF;
        
        -- Verificar e adicionar coluna grid se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' AND column_name = 'grid'
        ) THEN
            ALTER TABLE interests ADD COLUMN grid VARCHAR(20);
            RAISE NOTICE 'Coluna grid adicionada à tabela interests.';
        END IF;
        
        -- Verificar e adicionar coluna season se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' AND column_name = 'season'
        ) THEN
            ALTER TABLE interests ADD COLUMN season INTEGER DEFAULT 20;
            RAISE NOTICE 'Coluna season adicionada à tabela interests.';
        END IF;
        
        -- Verificar e adicionar outras colunas necessárias
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' AND column_name = 'team_id'
        ) THEN
            ALTER TABLE interests ADD COLUMN team_id UUID REFERENCES equipes(id) ON DELETE CASCADE;
            RAISE NOTICE 'Coluna team_id adicionada à tabela interests.';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interests' AND column_name = 'status'
        ) THEN
            ALTER TABLE interests ADD COLUMN status VARCHAR(50) DEFAULT 'OFFER_SENT';
            RAISE NOTICE 'Coluna status adicionada à tabela interests.';
        END IF;
    END IF;
END $$;

-- Criar índices para melhorar performance
DO $$ 
BEGIN
    -- Verificar se as colunas existem antes de criar índices
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'pilot_cod_idml'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_interests_pilot_cod_idml ON interests(pilot_cod_idml);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'pilot_cod_idml'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_interests_pilot_status ON interests(pilot_cod_idml, status);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_interests_status ON interests(status);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'team_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_interests_team ON interests(team_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'grid'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interests' AND column_name = 'season'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_interests_grid_season ON interests(grid, season);
    END IF;
END $$;

-- Comentários nas colunas
COMMENT ON TABLE interests IS 'Tabela de propostas de contrato enviadas pelas equipes aos pilotos';
COMMENT ON COLUMN interests.pilot_cod_idml IS 'Código único do piloto na liga (ex: MLF1-0115) - usado para vincular com draft_pilotos e pilotos';
COMMENT ON COLUMN interests.team_id IS 'ID da equipe que está fazendo a proposta';
COMMENT ON COLUMN interests.grid IS 'Grid da proposta (carreira ou light)';
COMMENT ON COLUMN interests.status IS 'Status da proposta: OFFER_SENT, ACCEPTED, REJECTED, WITHDRAWN';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interests_updated_at BEFORE UPDATE ON interests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

