-- =====================================================
-- Verificar todas as defesas existentes no sistema
-- =====================================================

-- Ver todas as defesas enviadas (independente do status)
SELECT
    COUNT(*) as total_defesas_enviadas
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL;

-- Detalhes completos de todas as defesas
SELECT
    id,
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado_nome,
    dados->'acusado'->>'email' as acusado_email,
    dados->'acusador'->>'nome' as acusador_nome,
    dados->>'status' as status_atual,
    dados->'defesa'->>'dataEnvioDefesa' as data_defesa,
    dados->'defesa'->>'descricaoDefesa' as descricao_defesa,
    created_at as data_acusacao
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
ORDER BY dados->'defesa'->>'dataEnvioDefesa' DESC;

-- Verificar se há registros com defesa mas status incorreto
SELECT
    COUNT(*) as defesas_com_status_errado
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NOT NULL
  AND (dados ->> 'status') != 'aguardando_analise';

-- Verificar se há registros ainda aguardando defesa
SELECT
    COUNT(*) as aguardando_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados ->> 'defesa') IS NULL
  AND (dados ->> 'status') = 'aguardando_defesa';

-- =====================================================
-- Execute estes comandos em sequência no SQL Editor
-- =====================================================