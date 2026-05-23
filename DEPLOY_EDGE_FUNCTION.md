# 🚀 Deploy da Edge Function send-whatsapp-code

## ❌ Problema Atual
Erro HTTP 404 ao tentar enviar código via WhatsApp. Isso significa que:
- A Edge Function não está deployada no Supabase, OU
- A Edge Function precisa ser **redeployada** com as atualizações recentes (suporte a `skipPilotoCheck` para ex-pilotos)

## ✅ Solução: Deploy via Dashboard (Método Mais Simples)

### Passo 1: Acessar Edge Functions
1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Você verá a lista de Edge Functions existentes

### Passo 2: Criar ou Atualizar Função
**Se a função JÁ EXISTE (para atualizar):**
1. Clique na função `send-whatsapp-code` na lista de funções
2. Vá direto para o **Passo 3** (copiar código)

**Se a função NÃO EXISTE (criar nova):**
1. Clique no botão **"Create a new function"** ou **"New Function"**
2. Nome da função: `send-whatsapp-code` (exatamente assim, sem espaços, com hífen)
3. Clique em **"Create function"** ou **"Deploy"**

### Passo 3: Copiar o Código
1. Abra o arquivo: `supabase/functions/send-whatsapp-code/index.ts`
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)

### Passo 4: Colar e Deploy
1. No editor da função no Dashboard do Supabase, **delete todo o conteúdo** existente
2. **Cole** o código que você copiou (Ctrl+V)
3. Clique no botão **"Deploy"** ou **"Save"**

### Passo 5: Verificar Secrets (IMPORTANTE)
A função precisa dos seguintes secrets configurados:

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
2. Role até a seção **"Secrets"**
3. Verifique se existem os seguintes secrets:

**Para Twilio:**
- `WHATSAPP_API_TYPE` = `twilio`
- `TWILIO_ACCOUNT_SID` = (seu Account SID)
- `TWILIO_AUTH_TOKEN` = (seu Auth Token)
- `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+14155238886` (sandbox) ou seu número Twilio

**Para Z-API (alternativa):**
- `ZAPI_INSTANCE` = (sua instância Z-API)
- `ZAPI_TOKEN` = (seu token Z-API)
- `ZAPI_CLIENT_TOKEN` = (opcional)

4. Se algum secret estiver faltando, clique em **"Add new secret"** e adicione

### Passo 6: Testar
Após o deploy, teste novamente o login. O erro 404 não deve mais aparecer.

---

## 🔧 Método Alternativo: Via CLI (Avançado)

Se preferir usar o terminal:

```bash
# 1. Login no Supabase
npx supabase login

# 2. Linkar ao projeto
npx supabase link --project-ref ueqfmjwdijaeawvxhdtp

# 3. Deploy da função
npx supabase functions deploy send-whatsapp-code
```

---

## ✅ Verificar se Deploy Funcionou

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions
2. Você deve ver `send-whatsapp-code` na lista de funções
3. Clique nela para ver os logs e confirmar que está ativa

---

## 🐛 Se ainda der erro

1. Verifique os logs da função: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-whatsapp-code/logs
2. Confirme que os secrets estão configurados corretamente
3. Teste manualmente usando o arquivo `teste-whatsapp-curl.bat`

