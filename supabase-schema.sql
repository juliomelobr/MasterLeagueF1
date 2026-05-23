-- Criar tabela PILOTOS
CREATE TABLE IF NOT EXISTS pilotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    grid VARCHAR NOT NULL, -- 'carreira' ou 'light'
    equipe VARCHAR,
    whatsapp VARCHAR,
    is_steward BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela LANCES (Incidents)
CREATE TABLE IF NOT EXISTS lances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR NOT NULL UNIQUE, -- STW-C190301 format
    season INTEGER NOT NULL,
    round INTEGER NOT NULL,
    grid VARCHAR NOT NULL, -- 'carreira' ou 'light'
    order_number INTEGER NOT NULL, -- Para gerar código
    status VARCHAR DEFAULT 'aberto', -- 'aberto', 'fechado', 'em_analise'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela ACUSAÇÕES
CREATE TABLE IF NOT EXISTS acusacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lance_id UUID NOT NULL REFERENCES lances(id) ON DELETE CASCADE,
    piloto_acusador_id UUID NOT NULL REFERENCES pilotos(id),
    piloto_acusado_id UUID NOT NULL REFERENCES pilotos(id),
    descricao TEXT NOT NULL,
    video_link VARCHAR,
    status VARCHAR DEFAULT 'pendente', -- 'pendente', 'recebida', 'contestada'
    deadline_brt TIMESTAMP, -- Próximo dia 20:00 BRT para Grid Light
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela DEFESAS
CREATE TABLE IF NOT EXISTS defesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acusacao_id UUID NOT NULL REFERENCES acusacoes(id) ON DELETE CASCADE,
    piloto_acusado_id UUID NOT NULL REFERENCES pilotos(id),
    descricao TEXT NOT NULL,
    video_link VARCHAR,
    status VARCHAR DEFAULT 'enviada', -- 'enviada', 'recebida'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela VEREDITOS
CREATE TABLE IF NOT EXISTS verdicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lance_id UUID NOT NULL REFERENCES lances(id) ON DELETE CASCADE,
    resultado VARCHAR NOT NULL, -- 'absolvido', 'culpado'
    penalty_type VARCHAR, -- 'advertencia', 'leve', 'media', 'grave', 'gravissima'
    agravante BOOLEAN DEFAULT FALSE,
    pontos_deducted INTEGER DEFAULT 0, -- Pontos descontados
    race_ban BOOLEAN DEFAULT FALSE, -- Ban na próxima corrida se >20pts
    explanation TEXT,
    steward_id UUID REFERENCES pilotos(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela EMAIL_LOG (para rastrear notificações)
CREATE TABLE IF NOT EXISTS email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario VARCHAR NOT NULL,
    assunto VARCHAR NOT NULL,
    tipo VARCHAR NOT NULL, -- 'acusacao', 'defesa', 'veredito'
    referencia_id UUID,
    status VARCHAR DEFAULT 'pendente', -- 'pendente', 'enviado', 'falha'
    tentativas INTEGER DEFAULT 0,
    erro TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela NOTIFICACOES_ADMIN (para receber acusações/defesas automaticamente)
CREATE TABLE IF NOT EXISTS notificacoes_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR NOT NULL, -- 'nova_acusacao', 'nova_defesa', 'urgente'
    dados JSONB NOT NULL, -- Dados completos da notificação em JSON
    mensagem TEXT, -- Mensagem formatada para WhatsApp
    lido BOOLEAN DEFAULT FALSE,
    processado BOOLEAN DEFAULT FALSE, -- Se já foi enviado via WhatsApp/Email
    created_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES para melhor performance
CREATE INDEX idx_acusacoes_lance ON acusacoes(lance_id);
CREATE INDEX idx_acusacoes_acusador ON acusacoes(piloto_acusador_id);
CREATE INDEX idx_acusacoes_acusado ON acusacoes(piloto_acusado_id);
CREATE INDEX idx_defesas_acusacao ON defesas(acusacao_id);
CREATE INDEX idx_verdicts_lance ON verdicts(lance_id);
CREATE INDEX idx_email_log_tipo ON email_log(tipo);
CREATE INDEX idx_lances_season_round ON lances(season, round);
CREATE INDEX idx_notificacoes_admin_tipo ON notificacoes_admin(tipo);
CREATE INDEX idx_notificacoes_admin_lido ON notificacoes_admin(lido);

-- Row Level Security (RLS)
ALTER TABLE pilotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lances ENABLE ROW LEVEL SECURITY;
ALTER TABLE acusacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE defesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_admin ENABLE ROW LEVEL SECURITY;

-- Policies para PILOTOS (públicos podem ler, apenas admin escrever)
CREATE POLICY pilotos_read ON pilotos FOR SELECT USING (true);
CREATE POLICY pilotos_insert ON pilotos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = COALESCE((SELECT id FROM pilotos WHERE email = auth.jwt() -> 'email'), auth.uid()));
CREATE POLICY pilotos_update ON pilotos FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Policies para ACUSAÇÕES (ler próprias ou stewards; enviar se logado)
CREATE POLICY acusacoes_read ON acusacoes FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
        piloto_acusador_id = (SELECT id FROM pilotos WHERE email = auth.jwt() -> 'email') OR
        piloto_acusado_id = (SELECT id FROM pilotos WHERE email = auth.jwt() -> 'email') OR
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
    )
);
CREATE POLICY acusacoes_insert ON acusacoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY acusacoes_update ON acusacoes FOR UPDATE USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);

-- Policies para DEFESAS (ler próprias ou stewards)
CREATE POLICY defesas_read ON defesas FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
        piloto_acusado_id = (SELECT id FROM pilotos WHERE email = auth.jwt() -> 'email') OR
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
    )
);
CREATE POLICY defesas_insert ON defesas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies para VERDICTS (apenas stewards podem ler/escrever)
CREATE POLICY verdicts_read ON verdicts FOR SELECT USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);
CREATE POLICY verdicts_insert ON verdicts FOR INSERT WITH CHECK (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);
CREATE POLICY verdicts_update ON verdicts FOR UPDATE USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);

-- Policies para LANCES (públicos podem ler)
CREATE POLICY lances_read ON lances FOR SELECT USING (true);
CREATE POLICY lances_insert ON lances FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policies para EMAIL_LOG (apenas admin)
CREATE POLICY email_log_read ON email_log FOR SELECT USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);

-- Policies para NOTIFICACOES_ADMIN (qualquer logado pode inserir, apenas admin lê)
CREATE POLICY notificacoes_admin_insert ON notificacoes_admin FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY notificacoes_admin_read ON notificacoes_admin FOR SELECT USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);
CREATE POLICY notificacoes_admin_update ON notificacoes_admin FOR UPDATE USING (
    (SELECT is_steward FROM pilotos WHERE email = auth.jwt() -> 'email' LIMIT 1) = true
);

-- Commented out: Inserir pilotos manualmente no Supabase via UI ou via este script
-- INSERT INTO pilotos (nome, email, grid, equipe, whatsapp, is_steward) VALUES
-- ('PILOTO1', 'email@example.com', 'carreira', 'EQUIPE1', '+55 11 99999-9999', false),
-- ('STEWARD1', 'steward@example.com', 'carreira', 'STEWARDS', '+55 11 99999-9999', true);
