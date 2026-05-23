# 📊 Como Ver Logs do Supabase para Diagnosticar Erro do Z-API

## 🔍 Passo a Passo

### 1. Acesse o Supabase Dashboard
**URL direta:**
https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-whatsapp-code/logs

### 2. Ou navegue manualmente:
1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp
2. No menu lateral, clique em **"Edge Functions"**
3. Clique em **"send-whatsapp-code"**
4. Clique na aba **"Logs"** (ou "Invocation Logs")

### 3. Execute o teste novamente
Com os logs abertos, execute o teste:
```powershell
.\teste-whatsapp-terminal.ps1
```

### 4. Procure por logs com `[Z-API]`

Você deve ver logs como:

```
🔍 [Z-API] Iniciando envio...
   ZAPI_INSTANCE: ✅ Configurado ou ❌ Não configurado
   ZAPI_TOKEN: ✅ Configurado ou ❌ Não configurado

📱 [Z-API] Enviando via Z-API:
   URL: https://api.z-api.io/instances/...
   Para: 551981850516

📤 [Z-API] Request body: {...}

📥 [Z-API] Response status: 200 ou 400 ou 401...
📥 [Z-API] Response body: {...}

❌ [Z-API] Erro ao enviar: [mensagem de erro específica]
```

## 📋 O que procurar:

### Se os secrets não estão configurados:
```
ZAPI_INSTANCE: ❌ Não configurado
ZAPI_TOKEN: ❌ Não configurado
```
**Solução:** Adicionar secrets no Supabase Dashboard

### Se houver erro do Z-API:
```
📥 [Z-API] Response status: 400 ou 401 ou 403
📥 [Z-API] Response body: {"error": "...", "message": "..."}
❌ [Z-API] Erro ao enviar: [mensagem específica]
```

**Possíveis erros:**
- `401 Unauthorized` → Token inválido
- `400 Bad Request` → Formato incorreto ou número inválido
- `403 Forbidden` → Número não autorizado
- `Instance not found` → Instance ID incorreto

## 📸 Copie e cole os logs aqui

Copie TODOS os logs que começam com `[Z-API]` e envie para mim analisar!

---

**Importante:** Se você não ver logs com `[Z-API]`, significa que a Edge Function não foi atualizada. Faça o deploy:

```bash
npx supabase functions deploy send-whatsapp-code
```





































