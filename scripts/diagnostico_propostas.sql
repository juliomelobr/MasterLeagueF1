-- =====================================================
-- SCRIPT DE DIAGNÓSTICO: Sistema de Propostas e Contratos
-- =====================================================
-- Execute este script no SQL Editor do Supabase para
-- diagnosticar problemas no fluxo de propostas
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS
-- =====================================================
SELECT 
    'ESTRUTURA DA TABELA INTERESTS' as diagnostico,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'interests'
ORDER BY ordinal_position;

SELECT 
    'ESTRUTURA DA TABELA CONTRACTS' as diagnostico,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;

-- 2. VERIFICAR SE COLUNAS pilot_cod_idml EXISTEM
-- =====================================================
SELECT 
    'VERIFICAR COLUNAS pilot_cod_idml' as diagnostico,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('interests', 'contracts')
AND column_name IN ('pilot_id', 'pilot_cod_idml')
ORDER BY table_name, column_name;

-- 3. CONTAR PROPOSTAS POR STATUS
-- =====================================================
SELECT 
    'PROPOSTAS POR STATUS' as diagnostico,
    status,
    COUNT(*) as total,
    COUNT(DISTINCT pilot_cod_idml) as pilotos_unicos
FROM interests
WHERE season = 20
GROUP BY status
ORDER BY total DESC;

-- 4. VERIFICAR PROPOSTAS OFFER_SENT (devem aparecer no Dashboard)
-- =====================================================
SELECT 
    'PROPOSTAS OFFER_SENT (devem aparecer no Dashboard)' as diagnostico,
    i.id,
    i.pilot_cod_idml,
    i.team_id,
    e.name as team_name,
    i.status,
    i.grid,
    i.season,
    i.created_at
FROM interests i
LEFT JOIN equipes e ON i.team_id = e.id
WHERE i.status = 'OFFER_SENT'
AND i.season = 20
ORDER BY i.created_at DESC
LIMIT 20;

-- 5. VERIFICAR CONTRATOS EXISTENTES
-- =====================================================
SELECT 
    'CONTRATOS EXISTENTES' as diagnostico,
    c.id,
    c.pilot_cod_idml,
    c.team_id,
    e.name as team_name,
    c.grid,
    c.season,
    c.signed_at,
    c.created_at
FROM contracts c
LEFT JOIN equipes e ON c.team_id = e.id
WHERE c.season = 20
ORDER BY c.created_at DESC;

-- 6. VERIFICAR PILOTOS COM PROPOSTA MAS SEM CONTRATO
-- =====================================================
SELECT 
    'PILOTOS COM PROPOSTA MAS SEM CONTRATO' as diagnostico,
    i.pilot_cod_idml,
    COUNT(DISTINCT i.id) as num_propostas,
    COUNT(DISTINCT i.team_id) as num_equipes,
    STRING_AGG(DISTINCT e.name, ', ') as equipes_com_proposta,
    MAX(i.created_at) as ultima_proposta
FROM interests i
LEFT JOIN equipes e ON i.team_id = e.id
LEFT JOIN contracts c ON c.pilot_cod_idml = i.pilot_cod_idml 
    AND c.season = 20 
    AND c.grid = i.grid
WHERE i.status = 'OFFER_SENT'
AND i.season = 20
AND c.id IS NULL
GROUP BY i.pilot_cod_idml
ORDER BY num_propostas DESC;

-- 7. VERIFICAR PILOTOS COM CONTRATO E PROPOSTAS PENDENTES (PROBLEMA!)
-- =====================================================
SELECT 
    'PROBLEMA: PILOTOS COM CONTRATO MAS AINDA TÊM PROPOSTAS OFFER_SENT' as diagnostico,
    c.pilot_cod_idml,
    c.team_id as contract_team_id,
    ec.name as contract_team_name,
    COUNT(DISTINCT i.id) as propostas_pendentes,
    STRING_AGG(DISTINCT ei.name, ', ') as equipes_com_proposta_pendente
FROM contracts c
LEFT JOIN equipes ec ON c.team_id = ec.id
LEFT JOIN interests i ON i.pilot_cod_idml = c.pilot_cod_idml
    AND i.season = 20
    AND i.status = 'OFFER_SENT'
    AND i.grid = c.grid
LEFT JOIN equipes ei ON i.team_id = ei.id
WHERE c.season = 20
GROUP BY c.pilot_cod_idml, c.team_id, ec.name
HAVING COUNT(DISTINCT i.id) > 0
ORDER BY propostas_pendentes DESC;

-- 8. VERIFICAR INCONSISTÊNCIAS DE NORMALIZAÇÃO (cod_idml com espaços/maíusculas diferentes)
-- =====================================================
SELECT 
    'VERIFICAR INCONSISTÊNCIAS DE cod_idml' as diagnostico,
    pilot_cod_idml,
    LENGTH(pilot_cod_idml) as tamanho,
    pilot_cod_idml != TRIM(UPPER(pilot_cod_idml)) as tem_problemas_normalizacao,
    COUNT(*) as total
FROM interests
WHERE season = 20
GROUP BY pilot_cod_idml
HAVING pilot_cod_idml != TRIM(UPPER(pilot_cod_idml))
ORDER BY total DESC
LIMIT 20;

SELECT 
    'VERIFICAR INCONSISTÊNCIAS DE cod_idml (CONTRACTS)' as diagnostico,
    pilot_cod_idml,
    LENGTH(pilot_cod_idml) as tamanho,
    pilot_cod_idml != TRIM(UPPER(pilot_cod_idml)) as tem_problemas_normalizacao,
    COUNT(*) as total
FROM contracts
WHERE season = 20
GROUP BY pilot_cod_idml
HAVING pilot_cod_idml != TRIM(UPPER(pilot_cod_idml))
ORDER BY total DESC
LIMIT 20;

-- 9. VERIFICAR SE HÁ PROPOSTAS SEM pilot_cod_idml (NULL)
-- =====================================================
SELECT 
    'PROPOSTAS SEM pilot_cod_idml (PROBLEMA!)' as diagnostico,
    COUNT(*) as total_propostas_sem_cod,
    COUNT(DISTINCT team_id) as equipes_afetadas
FROM interests
WHERE season = 20
AND (pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '');

-- 10. VERIFICAR SE HÁ CONTRATOS SEM pilot_cod_idml (NULL)
-- =====================================================
SELECT 
    'CONTRATOS SEM pilot_cod_idml (PROBLEMA!)' as diagnostico,
    COUNT(*) as total_contratos_sem_cod,
    COUNT(DISTINCT team_id) as equipes_afetadas
FROM contracts
WHERE season = 20
AND (pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '');

-- 11. RESUMO GERAL
-- =====================================================
SELECT 
    'RESUMO GERAL' as diagnostico,
    (SELECT COUNT(*) FROM interests WHERE season = 20 AND status = 'OFFER_SENT') as propostas_offer_sent,
    (SELECT COUNT(*) FROM interests WHERE season = 20 AND status = 'ACCEPTED') as propostas_accepted,
    (SELECT COUNT(*) FROM interests WHERE season = 20 AND status = 'REJECTED') as propostas_rejected,
    (SELECT COUNT(DISTINCT pilot_cod_idml) FROM contracts WHERE season = 20) as pilotos_com_contrato,
    (SELECT COUNT(*) FROM contracts WHERE season = 20) as total_contratos;






