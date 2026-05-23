-- =====================================================
-- STATUS FINAL: Verificar situação atual das defesas
-- =====================================================

-- 1. CONTAGEM GERAL
SELECT
    COUNT(*) as total_acusacoes,
    SUM(CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 1 ELSE 0 END) as total_defesas,
    SUM(CASE WHEN (dados ->> 'status') = 'aguardando_analise' AND (dados ->> 'defesa') IS NOT NULL THEN 1 ELSE 0 END) as defesas_no_juri
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao';

-- 2. DEFESAS QUE AINDA NÃO ESTÃO NO JÚRI
SELECT
    dados->>'codigoLance' as codigo,
    dados->>'status' as status_atual,
    dados->'acusado'->>'nome' as acusado,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND (dados ->> 'status') != 'aguardando_analise';

-- 3. CORRIGIR A DEFESA QUE FALTA (se houver)
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     lido = false
-- WHERE tipo = 'nova_acusacao'
--   AND (dados ->> 'defesa') IS NOT NULL
--   AND (dados ->> 'status') != 'aguardando_analise';

-- 4. VERIFICAR APÓS CORREÇÃO
-- SELECT COUNT(*) as defesas_no_juri_final
-- FROM notificacoes_admin
-- WHERE tipo = 'nova_acusacao'
--   AND (dados ->> 'status') = 'aguardando_analise'
--   AND (dados ->> 'defesa') IS NOT NULL;

-- =====================================================
-- RESULTADO ESPERADO APÓS CORREÇÃO:
-- defesas_no_juri = total_defesas
-- =====================================================