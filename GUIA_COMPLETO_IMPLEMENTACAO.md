# 📘 Guia Completo de Implementação - Arquitetura Híbrida

Este guia vai te orientar passo a passo para implementar a arquitetura híbrida Google Sheets + Supabase.

---

## 📋 ÍNDICE

1. [Pré-requisitos](#pré-requisitos)
2. [Passo 1: Criar Tabelas no Supabase](#passo-1-criar-tabelas-no-supabase)
3. [Passo 2: Configurar Edge Functions](#passo-2-configurar-edge-functions)
4. [Passo 3: Testar Sincronização Manual](#passo-3-testar-sincronização-manual)
5. [Passo 4: Configurar Sincronização Automática](#passo-4-configurar-sincronização-automática)
6. [Passo 5: Verificar Funcionamento](#passo-5-verificar-funcionamento)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 PRÉ-REQUISITOS

Antes de começar, você precisa ter:

- ✅ Conta no Supabase (https://supabase.com)
- ✅ Projeto Supabase criado
- ✅ Acesso ao dashboard do Supabase
- ✅ Service Role Key do Supabase (vamos buscar isso juntos)

---

## 📍 PASSO 1: Criar Tabelas no Supabase

### 1.1. Acessar o SQL Editor

1. Abra seu navegador e acesse: **https://supabase.com**
2. Faça login na sua conta
3. Clique no seu projeto (Master League F1 ou nome similar)
4. No menu lateral esquerdo, procure por **"SQL Editor"** (ícone de código `</>`)
5. Clique em **"SQL Editor"**

### 1.2. Criar Nova Query

1. No SQL Editor, clique no botão **"+ New query"** (canto superior direito)
2. Uma nova aba será aberta

### 1.3. Copiar e Colar o Schema

1. Abra o arquivo `supabase-schema-cache.sql` no seu computador
   - **Caminho:** `C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\supabase-schema-cache.sql`
   - Você pode abrir com Bloco de Notas ou qualquer editor de texto
2. **Selecione TODO o conteúdo** do arquivo (Ctrl+A)
3. **Copie** (Ctrl+C)
4. **Cole** no SQL Editor do Supabase (Ctrl+V)

### 1.4. Executar o Script

1. No SQL Editor, verifique se o texto foi colado corretamente
2. Clique no botão **"Run"** (ou pressione Ctrl+Enter)
3. Aguarde alguns segundos
4. Você deve ver uma mensagem de sucesso: **"Success. No rows returned"**

✅ **Se aparecer erro:** Veja a seção [Troubleshooting](#troubleshooting) no final deste guia.

---

## 📍 PASSO 2: Configurar Edge Functions

### 2.1. Encontrar a Service Role Key

1. No Supabase, no menu lateral esquerdo, clique em **"Settings"** (ícone de engrenagem ⚙️)
2. Clique em **"API"**
3. Procure por **"service_role"** (role anon está logo acima)
4. Ao lado de **"service_role"**, você verá uma chave longa começando com `eyJ...`
5. **Copie essa chave** (clique no ícone de copiar ao lado)
6. **IMPORTANTE:** Guarde essa chave em local seguro (ela dá acesso total ao banco)

### 2.2. Instalar Supabase CLI (Opcional - Alternativa Manual)

**OPÇÃO A: Usar Supabase CLI (Recomendado)**

1. Baixe o Supabase CLI: https://github.com/supabase/cli/releases
2. Instale seguindo as instruções do site
3. No terminal, navegue até a pasta do projeto:
   ```bash
   cd "C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1"
   ```
4. Faça login:
   ```bash
   npx supabase login
   ```
5. Link o projeto:
   ```bash
   npx supabase link --project-ref seu-project-ref
   ```
   (O project-ref está na URL do Supabase: `https://supabase.com/dashboard/project/SEU-PROJECT-REF`)

**OPÇÃO B: Deploy Manual via Dashboard (Mais Simples)**

Vamos fazer pelo dashboard do Supabase:

1. No menu lateral, clique em **"Edge Functions"**
2. Se não aparecer, pode estar em **"Functions"** ou você precisa habilitar

### 2.3. Criar Edge Function: sync-google-sheets

**Método Manual (via Dashboard):**

1. No Supabase Dashboard, vá em **"Edge Functions"**
2. Clique em **"Create a new function"**
3. Nome da função: `sync-google-sheets`
4. Clique em **"Create function"**
5. Uma tela de código será aberta
6. Abra o arquivo: `supabase/functions/sync-google-sheets/index.ts`
   - **Caminho completo:** `C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1\supabase\functions\sync-google-sheets\index.ts`
7. Copie TODO o conteúdo do arquivo
8. Cole no editor do Supabase
9. Clique em **"Deploy"** ou **"Save"**

**Método CLI (se instalou):**

```bash
npx supabase functions deploy sync-google-sheets
```

### 2.4. Criar Edge Function: sync-scheduler

Repita o processo acima para criar a função `sync-scheduler`:

1. Crie nova função: `sync-scheduler`
2. Copie o conteúdo de: `supabase/functions/sync-scheduler/index.ts`
3. Cole e faça deploy

### 2.5. Configurar Variáveis de Ambiente

1. No Supabase Dashboard, vá em **"Settings"** → **"Edge Functions"**
2. Procure por **"Environment Variables"** ou **"Secrets"**
3. Adicione as seguintes variáveis:

   - **Nome:** `SUPABASE_URL`
   - **Valor:** `https://ueqfmjwdijaeawvxhdtp.supabase.co`
   
   - **Nome:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Valor:** (cole a Service Role Key que você copiou no Passo 2.1)

4. Salve as variáveis

---

## 📍 PASSO 3: Testar Sincronização Manual

### 3.1. Testar via Dashboard Admin

1. Inicie seu projeto React:
   ```bash
   npm run dev
   ```
2. Acesse: **http://localhost:5173/admin/sync**
3. Faça login como steward/admin
4. Na página de sincronização, você verá:
   - Status de cada cache
   - Botões para sincronizar manualmente
5. Clique em **"Sincronizar classificacao"**
6. Aguarde alguns segundos
7. Verifique se apareceu uma mensagem de sucesso

### 3.2. Verificar no Banco de Dados

1. No Supabase Dashboard, vá em **"Table Editor"**
2. Procure pela tabela **"classificacao_cache"**
3. Clique nela
4. Você deve ver dados se a sincronização funcionou
5. Verifique também a tabela **"sync_log"** para ver o histórico

---

## 📍 PASSO 4: Configurar Sincronização Automática

### 4.1. Opção Simples: Usar Serviço Externo (Recomendado para Iniciantes)

Vamos usar um serviço gratuito chamado **cron-job.org**:

1. Acesse: **https://cron-job.org**
2. Crie uma conta gratuita
3. Clique em **"Create cronjob"**
4. Configure:

   - **Title:** Sync Classificacao
   - **Address (URL):** 
     ```
     https://ueqfmjwdijaeawvxhdtp.supabase.co/functions/v1/sync-scheduler
     ```
   - **Request method:** POST
   - **Request body (JSON):**
     ```json
     {"sheetType": "classificacao"}
     ```
   - **Schedule:** A cada 5 minutos: `*/5 * * * *`
   - **Request headers:**
     - **Name:** `Authorization`
     - **Value:** `Bearer SUA_SERVICE_ROLE_KEY_AQUI`
     - **Name:** `Content-Type`
     - **Value:** `application/json`

5. Salve o cronjob
6. Repita para outros tipos (power_ranking, minicup, etc.)

### 4.2. Opção Avançada: Usar pg_cron no Supabase

Se você se sentir confortável, pode usar o método descrito em `SUPABASE_CRON_SETUP.md`

---

## 📍 PASSO 5: Verificar Funcionamento

### 5.1. Verificar Cache no Frontend

1. Acesse qualquer página que use dados (ex: `/standings`)
2. Abra o Console do Navegador (F12)
3. Procure por mensagens como:
   - `📊 Dados de classificação carregados do Supabase`
   - Ou `📊 Usando fallback para Google Sheets`

### 5.2. Monitorar Sincronizações

1. Acesse `/admin/sync`
2. Verifique o status de cada cache
3. Veja os logs de sincronização na parte inferior

---

## 🔧 TROUBLESHOOTING

### Erro: "relation does not exist"

**Causa:** Tabelas não foram criadas corretamente.

**Solução:**
1. Volte ao Passo 1
2. Execute o script SQL novamente
3. Verifique se não há erros no console

### Erro: "permission denied"

**Causa:** Service Role Key não configurada ou incorreta.

**Solução:**
1. Verifique se copiou a Service Role Key correta
2. Confirme que configurou nas variáveis de ambiente
3. Teste novamente

### Edge Function não aparece

**Causa:** Edge Functions podem não estar habilitadas no seu plano.

**Solução:**
1. Verifique seu plano do Supabase
2. Edge Functions estão disponíveis no plano Free, mas podem ter limites
3. Se necessário, faça upgrade do plano

### Sincronização não funciona

**Causa:** Pode ser problema de CORS ou URL incorreta.

**Solução:**
1. Verifique os logs em `sync_log` no Supabase
2. Veja a mensagem de erro específica
3. Confirme que as URLs das planilhas estão corretas no código

### Não consigo acessar /admin/sync

**Causa:** Rota não foi adicionada ou você não é steward.

**Solução:**
1. Verifique se o arquivo `src/App.jsx` tem a rota `/admin/sync`
2. Confirme que seu usuário tem `is_steward = true` na tabela `pilotos`

---

## 📞 PRÓXIMOS PASSOS

Após completar todos os passos:

1. ✅ As tabelas de cache devem estar criadas
2. ✅ As Edge Functions devem estar deployadas
3. ✅ A sincronização manual deve funcionar
4. ✅ A sincronização automática deve estar configurada
5. ✅ O frontend deve usar o cache do Supabase

---

## 💡 DICAS IMPORTANTES

- **Sempre teste manualmente primeiro** antes de configurar automático
- **Guarde a Service Role Key em local seguro** - ela dá acesso total
- **Monitore os logs** regularmente para detectar problemas
- **Faça backup** antes de grandes mudanças

---

## 🆘 PRECISA DE AJUDA?

Se encontrar algum problema:

1. Verifique os logs no Supabase (tabela `sync_log`)
2. Verifique o console do navegador (F12)
3. Verifique os logs das Edge Functions no Supabase Dashboard

---

**Boa sorte! 🚀**










































