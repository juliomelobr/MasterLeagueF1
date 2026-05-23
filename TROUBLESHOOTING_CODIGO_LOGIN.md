# 🐛 Código de Login Não Chega no Celular dos Pilotos

## Causas Comuns e Verificação

### 1. ⚠️ **Twilio WhatsApp Sandbox** (mais provável)

Se estiver usando o **Sandbox** da Twilio, **cada piloto precisa fazer opt-in primeiro**:

1. O piloto deve adicionar o número da Twilio aos contatos (geralmente `+1 415 523 8886`)
2. Enviar a mensagem: **`join [código]`** (o código aparece no painel Sandbox da Twilio)
3. Aguardar 1–2 minutos
4. Só depois disso o piloto consegue receber mensagens

**Onde verificar:**  
[Twilio Console → Messaging → Try it out → Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)

---

### 2. **Z-API (chip/operadora) ou Twilio**

A Edge Function suporta **Z-API** (para chip da operadora) ou **Twilio** (para números Twilio).

#### Opção A: Z-API (chip TIM, Vivo, Claro etc.)

**Dashboard → Project Settings → Edge Functions → Secrets**

| Secret | Obrigatório | Exemplo |
|--------|-------------|---------|
| `WHATSAPP_API_TYPE` | Sim | `zapi` ou `z-api` |
| `ZAPI_INSTANCE` | Sim | ID da sua instância no Z-API |
| `ZAPI_TOKEN` | Sim | Token da instância |
| `ZAPI_CLIENT_TOKEN` | Não | Token de segurança (opcional) |

Conecte seu WhatsApp no painel do Z-API (z-api.io) antes de usar.

#### Opção B: Twilio

| Secret | Obrigatório | Exemplo |
|--------|-------------|---------|
| `WHATSAPP_API_TYPE` | Opcional | `twilio` |
| `TWILIO_ACCOUNT_SID` | Sim | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Sim | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_WHATSAPP_NUMBER` | Sim | `whatsapp:+14155238886` (Sandbox) ou `whatsapp:+5511999999999` (prod) |

⚠️ `TWILIO_WHATSAPP_NUMBER` deve ter o prefixo `whatsapp:` (ex: `whatsapp:+5511999999999`).

---

### 3. **Edge Function não deployada**

Se aparecer erro **404** ou “Serviço de envio de código não configurado”:

```bash
npx supabase functions deploy send-whatsapp-code
```

---

### 4. **Piloto não encontrado**

Para login normal (não ex-piloto), o e-mail precisa existir na tabela `pilotos`:

- Conferir se o e-mail está em lowercase no Supabase
- Executar sincronização da planilha se precisar

---

### 5. **Número de WhatsApp inválido**

O número deve ser válido e incluir DDD:

- Exemplo correto: `(11) 99999-9999` ou `11999999999`
- O sistema adiciona `55` automaticamente

---

## Como ver os logs da Edge Function

1. Acesse: [Supabase Dashboard → Edge Functions → send-whatsapp-code → Logs](https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/functions/send-whatsapp-code/logs)
2. Faça uma tentativa de login
3. Veja o que aparece nos logs:
   - `Twilio não configurado` → revisar secrets
   - `Piloto não encontrado` → conferir tabela `pilotos`
   - Erro da Twilio → checar conta, número e Sandbox

---

## Checklist rápido

- [ ] Twilio está configurado (3 secrets no Supabase)
- [ ] Se Sandbox: pilotos enviaram `join [código]` para o número da Twilio
- [ ] Edge Function `send-whatsapp-code` está deployada
- [ ] E-mail do piloto existe na tabela `pilotos`
- [ ] Número de WhatsApp válido (com DDD)
- [ ] Logs da Edge Function conferidos
