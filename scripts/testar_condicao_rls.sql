-- =====================================================
-- TESTAR: Verificar se a condição RLS está sendo atendida
-- =====================================================

-- 1. VERIFICAR EMAIL DO ACUSADO NO REGISTRO STW-L2012
SELECT
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado_nome,
    dados->'acusado'->>'email' as acusado_email,
    dados->>'status' as status_atual,
    CASE WHEN (dados ->> 'defesa') IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_defesa
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- 2. VERIFICAR EMAIL DO USUÁRIO LOGADO ATUALMENTE
SELECT
    auth.jwt() ->> 'email' as email_usuario_logado,
    auth.uid() as user_id;

-- 3. SIMULAR A CONDIÇÃO RLS PARA VER SE PASSARIA
-- (Execute logado como o piloto acusado)
SELECT
    dados->>'codigoLance' as codigo,
    CASE
        WHEN tipo = 'nova_acusacao' THEN 'OK'
        ELSE 'FALHA: tipo'
    END as check_tipo,
    CASE
        WHEN (dados -> 'acusado' ->> 'email') = lower(auth.jwt() ->> 'email') THEN 'OK'
        ELSE 'FALHA: email não corresponde'
    END as check_email,
    CASE
        WHEN (dados ->> 'status') = 'aguardando_defesa' THEN 'OK'
        ELSE 'FALHA: status não é aguardando_defesa'
    END as check_status,
    CASE
        WHEN (dados ->> 'defesa') IS NULL THEN 'OK'
        ELSE 'FALHA: já tem defesa'
    END as check_defesa_null
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados->>'codigoLance' = 'STW-L2012';

-- =====================================================
-- INTERPRETAÇÃO:
-- - Se check_email = FALHA: email do usuário não corresponde ao email do acusado
-- - Se check_status = FALHA: status não está como 'aguardando_defesa'
-- - Se check_defesa_null = FALHA: registro já tem defesa
-- =====================================================