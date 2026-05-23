-- =====================================================
-- DIAGNÓSTICO: Lance STW-C2009 não aparece na aba STEWARDS
-- =====================================================
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- =====================================================

-- 1. O lance STW-C2009 existe na tabela?
SELECT 
    id,
    tipo,
    dados->>'codigoLance' as codigo_lance,
    dados->>'status' as status,
    dados->'acusador'->>'nome' as acusador,
    dados->'acusado'->>'nome' as acusado,
    created_at,
    lido
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (
    dados->>'codigoLance' ILIKE '%STW-C2009%'
    OR dados->>'codigo' ILIKE '%STW-C2009%'
  );

-- 2. Se não retornou nada acima, listar os últimos lances Carreira T20
SELECT 
    dados->>'codigoLance' as codigo,
    dados->>'status' as status,
    created_at
FROM notificacoes_admin
WHERE tipo = 'nova_acusacao'
  AND (dados->>'codigoLance' LIKE 'STW-C20%' OR dados->'acusador'->>'grid' = 'carreira')
ORDER BY created_at DESC
LIMIT 15;

-- 3. Verificar política RLS de leitura (stewards devem ver tudo)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'notificacoes_admin'
  AND cmd = 'r'
ORDER BY policyname;
