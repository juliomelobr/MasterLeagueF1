-- =====================================================
-- Corrigir status de lances que já têm defesa
-- Tabela: notificacoes_admin
-- =====================================================
-- Problema: Alguns lances têm defesa enviada mas ainda estão
-- com status 'aguardando_defesa' em vez de 'aguardando_analise'.
--
-- Este script encontra e corrige esses registros.
-- Execute no SQL Editor do Supabase.
-- =====================================================

-- Primeiro, vamos ver quantos registros precisam de correção
SELECT
    COUNT(*) as total_para_corrigir,
    jsonb_array_length(jsonb_agg(dados)) as detalhes
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND (dados ->> 'status') != 'aguardando_analise';

-- Mostrar detalhes dos registros que precisam correção
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado,
    dados->>'status' as status_atual,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND (dados ->> 'status') != 'aguardando_analise'
ORDER BY created_at DESC;

-- Agora corrigir os registros (descomente as linhas abaixo para executar)
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(dados, '{status}', '"aguardando_analise"'),
--     lido = false,
--     updated_at = now()
-- WHERE tipo = 'nova_acusacao'
--   AND (dados ->> 'defesa') IS NOT NULL
--   AND (dados ->> 'status') != 'aguardando_analise';

-- Verificar quantos foram corrigidos
-- SELECT COUNT(*) as corrigidos
-- FROM notificacoes_admin
-- WHERE tipo = 'nova_acusacao'
--   AND (dados ->> 'defesa') IS NOT NULL
--   AND (dados ->> 'status') = 'aguardando_analise';

-- =====================================================
-- INSTRUÇÕES:
-- 1. Execute primeiro as SELECTs para ver o que será corrigido
-- 2. Se estiver correto, descomente e execute o UPDATE
-- 3. Execute a última SELECT para confirmar
-- =====================================================