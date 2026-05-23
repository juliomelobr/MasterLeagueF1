# 🚀 Deploy da Edge Function sync-google-sheets (Corrigida)

## ✅ Correção Aplicada
A função foi corrigida para resolver o erro:
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

A correção substitui o `upsert` com `onConflict` por uma lógica que verifica se o registro existe antes de inserir ou atualizar.

---

## 📋 Método 1: Via Dashboard (Mais Simples) ⭐ RECOMENDADO

### Passo 1: Acessar Edge Functions
1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Você verá a lista de Edge Functions existentes

### Passo 2: Atualizar a Função sync-google-sheets
**Se a função JÁ EXISTE (atualizar):**
1. Clique na função `sync-google-sheets` na lista de funções
2. Vá direto para o **Passo 3** (copiar código)

**Se a função NÃO EXISTE (criar nova):**
1. Clique no botão **"Create a new function"** ou **"New Function"**
2. Nome da função: `sync-google-sheets` (exatamente assim, sem espaços, com hífens)
3. Clique em **"Create function"** ou **"Deploy"**

### Passo 3: Copiar o Código Atualizado
1. Abra o arquivo: `supabase/functions/sync-google-sheets/index.ts`
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)

### Passo 4: Colar e Deploy
1. No editor da função no Dashboard do Supabase, **delete todo o conteúdo** existente
2. **Cole** o código que você copiou (Ctrl+V)
3. Clique no botão **"Deploy"** ou **"Save"**
4. Aguarde alguns segundos até aparecer a mensagem de sucesso

### Passo 5: Verificar Deploy
1. A função deve aparecer na lista com status "Active"
2. Você pode verificar os logs clicando na função e depois em "Logs"

---

## 🔧 Método 2: Via CLI (Mais Rápido)

Se você já tem o Supabase CLI configurado:

### Passo 1: Navegar até a pasta do projeto
```powershell
cd "C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1"
```

### Passo 2: Login no Supabase (se necessário)
```powershell
npx supabase login
```

### Passo 3: Linkar ao projeto (se necessário)
```powershell
npx supabase link --project-ref ueqfmjwdijaeawvxhdtp
```

### Passo 4: Deploy da função
```powershell
npx supabase functions deploy sync-google-sheets
```

### Passo 5: Verificar Deploy
Você deve ver uma mensagem de sucesso como:
```
Deploying function sync-google-sheets...
Function sync-google-sheets deployed successfully
```

---

## ✅ Verificar se Deploy Funcionou

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Você deve ver `sync-google-sheets` na lista de funções
3. Clique nela para ver os detalhes e confirmar que está ativa
4. Verifique a data/hora do último deploy (deve ser recente)

---

## 🧪 Testar a Correção

Após o deploy, teste a sincronização:

1. Acesse a página de Admin Sync no site
2. Tente sincronizar os grids CARREIRA e LIGHT
3. O erro "there is no unique or exclusion constraint matching the ON CONFLICT specification" não deve mais aparecer

---

## 🐛 Se ainda der erro

1. **Verifique os logs da função:**
   - Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/sync-google-sheets/logs
   - Procure por erros recentes

2. **Execute o script SQL de correção (se necessário):**
   - Abra o arquivo `fix-classificacao-cache-constraint.sql`
   - Execute no SQL Editor do Supabase

3. **Verifique se a tabela classificacao_cache existe:**
   - Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/editor
   - Procure pela tabela `classificacao_cache`
   - Verifique se tem a constraint única em `(grid, season)`

---

## 📝 Notas Importantes

- ⚠️ **A função antiga ainda estará ativa até você fazer o deploy!**
- ✅ O código local já está corrigido
- 🔄 O deploy é necessário para atualizar a função no servidor do Supabase
- 📊 Após o deploy, todas as sincronizações usarão a nova lógica corrigida







