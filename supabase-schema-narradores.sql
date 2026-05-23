-- Tabela para cadastro de narradores
CREATE TABLE IF NOT EXISTS narradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_narradores_email ON narradores(email);
CREATE INDEX IF NOT EXISTS idx_narradores_ativo ON narradores(ativo);

-- Comentários
COMMENT ON TABLE narradores IS 'Tabela para cadastro de narradores que terão acesso somente leitura aos painéis dos pilotos';
COMMENT ON COLUMN narradores.nome IS 'Nome do narrador';
COMMENT ON COLUMN narradores.email IS 'Email único do narrador para login';
COMMENT ON COLUMN narradores.senha_hash IS 'Hash da senha do narrador (SHA-256)';
COMMENT ON COLUMN narradores.ativo IS 'Se o narrador está ativo e pode acessar o sistema';

-- RLS (Row Level Security) - Permitir leitura para todos, escrita apenas para admins autenticados
ALTER TABLE narradores ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Todos podem ler (para verificar login)
CREATE POLICY narradores_select ON narradores
    FOR SELECT
    USING (true);

-- Política para INSERT: Apenas autenticados (admin)
CREATE POLICY narradores_insert ON narradores
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE: Apenas autenticados (admin)
CREATE POLICY narradores_update ON narradores
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Política para DELETE: Apenas autenticados (admin)
CREATE POLICY narradores_delete ON narradores
    FOR DELETE
    USING (auth.role() = 'authenticated');




































