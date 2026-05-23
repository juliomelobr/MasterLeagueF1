-- =====================================================
-- SCRIPT: Atualizar Jurados para 9 (renomear e adicionar)
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- Este script:
-- 1. Renomeia os jurados existentes (A, B, C, 4, 5) para (1, 2, 3, 4, 5)
-- 2. Adiciona os novos jurados (6, 7, 8, 9)

-- =====================================================
-- PASSO 1: Renomear jurados existentes
-- =====================================================

-- Renomear juradoA para jurado1 (se existir)
UPDATE jurados 
SET usuario = 'jurado1', updated_at = NOW()
WHERE usuario = 'juradoA';

-- Renomear juradoB para jurado2 (se existir)
UPDATE jurados 
SET usuario = 'jurado2', updated_at = NOW()
WHERE usuario = 'juradoB';

-- Renomear juradoC para jurado3 (se existir)
UPDATE jurados 
SET usuario = 'jurado3', updated_at = NOW()
WHERE usuario = 'juradoC';

-- jurado4 e jurado5 já estão corretos, não precisam ser renomeados

-- =====================================================
-- PASSO 2: Adicionar novos jurados (6, 7, 8, 9)
-- =====================================================

-- Inserir novos jurados (sem vínculos - serão configurados no admin)
INSERT INTO jurados (usuario) VALUES
('jurado6'),
('jurado7'),
('jurado8'),
('jurado9')
ON CONFLICT (usuario) DO NOTHING;

-- =====================================================
-- VERIFICAÇÃO: Listar todos os jurados
-- =====================================================
SELECT id, usuario, nome, email_google, whatsapp, ativo, created_at, updated_at 
FROM jurados 
ORDER BY usuario;
