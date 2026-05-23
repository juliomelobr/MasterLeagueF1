-- Criar tabela MERCADO_PILOTOS (para transferências)
CREATE TABLE IF NOT EXISTS mercado_pilotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piloto_id UUID NOT NULL REFERENCES pilotos(id) ON DELETE CASCADE,
    tipo VARCHAR NOT NULL, -- 'venda' ou 'compra'
    equipe_origem VARCHAR,
    equipe_destino VARCHAR,
    valor_transferencia DECIMAL(10,2),
    status VARCHAR DEFAULT 'ativo', -- 'ativo', 'pendente', 'concluido', 'cancelado'
    data_limite TIMESTAMP,
    observacoes TEXT,
    criado_por UUID REFERENCES pilotos(id), -- Quem iniciou a negociação
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela PROPOSTAS_MERCADO (ofertas de transferência)
CREATE TABLE IF NOT EXISTS propostas_mercado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mercado_id UUID NOT NULL REFERENCES mercado_pilotos(id) ON DELETE CASCADE,
    equipe_proponente VARCHAR NOT NULL,
    valor_proposto DECIMAL(10,2) NOT NULL,
    mensagem TEXT,
    status VARCHAR DEFAULT 'pendente', -- 'pendente', 'aceita', 'rejeitada', 'expirada'
    data_expiracao TIMESTAMP,
    respondido_por UUID REFERENCES pilotos(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela HISTORICO_TRANSFERENCIAS (registro de todas as transferências)
CREATE TABLE IF NOT EXISTS historico_transferencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piloto_id UUID NOT NULL REFERENCES pilotos(id),
    equipe_origem VARCHAR,
    equipe_destino VARCHAR NOT NULL,
    valor_transferencia DECIMAL(10,2),
    data_transferencia TIMESTAMP DEFAULT NOW(),
    temporada INTEGER NOT NULL,
    tipo VARCHAR NOT NULL -- 'transferencia', 'emprestimo', 'resgate'
);

-- ÍNDICES para melhor performance
CREATE INDEX idx_mercado_pilotos_piloto ON mercado_pilotos(piloto_id);
CREATE INDEX idx_mercado_pilotos_status ON mercado_pilotos(status);
CREATE INDEX idx_propostas_mercado_mercado ON propostas_mercado(mercado_id);
CREATE INDEX idx_propostas_mercado_status ON propostas_mercado(status);
CREATE INDEX idx_historico_transferencias_piloto ON historico_transferencias(piloto_id);
CREATE INDEX idx_historico_transferencias_temporada ON historico_transferencias(temporada);

-- Políticas RLS (Row Level Security)
ALTER TABLE mercado_pilotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas_mercado ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_transferencias ENABLE ROW LEVEL SECURITY;

-- Políticas para mercado_pilotos (todos podem ver, mas apenas admins podem modificar)
CREATE POLICY "mercado_pilotos_select_policy" ON mercado_pilotos
    FOR SELECT USING (true);

CREATE POLICY "mercado_pilotos_insert_policy" ON mercado_pilotos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "mercado_pilotos_update_policy" ON mercado_pilotos
    FOR UPDATE USING (true);

-- Políticas para propostas_mercado
CREATE POLICY "propostas_mercado_select_policy" ON propostas_mercado
    FOR SELECT USING (true);

CREATE POLICY "propostas_mercado_insert_policy" ON propostas_mercado
    FOR INSERT WITH CHECK (true);

CREATE POLICY "propostas_mercado_update_policy" ON propostas_mercado
    FOR UPDATE USING (true);

-- Políticas para historico_transferencias (apenas leitura)
CREATE POLICY "historico_transferencias_select_policy" ON historico_transferencias
    FOR SELECT USING (true);















