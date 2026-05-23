-- =====================================================
-- CORRIGIR: Email do acusado não corresponde ao email logado
-- =====================================================

-- 1. VERIFICAR EMAIL DO ACUSADO NO REGISTRO
SELECT
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'nome' as acusado_nome,
    dados->'acusado'->>'email' as email_acusado_registro,
    dados->'acusado'->>'email' as email_acusado_original
FROM notificacoes_admin
WHERE dados->>'codigoLance' = 'STW-L2012';

-- 2. VERIFICAR EMAIL DO USUÁRIO LOGADO
SELECT
    auth.jwt() ->> 'email' as email_usuario_logado,
    lower(auth.jwt() ->> 'email') as email_logado_lowercase;

-- 3. VERIFICAR TODOS OS EMAILS POSSÍVEIS DO ACUSADO
SELECT
    dados->>'codigoLance' as codigo,
    dados->'acusado'->>'email' as email_1,
    lower(dados->'acusado'->>'email') as email_1_lower,
    trim(lower(dados->'acusado'->>'email')) as email_1_trim_lower
FROM notificacoes_admin
WHERE dados->>'codigoLance' = 'STW-L2012';

-- 4. ATUALIZAR EMAIL DO ACUSADO PARA CORRESPONDER AO EMAIL LOGADO
-- (Execute apenas se souber qual é o email correto do piloto)
-- UPDATE notificacoes_admin
-- SET dados = jsonb_set(
--     dados,
--     '{acusado,email}',
--     to_jsonb('EMAIL_CORRETO_AQUI'::text)
--   )
-- WHERE dados->>'codigoLance' = 'STW-L2012';

-- =====================================================
-- ALTERNATIVA: Ajustar política RLS para usar comparação mais flexível
-- (ver próximo arquivo)
-- =====================================================