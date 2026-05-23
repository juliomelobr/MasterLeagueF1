-- ============================================
-- SCHEMA: MERCADO DE PILOTOS - TEMPORADA 20
-- Sistema de Manifestação de Interesse e Matchmaking
-- ============================================

-- Tabela de EQUIPES (Master Tiers)
CREATE TABLE IF NOT EXISTS equipes (
    id VARCHAR PRIMARY KEY, -- 'ferrari', 'redbull', etc
    name VARCHAR NOT NULL,
    tier VARCHAR NOT NULL CHECK (tier IN ('GOLD', 'SILVER', 'BRONZE')),
    slots INTEGER DEFAULT 2,
    color VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar coluna draft_priority na tabela PILOTOS (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pilotos' AND column_name = 'draft_priority'
    ) THEN
        ALTER TABLE pilotos ADD COLUMN draft_priority INTEGER;
        COMMENT ON COLUMN pilotos.draft_priority IS 'Prioridade de draft T20 (1 = maior prioridade, 20 = menor). Inverso do Power Ranking T19.';
    END IF;
END $$;

-- Tabela de INTERESTS (Manifestações de Interesse)
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    pilot_id UUID NOT NULL REFERENCES pilotos(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OFFER_SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    offer_expires_at TIMESTAMP, -- NULL se status for PENDING
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, pilot_id) -- Um piloto só pode ter um interesse por equipe
);

-- Tabela de CONTRATOS (Contratos assinados)
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id VARCHAR NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    pilot_id UUID NOT NULL REFERENCES pilotos(id) ON DELETE CASCADE,
    signed_at TIMESTAMP DEFAULT NOW(),
    season INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, pilot_id, season) -- Um piloto só pode ter um contrato por equipe por temporada
);

-- ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_interests_team ON interests(team_id);
CREATE INDEX IF NOT EXISTS idx_interests_pilot ON interests(pilot_id);
CREATE INDEX IF NOT EXISTS idx_interests_status ON interests(status);
CREATE INDEX IF NOT EXISTS idx_contracts_team ON contracts(team_id);
CREATE INDEX IF NOT EXISTS idx_contracts_pilot ON contracts(pilot_id);
CREATE INDEX IF NOT EXISTS idx_contracts_season ON contracts(season);
CREATE INDEX IF NOT EXISTS idx_pilotos_draft_priority ON pilotos(draft_priority);

-- ROW LEVEL SECURITY
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para EQUIPES (leitura pública)
CREATE POLICY "equipes_select_policy" ON equipes
    FOR SELECT USING (true);

-- Políticas RLS para INTERESTS
CREATE POLICY "interests_select_policy" ON interests
    FOR SELECT USING (true); -- Todos podem ver interesses

CREATE POLICY "interests_insert_policy" ON interests
    FOR INSERT WITH CHECK (true); -- Pilotos podem manifestar interesse

CREATE POLICY "interests_update_policy" ON interests
    FOR UPDATE USING (true); -- Atualizações permitidas (matchmaking)

-- Políticas RLS para CONTRATOS (leitura pública)
CREATE POLICY "contracts_select_policy" ON contracts
    FOR SELECT USING (true);

CREATE POLICY "contracts_insert_policy" ON contracts
    FOR INSERT WITH CHECK (true); -- Assinatura de contratos

-- ============================================
-- FUNÇÃO: Validar se piloto é ativo antes de criar interesse
-- ============================================
CREATE OR REPLACE FUNCTION validate_pilot_active()
RETURNS TRIGGER AS $$
DECLARE
    pilot_record RECORD;
BEGIN
    -- Buscar dados do piloto
    SELECT tipo_piloto, status INTO pilot_record
    FROM pilotos
    WHERE id = NEW.pilot_id;
    
    -- Verificar se piloto existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Piloto não encontrado';
    END IF;
    
    -- Verificar se é piloto ativo
    IF pilot_record.tipo_piloto = 'ex-piloto' OR 
       (pilot_record.status IS NOT NULL AND pilot_record.status NOT IN ('ativo', 'ATIVO')) THEN
        RAISE EXCEPTION 'Apenas pilotos ativos podem participar do Draft';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar antes de inserir interesse
DROP TRIGGER IF EXISTS trigger_validate_pilot_active ON interests;
CREATE TRIGGER trigger_validate_pilot_active
    BEFORE INSERT ON interests
    FOR EACH ROW
    EXECUTE FUNCTION validate_pilot_active();

-- ============================================
-- FUNÇÃO: Matchmaking Automático
-- Executa quando um interesse é criado/atualizado
-- ============================================
CREATE OR REPLACE FUNCTION process_matchmaking()
RETURNS TRIGGER AS $$
DECLARE
    team_slots INTEGER;
    current_contracts INTEGER;
    available_slots INTEGER;
    top_pilot RECORD;
BEGIN
    -- Verificar quantas vagas a equipe tem disponíveis
    SELECT slots INTO team_slots FROM equipes WHERE id = NEW.team_id;
    SELECT COUNT(*) INTO current_contracts FROM contracts WHERE team_id = NEW.team_id AND season = 20;
    available_slots := team_slots - current_contracts;

    -- Se não há vagas, não fazer nada
    IF available_slots <= 0 THEN
        RETURN NEW;
    END IF;

    -- Se o interesse foi aceito, criar contrato
    IF NEW.status = 'ACCEPTED' THEN
        INSERT INTO contracts (team_id, pilot_id, season)
        VALUES (NEW.team_id, NEW.pilot_id, 20)
        ON CONFLICT (team_id, pilot_id, season) DO NOTHING;
        
        -- Cancelar outros interesses do piloto
        UPDATE interests 
        SET status = 'REJECTED', updated_at = NOW()
        WHERE pilot_id = NEW.pilot_id 
        AND id != NEW.id 
        AND status IN ('PENDING', 'OFFER_SENT');
        
        RETURN NEW;
    END IF;

    -- Se status mudou para PENDING ou foi criado novo interesse
    IF NEW.status = 'PENDING' THEN
        -- Buscar o piloto com maior prioridade (menor draft_priority) que manifestou interesse
        -- e que não tem proposta ativa de outra equipe
        -- IMPORTANTE: Apenas pilotos ativos podem participar
        SELECT i.*, p.draft_priority
        INTO top_pilot
        FROM interests i
        JOIN pilotos p ON i.pilot_id = p.id
        WHERE i.team_id = NEW.team_id
        AND i.status = 'PENDING'
        AND (p.tipo_piloto = 'ativo' OR p.tipo_piloto IS NULL) -- Apenas pilotos ativos
        AND (p.status = 'ativo' OR p.status = 'ATIVO' OR p.status IS NULL) -- Status ativo
        AND NOT EXISTS (
            SELECT 1 FROM interests i2 
            WHERE i2.pilot_id = i.pilot_id 
            AND i2.status = 'OFFER_SENT' 
            AND i2.id != i.id
        )
        AND NOT EXISTS (
            SELECT 1 FROM contracts c 
            WHERE c.pilot_id = i.pilot_id 
            AND c.season = 20
        )
        ORDER BY p.draft_priority ASC NULLS LAST
        LIMIT 1;

        -- Se encontrou piloto, enviar proposta
        IF top_pilot IS NOT NULL THEN
            UPDATE interests
            SET status = 'OFFER_SENT',
                offer_expires_at = NOW() + INTERVAL '24 hours',
                updated_at = NOW()
            WHERE id = top_pilot.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER para matchmaking automático
DROP TRIGGER IF EXISTS trigger_matchmaking ON interests;
CREATE TRIGGER trigger_matchmaking
    AFTER INSERT OR UPDATE ON interests
    FOR EACH ROW
    EXECUTE FUNCTION process_matchmaking();

-- ============================================
-- FUNÇÃO: Limpar propostas expiradas
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_offers()
RETURNS void AS $$
BEGIN
    -- Marcar propostas expiradas
    UPDATE interests
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'OFFER_SENT'
    AND offer_expires_at < NOW();

    -- Processar matchmaking novamente para equipes que tiveram propostas expiradas
    PERFORM process_matchmaking();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INSERIR DADOS INICIAIS DAS EQUIPES
-- ============================================
INSERT INTO equipes (id, name, tier, slots, color) VALUES
    -- MASTER GOLD
    ('ferrari', 'Ferrari', 'GOLD', 2, '#FF0000'),
    ('redbull', 'Red Bull Racing', 'GOLD', 2, '#0600EF'),
    ('mclaren', 'McLaren', 'GOLD', 2, '#FF8700'),
    
    -- MASTER SILVER
    ('mercedes', 'Mercedes-AMG', 'SILVER', 2, '#00D2BE'),
    ('astonmartin', 'Aston Martin', 'SILVER', 2, '#006F62'),
    ('alpine', 'Alpine', 'SILVER', 2, '#0090FF'),
    
    -- MASTER BRONZE
    ('racingbulls', 'Racing Bulls', 'BRONZE', 2, '#6692FF'),
    ('williams', 'Williams', 'BRONZE', 2, '#005AFF'),
    ('haas', 'Haas', 'BRONZE', 2, '#B6BABD'),
    ('sauber', 'Sauber', 'BRONZE', 2, '#52E252')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tier = EXCLUDED.tier,
    slots = EXCLUDED.slots,
    color = EXCLUDED.color,
    updated_at = NOW();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE equipes IS 'Equipes da Master League F1 com seus tiers (GOLD, SILVER, BRONZE)';
COMMENT ON TABLE interests IS 'Manifestações de interesse dos pilotos nas equipes. Status: PENDING -> OFFER_SENT -> ACCEPTED/REJECTED';
COMMENT ON TABLE contracts IS 'Contratos assinados entre pilotos e equipes por temporada';
COMMENT ON COLUMN pilotos.draft_priority IS 'Prioridade de draft T20. 1 = maior prioridade (escolhe primeiro), 20 = menor prioridade (campeão escolhe por último)';


