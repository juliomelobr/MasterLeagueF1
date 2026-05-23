# 📱 Guia Completo: Setup Z-API para WhatsApp

## 🎯 Objetivo

Configurar Z-API para enviar códigos de verificação WhatsApp na autenticação 2FA da Master League F1.

---

## 📋 Passo 1: Criar Conta no Z-API

### 1.1 Acessar Site

1. Acesse: https://www.z-api.io/
2. Clique em **"Criar Conta"** ou **"Cadastrar"**
3. Ou acesse diretamente: https://app.z-api.io/

### 1.2 Preencher Formulário

- **Email**: Seu email
- **Senha**: Criar senha forte
- **Nome**: Seu nome completo
- **Telefone**: Seu número (para verificação)

### 1.3 Verificar Email/Telefone

- Z-API enviará código de verificação
- Digite o código recebido

✅ **Conta criada!**

---

## 📋 Passo 2: Obter Credenciais (Instance, Token, Phone ID)

### 2.1 Acessar Dashboard

1. Após login, você verá o **Dashboard** do Z-API
2. Procure por **"Instâncias"** ou **"Instances"** no menu

### 2.2 Criar Instância

1. Clique em **"Criar Instância"** ou **"Nova Instância"**
2. Escolha o tipo: **"WhatsApp Business"** ou **"WhatsApp Pessoal"**
3. Dê um nome: "Master League F1" (ou qualquer nome)
4. Clique em **"Criar"**

### 2.3 Conectar WhatsApp

1. Após criar a instância, você verá um **QR Code**
2. Abra o WhatsApp no celular
3. Vá em **Configurações** → **Aparelhos conectados** → **Conectar um aparelho**
4. Escaneie o QR Code que aparece na tela do Z-API
5. Aguarde a conexão (pode levar alguns segundos)

✅ **WhatsApp conectado!**

### 2.4 Obter Credenciais

Após conectar o WhatsApp, você verá as credenciais:

#### **ZAPI_INSTANCE** (Instance ID)
- Procure por **"Instance ID"** ou **"ID da Instância"**
- Exemplo: `3C1234567890ABCDEF1234567890ABCDEF`
- **Copie esse valor**

#### **ZAPI_TOKEN** (Token)
- Procure por **"Token"** ou **"API Token"**
- Exemplo: `ABC123DEF456GHI789JKL012MNO345PQR678`
- **Copie esse valor**

#### **ZAPI_PHONE_ID** (Phone ID)
- Procure por **"Phone ID"** ou **"ID do Telefone"**
- Ou pode ser o número do WhatsApp conectado
- Exemplo: `5511999999999` ou um ID específico
- **Copie esse valor**

---

## 📋 Passo 3: Onde Encontrar no Dashboard

### Opção 1: Página da Instância

1. No Dashboard, clique na sua instância
2. Você verá uma página com:
   - **Instance ID** (ZAPI_INSTANCE)
   - **Token** (ZAPI_TOKEN)
   - **Phone ID** ou **Número** (ZAPI_PHONE_ID)

### Opção 2: Configurações da Instância

1. Clique na instância
2. Vá em **"Configurações"** ou **"Settings"**
3. Procure por **"API"** ou **"Credenciais"**
4. Lá estarão todas as credenciais

### Opção 3: Documentação da API

1. No Dashboard, procure por **"Documentação"** ou **"API Docs"**
2. Geralmente mostra exemplos com as credenciais

---

## 📋 Passo 4: Configurar no Supabase

### 4.1 Acessar Secrets

1. Acesse: https://app.supabase.com/project/ueqfmjwdijaeawvxhdtp/settings/functions
2. Role até **"Secrets"**
3. Clique em **"Add new secret"**

### 4.2 Adicionar Secret 1: ZAPI_INSTANCE

1. **Name**: `ZAPI_INSTANCE`
2. **Value**: Cole o Instance ID que você copiou
3. Clique em **"Add"**

### 4.3 Adicionar Secret 2: ZAPI_TOKEN

1. **Name**: `ZAPI_TOKEN`
2. **Value**: Cole o Token que você copiou
3. Clique em **"Add"**

### 4.4 Adicionar Secret 3: ZAPI_PHONE_ID

1. **Name**: `ZAPI_PHONE_ID`
2. **Value**: Cole o Phone ID que você copiou (ou o número do WhatsApp)
3. Clique em **"Add"**

---

## 📋 Passo 5: Testar

Após configurar os secrets, teste a função:

```cmd
teste-whatsapp-curl.bat
```

---

## 🔗 Links Úteis

- **Z-API Dashboard**: https://app.z-api.io/
- **Z-API Documentação**: https://developer.z-api.io/
- **Z-API Preços**: https://www.z-api.io/pricing

---

## ⚠️ Observações Importantes

1. **O WhatsApp precisa estar conectado** para a instância funcionar
2. **O número conectado** será usado para enviar as mensagens
3. **Teste primeiro** antes de usar em produção
4. **Mantenha as credenciais seguras** - não compartilhe publicamente

---

## 🐛 Problemas Comuns

### "Instance não encontrada"
- Verifique se o ZAPI_INSTANCE está correto
- Certifique-se de que a instância existe no dashboard

### "Token inválido"
- Verifique se o ZAPI_TOKEN está correto
- Pode ser necessário gerar um novo token

### "Phone ID não encontrado"
- Verifique se o ZAPI_PHONE_ID está correto
- Pode ser o número do WhatsApp (formato: 5511999999999)

---

**Pronto! Agora você tem as credenciais do Z-API configuradas! 🎉**








































