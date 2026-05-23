# 📱 Setup Twilio - Passo a Passo DETALHADO

## 🎯 Objetivo
Configurar Twilio para enviar códigos de verificação WhatsApp na autenticação 2FA.

---

# 📋 PASSO 1: CRIAR CONTA TWILIO

## 1.1 Acessar o Site

1. **Abra seu navegador** (Chrome, Firefox, Edge, etc.)
2. **Digite na barra de endereço:**
   ```
   https://www.twilio.com/try-twilio
   ```
3. **Pressione Enter**

## 1.2 Página Inicial

Você verá uma página com:
- Título: "Build with Twilio"
- Botão grande: **"Sign up"** ou **"Get Started"** ou **"Sign up for free"**
- Canto superior direito: botão **"Sign In"** (ignore por enquanto)

## 1.3 Clicar em Sign Up

1. **Clique no botão** **"Sign up"** (ou "Get Started" ou "Sign up for free")
2. Você será redirecionado para a página de registro

## 1.4 Preencher Formulário de Registro

Você verá um formulário com os seguintes campos:

### Campo 1: Email
- **O que digitar:** Seu email (ex: seuemail@gmail.com)
- **Importante:** Use um email que você tem acesso (vai receber código de verificação)

### Campo 2: Password (Senha)
- **O que digitar:** Uma senha forte
- **Requisitos:**
  - Mínimo 8 caracteres
  - Recomendado: letras maiúsculas, minúsculas, números e símbolos
  - Exemplo: `SuaSenha123!@#`

### Campo 3: Full Name (Nome Completo)
- **O que digitar:** Seu nome completo
- Exemplo: `João Silva`

### Campo 4: Phone Number (Número de Telefone)
- **Formato:** Precisa incluir código do país
- **Brasil:** Digite assim: `+55 11 99999-9999`
- Ou selecione país "Brazil (+55)" e digite o número sem o código
- **Importante:** Você vai receber um código SMS neste número

### Campo 5: Country (País)
- **Selecione:** `Brazil` ou `Brasil`
- Geralmente aparece em um dropdown

### Botão: "Start your free trial" ou "Sign up"
- **Clique neste botão** para continuar

## 1.5 Verificar Email

1. **Após clicar em "Sign up"**, você verá uma mensagem:
   - "Check your email"
   - "We sent you a verification code"

2. **Abra seu email** (mesmo que você usou no cadastro)

3. **Procure por email da Twilio:**
   - Remetente: `Twilio` ou `noreply@twilio.com`
   - Assunto: "Verify your email" ou "Confirm your email"

4. **Abra o email** e procure por um código (geralmente 6 dígitos)
   - Exemplo: `123456`

5. **Volte para a página do Twilio**
   - Você verá um campo pedindo o código
   - **Digite o código** que você recebeu por email
   - Clique em **"Verify"** ou **"Confirm"**

## 1.6 Verificar Telefone (SMS)

1. **Após verificar email**, você verá uma nova tela pedindo verificação de telefone

2. **Você receberá um SMS** no número que cadastrou
   - Mensagem: "Your Twilio verification code is: 123456"

3. **Digite o código** na tela do Twilio
   - Clique em **"Verify"** ou **"Continue"**

✅ **Parabéns! Conta criada com sucesso!**

Você verá uma mensagem tipo: "Welcome to Twilio!" ou "Get started"

---

# 📋 PASSO 2: ACESSAR O DASHBOARD

## 2.1 Redirecionamento Automático

Após criar a conta, você será redirecionado automaticamente para o **Dashboard**.

Se não for redirecionado:
1. Acesse: https://console.twilio.com
2. Faça login (se necessário)

## 2.2 O que você verá no Dashboard

No topo da página, você verá:

### Informações da Conta:
```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: [Show] ou [View]
```

### Onde encontrar (se não aparecer):

**Opção 1: Dashboard Principal**
1. No canto superior direito, clique em seu nome/avatar
2. No menu dropdown, procure por "Account" ou "Settings"

**Opção 2: Menu Lateral**
1. No menu lateral esquerdo, procure por **"Account"**
2. Clique em **"Account"**
3. Depois clique em **"General Settings"** ou **"Settings"**

**Opção 3: Direto pela URL**
1. Acesse: https://console.twilio.com/us1/account/settings/general

## 2.3 Anotar Account SID

1. **Procure por:** `Account SID`
2. **Você verá algo como:** `AC_SEU_ACCOUNT_SID_AQUI`
3. **Copie esse valor** e guarde em um local seguro
   - Exemplo: Bloco de notas, arquivo de texto, etc.

⚠️ **IMPORTANTE:** Você vai precisar disso depois!

## 2.4 Anotar Auth Token

1. **Procure por:** `Auth Token`
2. **Você verá:** `[Show]` ou `[View]` ou `[Reveal]`
3. **Clique nesse botão** para revelar o token
4. **Você verá algo como:** `abc123def456ghi789jkl012mno345pqr678`
5. **Copie esse valor** e guarde em um local seguro

⚠️ **IMPORTANTE:** 
- Este token é secreto!
- Não compartilhe publicamente
- Você vai precisar disso depois

---

# 📋 PASSO 3: CONFIGURAR WHATSAPP SANDBOX (PARA TESTES)

## 3.1 Acessar WhatsApp Sandbox

### Opção 1: Pelo Menu
1. No menu lateral esquerdo, procure por **"Messaging"**
2. Clique em **"Messaging"**
3. Depois clique em **"Try it out"** ou **"Learn"**
4. Procure por **"Send a WhatsApp message"** ou **"WhatsApp"**
5. Clique nessa opção

### Opção 2: Pela URL Direta
1. Acesse: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Ou: https://console.twilio.com/us1/develop/sms/sandbox

## 3.2 Entender o Sandbox

Você verá uma página explicando:
- **O que é Sandbox:** Ambiente de testes
- **Limitação:** Só funciona com números cadastrados
- **Como usar:** Enviar código "join [código]" via WhatsApp

## 3.3 Cadastrar seu Número no Sandbox

**Você verá algo como:**

```
To send a WhatsApp message, send this message:
"join [código-aleatório]"
to: +1 415 523 8886
```

**Passos:**

1. **Abra o WhatsApp** no seu celular
2. **Envie uma mensagem** para: `+1 415 523 8886`
3. **A mensagem deve ser:** `join [o-código-que-apareceu-na-tela]`
   - Exemplo: Se aparecer `join abc-def-123`, você envia: `join abc-def-123`
4. **Envie a mensagem**

### Após enviar:

1. **Volte para a página do Twilio**
2. **Aguarde alguns segundos** (pode demorar até 1 minuto)
3. **Você verá uma confirmação:**
   - "Phone number registered!" ou
   - "Successfully joined sandbox" ou
   - Uma mensagem verde de sucesso

✅ **Seu número está cadastrado no Sandbox!**

## 3.4 Testar Envio (Sandbox)

Agora você pode testar enviar mensagens:

### No console do Twilio:

1. **Procure por um formulário** na página do Sandbox
2. **Campo "To" (Para):**
   - Digite: `whatsapp:+5511999999999` (seu número, substitua pelos seus dígitos)
   - **Formato importante:** `whatsapp:+55` + código área + número
   - Exemplo: `whatsapp:+5511999887766`
3. **Campo "Message" (Mensagem):**
   - Digite: `Teste de código: 123456`
4. **Clique em "Send"** ou "Send Message"

### Verificar no WhatsApp:

1. **Abra o WhatsApp** no seu celular
2. **Procure por uma conversa** do número: `+1 415 523 8886`
3. **Você deve receber a mensagem** que você enviou!

✅ **Se recebeu, o Sandbox está funcionando!**

---

# 📋 PASSO 4: APLICAR PARA WHATSAPP BUSINESS API (PRODUÇÃO)

⚠️ **IMPORTANTE:** 
- Sandbox é só para testes (números limitados)
- Para produção (enviar para qualquer número), você precisa da aprovação

## 4.1 Acessar Aplicação

### Opção 1: Pelo Dashboard
1. No menu, vá em: **Messaging** → **Settings** → **WhatsApp Senders**
2. Ou: **Messaging** → **Try it out** → **Get started with WhatsApp Business API**

### Opção 2: Pela URL
1. Acesse: https://www.twilio.com/docs/whatsapp
2. Procure por "Get Started" ou "Apply"

## 4.2 Preencher Formulário de Aplicação

Você verá um formulário com várias seções:

### Seção 1: Business Information

**Campo: Business Name (Nome da Empresa)**
- Digite: `Master League F1` (ou qualquer nome que represente seu projeto)

**Campo: Business Type (Tipo de Negócio)**
- Selecione: `Sports` ou `Gaming` ou `Entertainment`
- Se não encontrar, selecione: `Other` e explique

**Campo: Website (Site)**
- Se tiver site: Digite a URL (ex: `https://masterleaguef1.com`)
- Se não tiver: Deixe em branco ou digite um placeholder

**Campo: Business Description (Descrição do Negócio)**
- Digite algo como:
  ```
  Master League F1 is a virtual Formula 1 racing league. 
  We need WhatsApp API to send authentication codes to our drivers 
  for secure two-factor authentication when they access their dashboard.
  ```
- Ou em português (se aceitar):
  ```
  Master League F1 é uma liga virtual de Fórmula 1. 
  Precisamos da API WhatsApp para enviar códigos de autenticação 
  aos nossos pilotos para autenticação de dois fatores quando 
  acessarem o painel.
  ```

### Seção 2: Use Case (Caso de Uso)

**Campo: Primary Use Case**
- Selecione: `Authentication` ou `Two-Factor Authentication` ou `Security`
- Se não encontrar, selecione: `Notifications`

**Campo: Message Type**
- Selecione: `Transactional` (mensagens transacionais)
- Isso é para códigos de verificação

**Campo: Expected Volume (Volume Esperado)**
- Selecione uma faixa:
  - `0-1000 messages/month` ou `Less than 1000` (para começar)

**Campo: Message Content Example (Exemplo de Conteúdo)**
- Digite um exemplo:
  ```
  🔐 CÓDIGO DE VERIFICAÇÃO - MASTER LEAGUE F1

  Olá [Nome do Piloto]!

  Seu código de verificação é: [123456]

  Este código expira em 10 minutos.
  ```

### Seção 3: Contact Information

**Campo: Your Name**
- Digite: Seu nome completo

**Campo: Your Email**
- Digite: Seu email (já deve estar preenchido)

**Campo: Your Phone**
- Digite: Seu número de telefone (já deve estar preenchido)

### Seção 4: Terms and Conditions

**Checkbox: "I agree to the terms..."**
- ✅ **Marque essa checkbox** (concordo com os termos)

**Botão: "Submit"** ou "Send Application" ou "Apply"
- Clique neste botão

## 4.3 Aguardar Aprovação

Após enviar:

1. **Você verá uma mensagem de confirmação:**
   - "Application submitted successfully"
   - "We'll review your application"

2. **Você receberá um email** confirmando o envio

3. **Tempo de espera:**
   - **Normalmente:** 1-3 dias úteis
   - **Pode demorar até:** 5-7 dias úteis

4. **Você receberá um email** quando for aprovado:
   - Assunto: "Your WhatsApp Business API application has been approved"
   - Ou algo similar

⚠️ **Enquanto aguarda a aprovação, você pode usar o Sandbox para testes!**

---

# 📋 PASSO 5: OBTER NÚMERO WHATSAPP (APÓS APROVAÇÃO)

## 5.1 Verificar Aprovação

1. **Verifique seu email** - você deve ter recebido confirmação
2. **Ou acesse o Dashboard** - pode aparecer uma notificação

## 5.2 Obter Número

Após aprovação, o Twilio geralmente fornece um número automaticamente.

### Verificar se já tem número:

1. No menu, vá em: **Phone Numbers** → **Manage** → **Active numbers**
2. Ou acesse: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

3. **Você verá uma lista** de números (pode estar vazia se ainda não tiver)

### Se não tiver número:

1. **Clique em:** "Buy a number" ou "Get a number"
2. **Selecione país:** United States (geralmente tem mais opções)
3. **Tipo:** WhatsApp-capable number
4. **Clique em:** "Search" ou "Buy"

⚠️ **Nota:** Para WhatsApp Business API, o número geralmente já vem configurado.

## 5.3 Anotar Número WhatsApp

**O número virá no formato:**
- `whatsapp:+14155238886` (exemplo)
- Ou: `+1 415 523 8886`

**Importante:** Use sempre o formato completo: `whatsapp:+14155238886`

**Anote esse número!** Você vai precisar dele.

---

# 📋 PASSO 6: CONFIGURAR SECRETS NO SUPABASE

## 6.1 Acessar Supabase

1. **Abra novo navegador** (ou nova aba)
2. **Acesse:** https://supabase.com/dashboard
3. **Faça login** (se necessário)
4. **Selecione seu projeto** (Master League F1 ou o nome do seu projeto)

## 6.2 Navegar até Edge Functions

1. **No menu lateral esquerdo**, procure por **"Edge Functions"**
2. **Clique em "Edge Functions"**
3. Você verá uma lista de funções (pode estar vazia)

## 6.3 Acessar Secrets

**Opção 1:**
1. No menu de Edge Functions, procure por **"Secrets"** ou **"Environment Variables"**
2. Clique nessa opção

**Opção 2:**
1. Clique em **"Settings"** (Configurações) no menu lateral
2. Depois clique em **"Edge Functions"**
3. Procure por **"Secrets"** ou **"Environment Variables"**

**Opção 3: URL Direta:**
1. Acesse: `https://supabase.com/dashboard/project/[seu-project-id]/settings/functions`
2. Substitua `[seu-project-id]` pelo ID do seu projeto

## 6.4 Adicionar Secrets

Você verá uma interface com:
- Lista de secrets existentes (pode estar vazia)
- Botão: **"Add new secret"** ou **"New secret"** ou **"+ Add"**

### Adicionar Secret 1: WHATSAPP_API_TYPE

1. **Clique em:** "Add new secret" ou "+ Add"
2. **Campo "Name" (Nome):**
   - Digite: `WHATSAPP_API_TYPE`
   - ⚠️ **EXATO assim, em maiúsculas!**
3. **Campo "Value" (Valor):**
   - Digite: `twilio`
   - ⚠️ **EXATO assim, minúsculas!**
4. **Clique em:** "Add" ou "Save" ou "Create"

✅ **Primeiro secret adicionado!**

### Adicionar Secret 2: TWILIO_ACCOUNT_SID

1. **Clique em:** "Add new secret" novamente
2. **Campo "Name":**
   - Digite: `TWILIO_ACCOUNT_SID`
3. **Campo "Value":**
   - Digite: O Account SID que você anotou no Passo 2.3
   - Exemplo: `AC_SEU_ACCOUNT_SID_AQUI`
   - ⚠️ **Copie exatamente como está, sem espaços!**
4. **Clique em:** "Add"

✅ **Segundo secret adicionado!**

### Adicionar Secret 3: TWILIO_AUTH_TOKEN

1. **Clique em:** "Add new secret" novamente
2. **Campo "Name":**
   - Digite: `TWILIO_AUTH_TOKEN`
3. **Campo "Value":**
   - Digite: O Auth Token que você anotou no Passo 2.4
   - Exemplo: `abc123def456ghi789jkl012mno345pqr678`
   - ⚠️ **Copie exatamente como está, sem espaços!**
   - ⚠️ **Este é secreto - não compartilhe!**
4. **Clique em:** "Add"

✅ **Terceiro secret adicionado!**

### Adicionar Secret 4: TWILIO_WHATSAPP_NUMBER

1. **Clique em:** "Add new secret" novamente
2. **Campo "Name":**
   - Digite: `TWILIO_WHATSAPP_NUMBER`
3. **Campo "Value":**
   - Digite: O número WhatsApp que você obteve no Passo 5.3
   - Formato: `whatsapp:+14155238886`
   - ⚠️ **Use o formato completo com "whatsapp:" no início!**
   - ⚠️ **No Sandbox, geralmente é:** `whatsapp:+14155238886`
4. **Clique em:** "Add"

✅ **Quarto secret adicionado!**

## 6.5 Verificar Secrets Adicionados

Você deve ver uma lista com 4 secrets:

```
✅ WHATSAPP_API_TYPE = twilio
✅ TWILIO_ACCOUNT_SID = AC...
✅ TWILIO_AUTH_TOKEN = [oculto]
✅ TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
```

✅ **Todos os secrets estão configurados!**

---

# 📋 PASSO 7: TESTAR CONFIGURAÇÃO

## 7.1 Verificar Edge Function

Vamos verificar se a Edge Function está criada:

1. **No Supabase**, vá em: **Edge Functions**
2. **Procure por:** `send-whatsapp-code`
3. **Se existir:** ✅ Ótimo!
4. **Se NÃO existir:** Precisamos criar (vou te ajudar depois)

## 7.2 Testar via Console Twilio (Mais Fácil)

**Enquanto aguarda aprovação da WhatsApp Business API, teste pelo Sandbox:**

1. **Acesse:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. **Use o formulário** para enviar mensagem de teste
3. **Verifique** se recebe no WhatsApp

✅ **Se funcionou, a configuração básica está OK!**

---

# ✅ CHECKLIST FINAL

Marque cada item conforme completa:

- [ ] ✅ Conta Twilio criada
- [ ] ✅ Account SID anotado e guardado
- [ ] ✅ Auth Token anotado e guardado (secreto!)
- [ ] ✅ WhatsApp Sandbox configurado
- [ ] ✅ Teste no Sandbox funcionando
- [ ] ✅ Aplicação WhatsApp Business enviada
- [ ] ⏳ Aguardando aprovação (1-3 dias)
- [ ] ✅ Número WhatsApp obtido (após aprovação)
- [ ] ✅ WHATSAPP_API_TYPE configurado no Supabase
- [ ] ✅ TWILIO_ACCOUNT_SID configurado no Supabase
- [ ] ✅ TWILIO_AUTH_TOKEN configurado no Supabase
- [ ] ✅ TWILIO_WHATSAPP_NUMBER configurado no Supabase

---

# 🎉 PRÓXIMOS PASSOS

Depois de completar tudo:

1. ✅ **Aguardar aprovação** da WhatsApp Business API (1-3 dias)
2. ✅ **Me avisar** quando aprovar
3. ✅ **Vou atualizar o código** para usar Twilio
4. ✅ **Testar** envio de códigos de verificação

---

# 🐛 PROBLEMAS COMUNS

## Problema: Não consigo criar conta

**Solução:**
- Verifique se o email já não está cadastrado
- Tente usar outro email
- Limpe cache do navegador

## Problema: Não recebo código de verificação

**Solução:**
- Verifique pasta de spam
- Aguarde alguns minutos (pode demorar)
- Tente clicar em "Resend code"

## Problema: Account SID não aparece

**Solução:**
- Acesse diretamente: https://console.twilio.com/us1/account/settings/general
- Ou procure no menu: Account → Settings → General

## Problema: Sandbox não funciona

**Solução:**
- Verifique se enviou exatamente: `join [código]`
- Verifique o número: deve ser `+1 415 523 8886`
- Aguarde até 2 minutos após enviar
- Tente enviar novamente

## Problema: Secrets não salvam no Supabase

**Solução:**
- Verifique se está logado
- Verifique se tem permissões de admin no projeto
- Tente recarregar a página
- Tente em outro navegador

---

# 📞 PRECISA DE AJUDA?

**Em qual passo você está?** Me diga e eu te ajudo especificamente nesse passo!

**Algum erro apareceu?** Me envie a mensagem de erro e eu te ajudo a resolver!

---

**Boa sorte! Você está no caminho certo! 🚀**








































