-- =====================================================
-- TESTE MANUAL COM UUID CORRETO
-- =====================================================

-- SEU ID É: 8c79122e-70a1-40b3-8167-594b49111777

-- COMANDO CORRETO (copie e execute):
UPDATE notificacoes_admin
SET dados = jsonb_set(
    jsonb_set(dados, '{status}', '"aguardando_analise"'),
    '{defesa}',
    '{
      "defensor": {"nome": "JOÃO DARTH", "email": "EMAIL_DO_PILOTO"},
      "descricaoDefesa": "TESTE MANUAL - Verificar se RLS permite update",
      "dataEnvioDefesa": "2025-01-13T12:00:00.000Z"
    }'
  ),
  lido = false
WHERE id = '8c79122e-70a1-40b3-8167-594b49111777';

-- VERIFICAR SE FUNCIONOU:
SELECT
    dados->>'status' as status,
    dados->>'defesa' as defesa_existe
FROM notificacoes_admin
WHERE id = '8c79122e-70a1-40b3-8167-594b49111777';

-- =====================================================
-- IMPORTANTE:
-- - O UUID deve estar ENTRE ASPAS SIMPLES: 'uuid-aqui'
-- - Não use apenas o número, use o UUID completo
-- =====================================================