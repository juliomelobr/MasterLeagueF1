# 🔍 Análise Profunda: Fluxo de Propostas

## 🚨 PROBLEMA IDENTIFICADO

O sistema de propostas não está funcionando devido a **incompatibilidade de estrutura de dados** entre o schema original e o código atual.

## 📊 ESTRUTURAS ENCONTRADAS

### Schema Original (`supabase-schema-mercado-t20.sql`)
```sql
interests:
  - pilot_id (UUID) → REFERENCE pilotos(id)
  - team_id (VARCHAR)
  - status (VARCHAR)

contracts:
  - pilot_id (UUID) → REFERENCE pilotos(id)
  - team_id (VARCHAR)
  - season (INTEGER)
```

### Schema Atual (Código está usando)
```sql
interests:
  - pilot_cod_idml (VARCHAR) ✅
  - team_id (UUID/VARCHAR)
  - grid (VARCHAR)
  - season (INTEGER)
  - status (VARCHAR)

contracts:
  - pilot_cod_idml (VARCHAR) ✅
  - team_id (UUID/VARCHAR)
  - grid (VARCHAR)
  - season (INTEGER)
```

## 🔄 FLUXO ATUAL DO CÓDIGO

### 1. Criação de Propostas (AdminDraftImport)
- ✅ Usa `pilot_cod_idml` (VARCHAR)
- ✅ Inclui `grid` e `season`
- ❓ **PRECISA VERIFICAR**: Se a tabela `interests` tem essas colunas

### 2. Busca de Propostas (Dashboard)
- ✅ Busca por `pilot_cod_idml`
- ✅ Filtra por `status = 'OFFER_SENT'`
- ❓ **PROBLEMA POTENCIAL**: Se a tabela não tem `pilot_cod_idml`, a busca falha silenciosamente

### 3. Criação de Contrato (Dashboard)
- ✅ Usa `pilot_cod_idml`
- ✅ Inclui `grid` e `season`
- ✅ Atualiza propostas para REJECTED
- ❓ **PROBLEMA POTENCIAL**: Se `interests` não tem `pilot_cod_idml`, não consegue atualizar

### 4. Busca de Contratos (AdminDraftImport)
- ✅ Busca por `pilot_cod_idml`
- ✅ Filtra por `grid` e `season`
- ❓ **PROBLEMA POTENCIAL**: Se `contracts` não tem essas colunas, não encontra nada

## 📋 CHECKLIST DE DIAGNÓSTICO

Execute `scripts/diagnostico_propostas.sql` no Supabase SQL Editor para verificar:

1. ✅ Tabela `interests` tem coluna `pilot_cod_idml`?
2. ✅ Tabela `interests` tem colunas `grid` e `season`?
3. ✅ Tabela `contracts` tem coluna `pilot_cod_idml`?
4. ✅ Tabela `contracts` tem coluna `grid`?
5. ✅ Existem propostas `OFFER_SENT` no banco?
6. ✅ Existem contratos criados?
7. ✅ Propostas têm `pilot_cod_idml` preenchido (não NULL)?
8. ✅ Contratos têm `pilot_cod_idml` preenchido (não NULL)?
9. ✅ `cod_idml` está normalizado (trim + uppercase) consistentemente?
10. ✅ Pilotos com contrato ainda têm propostas `OFFER_SENT` (problema!)?

## 🔧 POSSÍVEIS SOLUÇÕES

### Solução 1: Migrar Tabela `interests` para usar `pilot_cod_idml`
Se a tabela ainda usa `pilot_id`:
```sql
-- Ver script: scripts/fix_interests_pilot_id.sql
-- Precisa adicionar colunas: pilot_cod_idml, grid, season
-- Migrar dados de pilot_id para pilot_cod_idml
-- Tornar pilot_cod_idml NOT NULL
```

### Solução 2: Garantir Estrutura Correta
Se as colunas existem mas estão vazias:
```sql
-- Preencher pilot_cod_idml nas propostas existentes
-- Normalizar todos os cod_idml (trim + uppercase)
-- Adicionar constraints se necessário
```

### Solução 3: Corrigir Normalização
Se há inconsistências de normalização:
```sql
-- Normalizar todos os pilot_cod_idml existentes
UPDATE interests SET pilot_cod_idml = TRIM(UPPER(pilot_cod_idml)) WHERE pilot_cod_idml IS NOT NULL;
UPDATE contracts SET pilot_cod_idml = TRIM(UPPER(pilot_cod_idml)) WHERE pilot_cod_idml IS NOT NULL;
```

## 🎯 PRÓXIMOS PASSOS

1. **Executar diagnóstico SQL** para identificar exatamente qual é o problema
2. **Verificar estrutura real** das tabelas no banco
3. **Aplicar correções** baseadas no diagnóstico
4. **Testar fluxo completo** após correções

## 📝 NOTAS IMPORTANTES

- O código está **consistentemente** usando `pilot_cod_idml` em todas as partes
- O problema é que a **estrutura do banco** pode não estar sincronizada
- Existem scripts de migração em `scripts/` que podem não ter sido executados
- Precisa garantir que **ambas as tabelas** (`interests` e `contracts`) tenham a mesma estrutura






