# 🔍 Resumo do Diagnóstico: Fluxo de Propostas

## ✅ ANÁLISE CONCLUÍDA

Identifiquei o problema raiz: **incompatibilidade entre a estrutura do banco de dados e o código**.

## 🚨 PROBLEMA PRINCIPAL

O código React está usando `pilot_cod_idml` (VARCHAR), mas a tabela `interests` pode ainda estar usando a estrutura antiga com `pilot_id` (UUID). Isso causa falhas silenciosas em todas as operações.

## 📋 ARQUIVOS CRIADOS PARA SOLUÇÃO

### 1. **`scripts/diagnostico_propostas.sql`** ⚠️ EXECUTE PRIMEIRO
Script de diagnóstico que mostra:
- Estrutura atual das tabelas
- Colunas existentes (pilot_id vs pilot_cod_idml)
- Propostas e contratos existentes
- Inconsistências de normalização
- Pilotos com contrato mas com propostas pendentes (problema!)

**Execute este script primeiro** para entender exatamente o que está errado no seu banco.

### 2. **`scripts/migracao_completa_propostas.sql`** 🔧 EXECUTE DEPOIS
Script de migração completa que:
- ✅ Adiciona colunas `pilot_cod_idml`, `grid`, `season` se não existirem
- ✅ Torna `pilot_id` opcional (permite NULL)
- ✅ Normaliza todos os `cod_idml` existentes (trim + uppercase)
- ✅ Cria índices para performance
- ✅ Adiciona constraints UNIQUE
- ✅ Cria trigger para rejeitar propostas automaticamente quando contrato é criado

**Execute este script** para corrigir a estrutura do banco.

### 3. **`ANALISE_PROFUNDA_PROPOSTAS.md`**
Documentação completa da análise com todos os detalhes técnicos.

## 🎯 PLANO DE AÇÃO

### PASSO 1: Diagnóstico
```sql
-- No Supabase SQL Editor, execute:
-- scripts/diagnostico_propostas.sql
```

Isso vai mostrar:
- Se as tabelas têm as colunas corretas
- Quantas propostas/contratos existem
- Se há dados inconsistentes

### PASSO 2: Migração
```sql
-- No Supabase SQL Editor, execute:
-- scripts/migracao_completa_propostas.sql
```

Isso vai:
- Adicionar colunas necessárias
- Normalizar dados existentes
- Criar índices e constraints
- Adicionar trigger automático

### PASSO 3: Verificação
```sql
-- Execute novamente o diagnóstico para confirmar:
-- scripts/diagnostico_propostas.sql
```

Verifique:
- ✅ Todas as colunas existem
- ✅ Não há registros com NULL em campos obrigatórios
- ✅ Todos os cod_idml estão normalizados

### PASSO 4: Teste
1. Vá ao Admin → Draft Import
2. Envie uma proposta para um piloto
3. No Dashboard do piloto, veja se a proposta aparece
4. Aceite a proposta (deve criar contrato)
5. Volte ao Admin → Veja se o piloto aparece com contrato fechado
6. Na Visão Geral, veja se o nome do piloto aparece

## 🔧 ESTRUTURA CORRETA ESPERADA

### Tabela `interests`:
```sql
- id (UUID, PK)
- pilot_cod_idml (VARCHAR(50), NOT NULL) ✅
- team_id (UUID/VARCHAR)
- grid (VARCHAR(20))
- season (INTEGER, DEFAULT 20)
- status (VARCHAR, DEFAULT 'OFFER_SENT')
- created_at, updated_at
```

### Tabela `contracts`:
```sql
- id (UUID, PK)
- pilot_cod_idml (VARCHAR(50), NOT NULL) ✅
- team_id (UUID/VARCHAR)
- grid (VARCHAR(20))
- season (INTEGER, DEFAULT 20)
- signed_at, created_at, updated_at
```

## ⚠️ PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: Tabela não tem coluna `pilot_cod_idml`
**Solução:** Execute `migracao_completa_propostas.sql`

### Problema 2: Existem registros com `pilot_cod_idml` NULL
**Solução:** Execute o diagnóstico para identificar, depois:
```sql
-- Remover propostas sem cod_idml (ou preenchê-las manualmente)
DELETE FROM interests WHERE pilot_cod_idml IS NULL;
DELETE FROM contracts WHERE pilot_cod_idml IS NULL;
```

### Problema 3: `cod_idml` não está normalizado (tem espaços/case diferente)
**Solução:** O script de migração já normaliza automaticamente

### Problema 4: Piloto com contrato ainda aparece com propostas OFFER_SENT
**Solução:** O trigger automático resolve isso, mas você pode corrigir manualmente:
```sql
-- Marcar todas as propostas OFFER_SENT como REJECTED para pilotos com contrato
UPDATE interests i
SET status = 'REJECTED', updated_at = NOW()
WHERE i.status = 'OFFER_SENT'
AND EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.pilot_cod_idml = i.pilot_cod_idml
    AND c.grid = i.grid
    AND c.season = i.season
);
```

## 📊 FLUXO CORRETO ESPERADO

1. **Admin cria proposta:**
   - INSERT em `interests` com `pilot_cod_idml`, `team_id`, `grid`, `season=20`, `status='OFFER_SENT'`

2. **Piloto vê proposta no Dashboard:**
   - SELECT em `interests` WHERE `pilot_cod_idml` = X AND `status='OFFER_SENT'`

3. **Piloto aceita proposta:**
   - INSERT em `contracts` com `pilot_cod_idml`, `team_id`, `grid`, `season=20`
   - UPDATE em `interests` SET `status='ACCEPTED'` (proposta aceita)
   - UPDATE em `interests` SET `status='REJECTED'` (outras propostas)
   - **Trigger automático** também marca propostas como REJECTED

4. **Admin vê contrato no Painel:**
   - SELECT em `contracts` WHERE `grid` = X AND `season=20`
   - Match com pilotos usando `pilot_cod_idml` normalizado

## 💡 DICAS IMPORTANTES

- ✅ **Sempre normalize** `cod_idml`: `TRIM(UPPER(cod_idml))`
- ✅ **Use sempre** `pilot_cod_idml` (não `pilot_id`)
- ✅ **Inclua sempre** `grid` e `season` nas queries
- ✅ **Execute o diagnóstico** antes de fazer alterações
- ✅ **Execute a migração** apenas uma vez (é idempotente, mas evita reprocessar)

## 🆘 SE AINDA NÃO FUNCIONAR

1. Execute o diagnóstico e me envie os resultados
2. Verifique os logs do console do navegador (F12)
3. Verifique se há erros no Supabase (Dashboard → Logs)
4. Verifique se as políticas RLS estão permitindo leitura/escrita






