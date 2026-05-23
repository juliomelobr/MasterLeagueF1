-- =====================================================
-- SCRIPT: Criar tabela de Jurados - Master League F1
-- =====================================================
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de jurados
CREATE TABLE IF NOT EXISTS jurados (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) DEFAULT NULL,
    email_google VARCHAR(150) DEFAULT NULL,
    whatsapp VARCHAR(20) DEFAULT NULL,
    ativo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inserir os 5 jurados iniciais (sem vínculos - serão configurados no admin)
INSERT INTO jurados (usuario) VALUES
('jurado1'),
('jurado2'),
('jurado3'),
('jurado4'),
('jurado5')
ON CONFLICT (usuario) DO NOTHING;

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE jurados ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura de jurados ativos" ON jurados;
DROP POLICY IF EXISTS "Permitir leitura de todos jurados" ON jurados;
DROP POLICY IF EXISTS "Permitir update de jurados" ON jurados;

-- 5. Criar política para permitir leitura de todos os jurados (admin precisa ver todos)
CREATE POLICY "Permitir leitura de todos jurados" ON jurados
    FOR SELECT USING (true);

-- 6. Criar política para permitir update
CREATE POLICY "Permitir update de jurados" ON jurados
    FOR UPDATE USING (true);

-- =====================================================
-- VERIFICAÇÃO: Listar jurados criados
-- =====================================================
SELECT id, usuario, nome, email_google, whatsapp, ativo, created_at FROM jurados ORDER BY id;
