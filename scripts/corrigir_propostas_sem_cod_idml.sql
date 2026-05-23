-- =====================================================
-- CORRIGIR PROPOSTAS SEM pilot_cod_idml
-- =====================================================
-- Este script corrige ou remove propostas que não têm
-- pilot_cod_idml preenchido (são 3 segundo o diagnóstico)
-- =====================================================

-- 1. VER QUAIS SÃO AS 3 PROPOSTAS SEM cod_idml
-- =====================================================
SELECT 
    'PROPOSTAS SEM pilot_cod_idml (ANTES DA CORREÇÃO)' as diagnostico,
    i.id,
    i.team_id,
    e.name as team_name,
    i.pilot_id,  -- Se existir, pode ajudar a encontrar o cod_idml
    i.status,
    i.grid,
    i.season,
    i.created_at
FROM interests i
LEFT JOIN equipes e ON i.team_id = e.id
WHERE (i.pilot_cod_idml IS NULL OR TRIM(i.pilot_cod_idml) = '')
AND i.season = 20
ORDER BY i.created_at DESC;

-- 2. OPÇÃO A: REMOVER PROPOSTAS SEM cod_idml (RECOMENDADO)
-- =====================================================
-- Se essas propostas não são importantes, podemos removê-las
DELETE FROM interests
WHERE (pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '')
AND season = 20;

-- 3. OPÇÃO B: TENTAR PREENCHER cod_idml SE TIVER pilot_id
-- =====================================================
-- Se você quiser tentar preservar as propostas, podemos tentar
-- buscar o cod_idml através do pilot_id (se existir)
-- DESCOMENTE APENAS SE QUISER TENTAR ISSO:

/*
UPDATE interests i
SET pilot_cod_idml = (
    SELECT p.cod_idml 
    FROM pilotos p 
    WHERE p.id = i.pilot_id 
    AND p.cod_idml IS NOT NULL 
    AND TRIM(p.cod_idml) != ''
    LIMIT 1
)
WHERE (i.pilot_cod_idml IS NULL OR TRIM(i.pilot_cod_idml) = '')
AND i.pilot_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM pilotos p 
    WHERE p.id = i.pilot_id 
    AND p.cod_idml IS NOT NULL 
    AND TRIM(p.cod_idml) != ''
);

-- Normalizar os que foram preenchidos
UPDATE interests
SET pilot_cod_idml = TRIM(UPPER(pilot_cod_idml))
WHERE pilot_cod_idml IS NOT NULL
AND pilot_cod_idml != TRIM(UPPER(pilot_cod_idml));

-- Remover os que ainda estão sem cod_idml (não foi possível preencher)
DELETE FROM interests
WHERE (pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '')
AND season = 20;
*/

-- 4. VERIFICAÇÃO FINAL
-- =====================================================
SELECT 
    'VERIFICAÇÃO FINAL' as diagnostico,
    (SELECT COUNT(*) FROM interests WHERE pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '') as propostas_sem_cod_idml,
    (SELECT COUNT(*) FROM interests WHERE pilot_cod_idml IS NOT NULL AND TRIM(pilot_cod_idml) != '') as propostas_com_cod_idml,
    (SELECT COUNT(*) FROM contracts WHERE pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '') as contratos_sem_cod_idml,
    (SELECT COUNT(*) FROM contracts WHERE pilot_cod_idml IS NOT NULL AND TRIM(pilot_cod_idml) != '') as contratos_com_cod_idml;






