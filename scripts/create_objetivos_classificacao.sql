-- Tabela para persistir classificação quali/quanti dos objetivos
CREATE TABLE IF NOT EXISTS objetivos_classificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objetivo_texto TEXT NOT NULL UNIQUE,
    classificacao VARCHAR(20) NOT NULL CHECK (classificacao IN ('qualitativo', 'quantitativo')),
    updated_by_email TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_objetivos_classificacao_texto
    ON objetivos_classificacao(objetivo_texto);
CREATE INDEX IF NOT EXISTS idx_objetivos_classificacao_tipo
    ON objetivos_classificacao(classificacao);

-- Habilitar RLS
ALTER TABLE objetivos_classificacao ENABLE ROW LEVEL SECURITY;

-- Policy: Stewards podem escrever
CREATE POLICY objetivos_classificacao_admin_all ON objetivos_classificacao
    FOR ALL
    USING (
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1) = true
    )
    WITH CHECK (
        (SELECT is_steward FROM pilotos WHERE email = auth.jwt() ->> 'email' LIMIT 1) = true
    );

-- Policy: Todos podem ler
CREATE POLICY objetivos_classificacao_read ON objetivos_classificacao
    FOR SELECT
    USING (true);

-- Comentários
COMMENT ON TABLE objetivos_classificacao IS 'Classificação quali/quanti dos objetivos contratuais para cálculo do Power Ranking';
COMMENT ON COLUMN objetivos_classificacao.objetivo_texto IS 'Texto completo do objetivo';
COMMENT ON COLUMN objetivos_classificacao.classificacao IS 'Tipo: qualitativo ou quantitativo';
