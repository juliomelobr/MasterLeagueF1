-- =====================================================
-- DIAGNOSTICO: Falha ao enviar defesa do lance STW-C2105
-- Caso reportado: Alexandre Henrique x Jose Cauan (Carreira, Etapa 4)
-- =====================================================
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1) Verificar se o lance existe e qual o estado atual
SELECT
  id,
  tipo,
  dados ->> 'codigoLance' AS codigo_lance,
  dados ->> 'status' AS status,
  dados -> 'acusador' ->> 'nome' AS acusador_nome,
  dados -> 'acusado' ->> 'nome' AS acusado_nome,
  dados -> 'acusado' ->> 'email' AS acusado_email,
  dados -> 'acusado' ->> 'gamertag' AS acusado_gamertag,
  dados -> 'acusado' ->> 'whatsapp' AS acusado_whatsapp,
  CASE WHEN (dados ->> 'defesa') IS NULL THEN 'NAO' ELSE 'SIM' END AS ja_tem_defesa,
  created_at
FROM public.notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND dados ->> 'codigoLance' = 'STW-C2105';

-- 2) Verificar cadastro do piloto acusado na tabela pilotos
SELECT
  nome,
  email,
  gamertag,
  whatsapp,
  grid,
  is_steward
FROM public.pilotos
WHERE lower(trim(nome)) = lower(trim('Alexandre Henrique'))
ORDER BY created_at DESC NULLS LAST;

-- 3) Verificar se a policy de update para defesa esta ativa
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'notificacoes_admin'
  AND policyname = 'notificacoes_admin_update_pilotos_defesa';

-- 4) Checklist objetivo para conclusao rapida
-- Esperado para o lance STW-C2105:
-- - status = aguardando_defesa
-- - ja_tem_defesa = NAO
-- - acusado cadastrado em pilotos
-- - policy notificacoes_admin_update_pilotos_defesa existente
