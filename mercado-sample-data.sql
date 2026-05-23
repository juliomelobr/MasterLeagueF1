-- Script para inserir dados de exemplo no mercado de pilotos
-- Execute este script APÓS executar o supabase-schema-mercado-pilotos.sql

-- Primeiro, vamos inserir alguns pilotos de exemplo (se não existirem)
INSERT INTO pilotos (nome, email, grid, equipe, whatsapp) VALUES
('João Silva', 'joao.silva@email.com', 'carreira', 'Ferrari', '+5511999999999'),
('Maria Santos', 'maria.santos@email.com', 'light', 'Mercedes', '+5511988888888'),
('Pedro Oliveira', 'pedro.oliveira@email.com', 'carreira', 'Red Bull', '+5511977777777'),
('Ana Costa', 'ana.costa@email.com', 'light', 'McLaren', '+5511966666666'),
('Carlos Pereira', 'carlos.pereira@email.com', 'carreira', 'Aston Martin', '+5511955555555')
ON CONFLICT (nome) DO NOTHING;

-- Agora vamos colocar alguns pilotos no mercado
INSERT INTO mercado_pilotos (piloto_id, tipo, equipe_origem, valor_transferencia, observacoes, data_limite) VALUES
(
    (SELECT id FROM pilotos WHERE nome = 'João Silva'),
    'venda',
    'Ferrari',
    150000.00,
    'Piloto experiente, 2 títulos na carreira. Buscando novos desafios.',
    NOW() + INTERVAL '30 days'
),
(
    (SELECT id FROM pilotos WHERE nome = 'Maria Santos'),
    'venda',
    'Mercedes',
    80000.00,
    'Piloto promissor do grid light, boa performance em corridas molhadas.',
    NOW() + INTERVAL '25 days'
),
(
    (SELECT id FROM pilotos WHERE nome = 'Pedro Oliveira'),
    'compra',
    'Red Bull',
    NULL,
    'Buscando reforços para a temporada. Pilotos com experiência em classificação.',
    NOW() + INTERVAL '20 days'
),
(
    (SELECT id FROM pilotos WHERE nome = 'Ana Costa'),
    'venda',
    75000.00,
    'McLaren',
    'Ótima largada, foco em corridas de rua. Disponível para transferência.',
    NOW() + INTERVAL '35 days'
);

-- Inserir algumas propostas de exemplo
INSERT INTO propostas_mercado (mercado_id, equipe_proponente, valor_proposto, mensagem, data_expiracao) VALUES
(
    (SELECT mp.id FROM mercado_pilotos mp JOIN pilotos p ON mp.piloto_id = p.id WHERE p.nome = 'João Silva'),
    'Mercedes AMG',
    140000.00,
    'Estamos interessados em reforçar nossa equipe com sua experiência. Podemos oferecer um contrato de 3 anos.',
    NOW() + INTERVAL '7 days'
),
(
    (SELECT mp.id FROM mercado_pilotos mp JOIN pilotos p ON mp.piloto_id = p.id WHERE p.nome = 'Maria Santos'),
    'Alpine F1',
    85000.00,
    'Vimos seu desempenho nas últimas corridas. Gostaríamos de conversar sobre uma possível transferência.',
    NOW() + INTERVAL '5 days'
);

-- Inserir alguns registros no histórico
INSERT INTO historico_transferencias (piloto_id, equipe_origem, equipe_destino, valor_transferencia, temporada, tipo) VALUES
(
    (SELECT id FROM pilotos WHERE nome = 'João Silva'),
    'Haas',
    'Ferrari',
    120000.00,
    2024,
    'transferencia'
),
(
    (SELECT id FROM pilotos WHERE nome = 'Maria Santos'),
    'Williams',
    'Mercedes',
    95000.00,
    2024,
    'transferencia'
),
(
    (SELECT id FROM pilotos WHERE nome = 'Pedro Oliveira'),
    'Alpine',
    'Red Bull',
    200000.00,
    2023,
    'transferencia'
);

-- Mensagem de confirmação
SELECT 'Dados de exemplo inseridos com sucesso!' as status;








