-- ============================================
-- SCRIPT: Popular draft_priority dos Pilotos
-- TEMPORADA 20: Prioridade INVERSA ao Power Ranking T19
-- ============================================
-- 
-- IMPORTANTE: 
-- - Prioridade 1 = Maior prioridade (escolhe primeiro)
-- - Prioridade 20 = Menor prioridade (campeão escolhe por último)
-- 
-- Este é um EXEMPLO. Você deve ajustar os nomes e prioridades
-- baseado no Power Ranking real da Temporada 19.
-- ============================================

-- Exemplo de atualização (SUBSTITUA pelos dados reais)
-- Ordem: Do pior colocado no PR T19 (prioridade 1) ao campeão (prioridade 20)

-- Prioridade 1-10 (Podem aplicar para GOLD, SILVER, BRONZE)
UPDATE pilotos SET draft_priority = 1 WHERE nome = 'Leandro Sopeña';  -- Exemplo: 20º no PR T19
UPDATE pilotos SET draft_priority = 2 WHERE nome = 'Edvan Paiva';       -- Exemplo: 19º no PR T19
UPDATE pilotos SET draft_priority = 3 WHERE nome = 'Bruno Martins';   -- Exemplo: 18º no PR T19
UPDATE pilotos SET draft_priority = 4 WHERE nome = 'Daniel Camargo';   -- Exemplo: 17º no PR T19
UPDATE pilotos SET draft_priority = 5 WHERE nome = 'Eduardo da Silva'; -- Exemplo: 16º no PR T19
UPDATE pilotos SET draft_priority = 6 WHERE nome = 'Felipe Lemanski';  -- Exemplo: 15º no PR T19
UPDATE pilotos SET draft_priority = 7 WHERE nome = 'Gustavo Migotto'; -- Exemplo: 14º no PR T19
UPDATE pilotos SET draft_priority = 8 WHERE nome = 'Julio Melo';       -- Exemplo: 13º no PR T19
UPDATE pilotos SET draft_priority = 9 WHERE nome = 'Junior Passareco'; -- Exemplo: 12º no PR T19
UPDATE pilotos SET draft_priority = 10 WHERE nome = 'Lucas Monteiro'; -- Exemplo: 11º no PR T19

-- Prioridade 11-20 (Podem aplicar apenas para SILVER e BRONZE)
UPDATE pilotos SET draft_priority = 11 WHERE nome = 'Lucas Raiol';     -- Exemplo: 10º no PR T19
UPDATE pilotos SET draft_priority = 12 WHERE nome = 'Lucas Romano';  -- Exemplo: 9º no PR T19
UPDATE pilotos SET draft_priority = 13 WHERE nome = 'Matheus Domingues'; -- Exemplo: 8º no PR T19
UPDATE pilotos SET draft_priority = 14 WHERE nome = 'Pedro Folha';    -- Exemplo: 7º no PR T19
UPDATE pilotos SET draft_priority = 15 WHERE nome = 'Rafael Martins'; -- Exemplo: 6º no PR T19
UPDATE pilotos SET draft_priority = 16 WHERE nome = 'Rafael Tondatto'; -- Exemplo: 5º no PR T19
UPDATE pilotos SET draft_priority = 17 WHERE nome = 'Roberto Azevedo'; -- Exemplo: 4º no PR T19
UPDATE pilotos SET draft_priority = 18 WHERE nome = 'Rogerio Filho';  -- Exemplo: 3º no PR T19
UPDATE pilotos SET draft_priority = 19 WHERE nome = 'Wesley Paiva';    -- Exemplo: 2º no PR T19
UPDATE pilotos SET draft_priority = 20 WHERE nome = 'Alexandre Henrique'; -- Exemplo: 1º no PR T19 (Campeão)

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para verificar se todos os pilotos têm draft_priority:
-- SELECT nome, draft_priority FROM pilotos WHERE draft_priority IS NULL;

-- Execute esta query para ver a ordem de prioridade:
-- SELECT nome, draft_priority FROM pilotos WHERE draft_priority IS NOT NULL ORDER BY draft_priority ASC;








