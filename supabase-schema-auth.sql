-- =====================================================
-- SCHEMA DE AUTENTICAÇÃO - CÓDIGOS WHATSAPP
-- =====================================================
-- Tabela para armazenar códigos de verificação WhatsApp
-- para autenticação em 2 etapas

-- Tabela de códigos de verificação WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL, -- Email do piloto (único por código ativo)
    whatsapp VARCHAR NOT NULL, -- Número do WhatsApp (formato: 5511999999999)
    code VARCHAR(6) NOT NULL, -- Código de 6 dígitos
    expires_at TIMESTAMP NOT NULL, -- Expira em 10 minutos
    used BOOLEAN DEFAULT FALSE, -- Se já foi usado
    attempts INTEGER DEFAULT 0, -- Tentativas de validação
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Índice único para garantir apenas um código ativo por email
    CONSTRAINT unique_active_code_per_email UNIQUE (email, used, expires_at)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON whatsapp_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON whatsapp_verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON whatsapp_verification_codes(expires_at);

-- Função para limpar códigos expirados (executar periodicamente via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM whatsapp_verification_codes
    WHERE expires_at < NOW() OR (used = true AND created_at < NOW() - INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE whatsapp_verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Qualquer pessoa pode inserir código (para gerar novo código)
CREATE POLICY verification_codes_insert ON whatsapp_verification_codes
    FOR INSERT
    WITH CHECK (true);

-- Policy: Apenas usuário logado pode ler/atualizar seu próprio código
CREATE POLICY verification_codes_select ON whatsapp_verification_codes
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND
        lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );

CREATE POLICY verification_codes_update ON whatsapp_verification_codes
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND
        lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );

-- Comentário: Para desenvolvimento, pode desabilitar RLS temporariamente
-- ALTER TABLE whatsapp_verification_codes DISABLE ROW LEVEL SECURITY;





