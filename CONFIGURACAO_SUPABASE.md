# 🚀 Guia Completo de Configuração do Supabase

Este guia vai te ajudar a configurar todo o backend do Supabase para o sistema de Análises funcionar completamente.

---

## 📋 Índice

1. [Criar Tabelas no Banco de Dados](#1-criar-tabelas-no-banco-de-dados)
2. [Configurar Edge Function para Emails](#2-configurar-edge-function-para-emails)
3. [Configurar Secrets (Credenciais SMTP)](#3-configurar-secrets-credenciais-smtp)
4. [Popular Tabela de Pilotos](#4-popular-tabela-de-pilotos)
5. [Testar Configuração](#5-testar-configuração)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Criar Tabelas no Banco de Dados

### Passo 1.1: Acessar SQL Editor

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"New Query"**

### Passo 1.2: Executar Schema SQL

1. Abra o arquivo `supabase-schema.sql` do projeto
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

### Passo 1.3: Verificar Tabelas Criadas

1. No menu lateral, clique em **"Table Editor"**
2. Você deve ver as seguintes tabelas:
   - ✅ `pilotos`
   - ✅ `lances`
   - ✅ `acusacoes`
   - ✅ `defesas`
   - ✅ `verdicts`
   - ✅ `email_log`
   - ✅ `notificacoes_admin`

**Se todas aparecerem, o Passo 1 está completo! ✅**

---

## 2. Configurar Edge Function para Emails

### Passo 2.1: Instalar Supabase CLI (se ainda não tiver)

**Windows (PowerShell):**
```powershell
# Opção 1: Via Scoop (recomendado)
scoop install supabase

# Opção 2: Via npm
npm install -g supabase
```

**Mac/Linux:**
```bash
brew install supabase/tap/supabase
```

**Ou baixe direto:** https://github.com/supabase/cli/releases

### Passo 2.2: Fazer Login no Supabase CLI

```bash
supabase login
```

Isso vai abrir o navegador para você fazer login.

### Passo 2.3: Linkar Projeto Local ao Supabase

```bash
# No diretório do projeto
cd "C:\Users\Usuario\Documents\Master League F1\Projetos_React\master-league-f1"

# Linkar ao projeto (substitua PROJECT_REF pelo ID do seu projeto)
supabase link --project-ref ueqfmjwdijaeawvxhdtp
```

**Onde encontrar o PROJECT_REF:**
- Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/general
- O **Reference ID** é o `ueqfmjwdijaeawvxhdtp`

### Passo 2.4: Deploy da Edge Function

```bash
# Deploy da função send-email
supabase functions deploy send-email
```

**OU via Dashboard do Supabase:**

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Clique em **"Create a new function"**
3. Nome: `send-email`
4. Cole o conteúdo do arquivo `supabase/functions/send-email/index.ts`
5. Clique em **"Deploy"**

---

## 3. Configurar Secrets (Credenciais SMTP)

### Passo 3.1: Criar App Password no Gmail

1. Acesse: https://myaccount.google.com/apppasswords
2. Se não aparecer, ative a verificação em 2 etapas primeiro: https://myaccount.google.com/security
3. Selecione:
   - **App:** Mail
   - **Device:** Windows Computer (ou outro)
4. Clique em **"Generate"**
5. **Copie a senha gerada** (16 caracteres, sem espaços)

### Passo 3.2: Configurar Secrets no Supabase

**Via Dashboard:**

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
2. Role até **"Secrets"**
3. Clique em **"Add new secret"**
4. Adicione os seguintes secrets:

```
Nome: SMTP_HOST
Valor: smtp.gmail.com
```

```
Nome: SMTP_PORT
Valor: 587
```

```
Nome: SMTP_USER
Valor: juliomelobr@hotmail.com
```

```
Nome: SMTP_PASS
Valor: [cole a senha de 16 caracteres gerada no Passo 3.1]
```

**Via CLI:**

```bash
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=juliomelobr@hotmail.com
supabase secrets set SMTP_PASS=sua_senha_app_aqui
```

---

## 4. Popular Tabela de Pilotos

Você tem 3 opções:

### Opção A: Via SQL Manual

1. Acesse **SQL Editor** no Supabase
2. Execute:

```sql
INSERT INTO pilotos (nome, email, grid, equipe, whatsapp, is_steward) VALUES
('JULIO MELO', 'juliomelobr@hotmail.com', 'carreira', 'STEWARDS', '+55 51 98343-3940', true),
('PILOTO TESTE', 'piloto@teste.com', 'carreira', 'EQUIPE1', '+55 11 99999-9999', false);
```

### Opção B: Via Table Editor (UI)

1. Acesse **Table Editor** > `pilotos`
2. Clique em **"Insert"** > **"Insert row"**
3. Preencha os campos:
   - `nome`: Nome do piloto
   - `email`: Email (deve ser o mesmo usado no login)
   - `grid`: `carreira` ou `light`
   - `equipe`: Nome da equipe
   - `whatsapp`: Telefone (opcional)
   - `is_steward`: `true` se for steward, `false` se não
4. Clique em **"Save"**

### Opção C: Via Script Python

```bash
# Execute o script de importação
python scripts/import_pilotos.py
```

**Nota:** O script precisa estar configurado com as credenciais do Google Sheets.

---

## 5. Testar Configuração

### Teste 1: Verificar Tabelas

```sql
-- No SQL Editor, execute:
SELECT COUNT(*) FROM pilotos;
SELECT COUNT(*) FROM lances;
SELECT COUNT(*) FROM acusacoes;
```

### Teste 2: Testar Edge Function

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-email
2. Clique em **"Invoke function"**
3. Cole este JSON:

```json
{
  "to": "seu-email@teste.com",
  "subject": "Teste de Email",
  "html": "<h1>Teste</h1><p>Se você recebeu este email, a configuração está funcionando!</p>",
  "templateType": "teste"
}
```

4. Clique em **"Invoke"**
5. Verifique se recebeu o email

### Teste 3: Testar no Frontend

1. Inicie o projeto: `npm run dev`
2. Acesse: http://localhost:5173/analises
3. Faça login como piloto
4. Tente enviar uma acusação de teste
5. Verifique se o email foi enviado

---

## 6. Troubleshooting

### ❌ Erro: "SMTP credentials não configuradas"

**Solução:**
- Verifique se os secrets estão configurados (Passo 3.2)
- Certifique-se de que os nomes estão corretos: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### ❌ Erro: "Authentication failed"

**Solução:**
- Verifique se a senha do App Password está correta (sem espaços)
- Certifique-se de que a verificação em 2 etapas está ativada no Gmail
- Tente gerar um novo App Password

### ❌ Erro: "Edge Function not found"

**Solução:**
- Verifique se a função foi deployada (Passo 2.4)
- Certifique-se de que o nome da função é exatamente `send-email`
- Tente fazer deploy novamente

### ❌ Erro: "RLS policy violation"

**Solução:**
- Verifique se o usuário está logado no Supabase
- Certifique-se de que o email do usuário logado existe na tabela `pilotos`
- Verifique as policies RLS no arquivo `supabase-schema.sql`

### ❌ Emails não estão sendo enviados

**Solução:**
1. Verifique os logs da Edge Function:
   - Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-email/logs
2. Verifique a tabela `email_log`:
   ```sql
   SELECT * FROM email_log ORDER BY created_at DESC LIMIT 10;
   ```
3. Verifique se o SMTP está configurado corretamente

---

## ✅ Checklist Final

Antes de considerar a configuração completa, verifique:

- [ ] Todas as 7 tabelas foram criadas
- [ ] Edge Function `send-email` foi deployada
- [ ] 4 secrets SMTP foram configurados
- [ ] Pelo menos 1 piloto foi inserido na tabela `pilotos`
- [ ] Teste de email foi enviado com sucesso
- [ ] Frontend consegue enviar acusação
- [ ] Emails estão sendo recebidos

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/logs
2. Verifique a documentação: https://supabase.com/docs
3. Console do navegador (F12) para erros do frontend

---

**Pronto! Seu Supabase está configurado! 🎉**












































