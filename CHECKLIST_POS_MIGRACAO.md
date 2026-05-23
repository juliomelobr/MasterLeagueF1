# ✅ Checklist Pós-Migração

## Status Atual (do diagnóstico)

✅ **Migração Executada com Sucesso:**
- 107 propostas com `pilot_cod_idml` ✅
- 1 contrato com `pilot_cod_idml` ✅
- 0 contratos sem `cod_idml` ✅
- ⚠️ **3 propostas sem `cod_idml`** (precisa corrigir)

## 🔧 PRÓXIMO PASSO OBRIGATÓRIO

### 1. Corrigir as 3 Propostas sem cod_idml

Execute o script: `scripts/corrigir_propostas_sem_cod_idml.sql`

Este script:
1. Mostra quais são as 3 propostas sem cod_idml
2. Remove as propostas sem cod_idml (ou tenta preencher se tiver pilot_id)
3. Verifica se ficou tudo correto

**Após executar, deve resultar em: 0 propostas sem cod_idml**

## 🧪 TESTES PARA VALIDAR O SISTEMA

### Teste 1: Criar Nova Proposta
1. Vá em **Admin → Draft Import → Negociações**
2. Selecione um piloto que NÃO tenha contrato
3. Selecione 1-3 equipes
4. Clique em "✉️ Enviar Proposta"
5. ✅ **Esperado:** Deve criar proposta com sucesso

### Teste 2: Ver Proposta no Dashboard
1. Faça login como o piloto que recebeu a proposta
2. Vá para o **Dashboard**
3. ✅ **Esperado:** Deve aparecer a proposta no modal ou notificação
4. Verifique no console (F12) se há logs `[PROPOSTAS]`

### Teste 3: Aceitar Proposta
1. No Dashboard do piloto, clique para aceitar a proposta
2. ✅ **Esperado:** 
   - Contrato deve ser criado
   - Proposta aceita deve ficar ACCEPTED
   - Outras propostas do piloto devem ficar REJECTED
   - Logs no console mostrando sucesso

### Teste 4: Ver Contrato no Admin
1. Volte para **Admin → Draft Import → Negociações**
2. ✅ **Esperado:** 
   - Piloto deve aparecer com logo da equipe
   - Botão "✅ Contrato Fechado" (amarelo, desabilitado)
   - Botão "🗑️ Cancelar Contrato" (vermelho, ativo)
   - Não deve permitir enviar novas propostas

### Teste 5: Ver na Visão Geral
1. Vá para **Admin → Draft Import → Visão Geral**
2. Selecione o grid correto (Carreira ou Light)
3. ✅ **Esperado:**
   - Equipe deve mostrar o nome do piloto
   - Foto do piloto deve aparecer
   - Badge "✅ CONFIRMADO" em verde
   - Botão "✕" vermelho ao lado do nome

### Teste 6: Cancelar Contrato
1. Na Visão Geral, clique no "✕" ao lado do piloto
2. Ou no Painel de Propostas, clique em "🗑️ Cancelar Contrato"
3. ✅ **Esperado:**
   - Contrato deve ser deletado
   - Vaga deve voltar para "Vaga Disponível"
   - Piloto pode receber novas propostas novamente

## 🔍 Verificações no Console do Navegador

Abra o Console (F12) e procure por:

### Ao Carregar Painel de Propostas:
```
📊 [ADMIN] Contratos encontrados: { total: X, ... }
✅ [ADMIN] Contrato detectado: { cod_idml_normalizado: 'MLFI-0138', ... }
```

### Ao Criar Contrato no Dashboard:
```
📝 [CONTRATO] Criando contrato: { pilot_cod_idml_normalizado: 'MLFI-0138', ... }
✅ [CONTRATO] Contrato criado com sucesso
🔍 [PROPOSTAS] Buscando todas as propostas OFFER_SENT...
✅ X proposta(s) marcada(s) como REJECTED
```

### Ao Buscar Propostas:
```
🔍 [PROPOSTAS] Buscando propostas para cod_idml normalizado: MLFI-0138
📊 [PROPOSTAS] Propostas encontradas (total): X
```

## ⚠️ Problemas Comuns e Soluções

### Problema: Propostas não aparecem no Dashboard
**Causa:** `cod_idml` não está batendo
**Solução:** Verifique se o `cod_idml` do piloto no banco está normalizado (trim + uppercase)

### Problema: Contrato criado mas não aparece no Admin
**Causa:** Grid diferente ou `cod_idml` não bate
**Solução:** Verifique se está no grid correto e se o `cod_idml` está normalizado

### Problema: Piloto com contrato ainda recebe propostas
**Causa:** Trigger não executou ou propostas foram criadas depois
**Solução:** Execute manualmente:
```sql
UPDATE interests 
SET status = 'REJECTED', updated_at = NOW()
WHERE pilot_cod_idml = 'MLFI-XXXX'
AND status = 'OFFER_SENT'
AND season = 20;
```

### Problema: Erro "column pilot_cod_idml does not exist"
**Causa:** Migração não foi executada completamente
**Solução:** Execute novamente `scripts/migracao_completa_propostas.sql`

## 📊 Verificação Final no Banco

Execute este SQL para garantir que está tudo OK:

```sql
-- Deve retornar 0 para todas as verificações
SELECT 
    (SELECT COUNT(*) FROM interests WHERE pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '') as propostas_sem_cod,
    (SELECT COUNT(*) FROM contracts WHERE pilot_cod_idml IS NULL OR TRIM(pilot_cod_idml) = '') as contratos_sem_cod,
    (SELECT COUNT(*) FROM interests WHERE status = 'OFFER_SENT' AND season = 20 
     AND EXISTS (SELECT 1 FROM contracts c WHERE c.pilot_cod_idml = interests.pilot_cod_idml AND c.season = 20)) as propostas_pendentes_com_contrato;
```

Todos devem retornar **0**.

## 🎯 Status Esperado Final

- ✅ 0 propostas sem `cod_idml`
- ✅ 0 contratos sem `cod_idml`
- ✅ 0 propostas OFFER_SENT para pilotos com contrato
- ✅ Todas as queries usando `pilot_cod_idml` funcionando
- ✅ Trigger automático funcionando
- ✅ Normalização consistente (trim + uppercase)






